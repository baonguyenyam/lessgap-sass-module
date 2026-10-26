import { betterAuth } from "better-auth"
import { kyselyAdapter } from "@better-auth/kysely-adapter"
import { createAuthEndpoint, APIError, getSessionFromCtx, sessionMiddleware } from "better-auth/api"
import { deleteSessionCookie, expireCookie, setSessionCookie } from "better-auth/cookies"
import { magicLink, twoFactor } from "better-auth/plugins"
import { z } from "zod"
import { nextCookies } from "better-auth/next-js"
import type { BetterAuthPlugin } from "better-auth"
import { db8, uniqueIndexKey } from "@/lib/db8"
import { authDb } from "@/lib/kysely"
import { hashPassword, verifyPassword } from "@/lib/password"
import { generateBackupCodes } from "@/lib/backup-codes"
import { refusesAutomaticLink } from "@/lib/account-linking"
import { siteConfig } from "@/config/site"
import { emailEnabled } from "@/lib/email-transport"
import { enabledOAuthProviders, oauthCredentials } from "@/lib/oauth-providers"
import { canSwitchAs, isRole } from "@/lib/roles"

// ─────────────────────────────────────────────────────────────────────────────
// Fixture sign-ins: dev and demo.
//
// Both open a session WITHOUT verifying any credential. Auth.js allowed that
// from a Credentials provider's `authorize`; Better Auth has no provider that
// bends the same way, so each becomes a small plugin with an endpoint of its
// own. The endpoint does what `authorize` used to do, then creates the session
// itself instead of returning a user and letting the library do it.
//
// They are separate rather than sharing a factory on purpose: deleting one is
// deleting one block.
//
// NEITHER ASKS FOR A SECOND FACTOR, and that is a decision rather than an
// oversight. Both open a session without verifying anything, so a 2FA check
// bolted on here would be guarding a door that has no lock: whoever can reach
// the endpoint has already passed. What keeps them safe is what always kept
// them safe — dev is refused outside development, demo only exists when
// DEMO_MODE is on — and on top of that the demo account is not allowed to turn
// 2FA on at all (src/app/actions/two-factor.ts), because the nightly reset
// would strand the next visitor with a factor nobody holds.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dev-only one-click sign-in. Never active in production: the check is on the
 * environment, not on the plugin being registered, so an accidental import
 * cannot enable it.
 */
const devLogin = () =>
  ({
    id: "dev-login",
    endpoints: {
      devSignIn: createAuthEndpoint(
        "/dev-login/sign-in",
        { method: "POST", body: z.object({ password: z.string() }) },
        async (ctx) => {
          if (process.env.NODE_ENV !== "development") {
            throw new APIError("NOT_FOUND")
          }
          if (ctx.body.password !== "dev") throw new APIError("UNAUTHORIZED")

          const row = await db8.orm.public.User.upsert({
            conflictOn: uniqueIndexKey({ email: "admin@dev.local" }),
            update: {},
            create: {
              email: "admin@dev.local",
              name: "Dev Admin",
              emailVerified: true,
              role: "ADMIN",
            },
          })

          // Read back through the library, which returns the user in the shape
          // its session cookie takes (dates as Date, not the column's text).
          const user = await ctx.context.internalAdapter.findUserById(row.id)
          if (!user) throw new APIError("INTERNAL_SERVER_ERROR")
          const session = await ctx.context.internalAdapter.createSession(user.id)
          await setSessionCookie(ctx, { session, user })
          return ctx.json({ ok: true })
        }
      ),
    },
  }) satisfies BetterAuthPlugin

/**
 * Demo sign-in: one click into a shared fixture account, for a public demo
 * deployment (isolated database, fake seeded data). Only active when
 * DEMO_MODE="true"; never enable it on a deployment with real users.
 *
 * Note for the 2.0: sessions now live in the database, so every demo visitor
 * leaves a row in Session. The nightly reset must clear those too.
 */
const demoLogin = () =>
  ({
    id: "demo-login",
    endpoints: {
      demoSignIn: createAuthEndpoint(
        "/demo-login/sign-in",
        { method: "POST", body: z.object({ role: z.string().optional() }) },
        async (ctx) => {
          if (process.env.DEMO_MODE !== "true") {
            throw new APIError("NOT_FOUND")
          }
          const asAdmin = ctx.body.role === "admin"
          const email = asAdmin ? "demo-admin@example.com" : "demo-user@example.com"

          const row = await db8.orm.public.User.upsert({
            conflictOn: uniqueIndexKey({ email }),
            // Re-assert the role on every sign-in: a previous visitor may have
            // promoted the shared user account from the admin panel. Reset the
            // checklist dismissal too, so every demo visitor sees "Get started".
            update: { role: asAdmin ? "ADMIN" : "USER", onboardingDismissedAt: null },
            create: {
              email,
              name: asAdmin ? "Demo Admin" : "Demo User",
              emailVerified: true,
              role: asAdmin ? "ADMIN" : "USER",
            },
          })

          // Read back through the library, which returns the user in the shape
          // its session cookie takes (dates as Date, not the column's text).
          const user = await ctx.context.internalAdapter.findUserById(row.id)
          if (!user) throw new APIError("INTERNAL_SERVER_ERROR")
          const session = await ctx.context.internalAdapter.createSession(user.id)
          await setSessionCookie(ctx, { session, user })
          return ctx.json({ ok: true })
        }
      ),
    },
  }) satisfies BetterAuthPlugin

// ─────────────────────────────────────────────────────────────────────────────
// Switch As (spec/adr/0015-switch-as.md).
//
// ROOT opens a session as another account to see the app as that role sees
// it, then switches back. The mechanism is Better Auth's own admin-plugin
// impersonation, written out here because that plugin also brings ban fields
// and a set-role endpoint that would let a role be granted from the API,
// which ADR 0014 rules out.
//
//   start: a new session for the target, `switchedBy` = the ROOT user id,
//          one hour long; the ROOT session token is kept in a signed cookie.
//   stop:  the switched session is deleted and the ROOT session restored.
//
// Available in every environment, to ROOT only: the rule is `canSwitchAs` in
// src/lib/roles.ts, and the server actions in src/app/actions/switch-as.ts
// check it again before calling these endpoints.
// ─────────────────────────────────────────────────────────────────────────────

const SWITCH_AS_SECONDS = 60 * 60
const SWITCH_AS_COOKIE = "switch_as_session"

const switchAs = () =>
  ({
    id: "switch-as",
    endpoints: {
      switchAsStart: createAuthEndpoint(
        "/switch-as/start",
        { method: "POST", body: z.object({ userId: z.string().min(1) }), use: [sessionMiddleware] },
        async (ctx) => {
          const actor = ctx.context.session
          const target = await ctx.context.internalAdapter.findUserById(ctx.body.userId)
          if (!target) throw new APIError("NOT_FOUND")

          const actorRole = (actor.user as { role?: unknown }).role
          const targetRole = (target as { role?: unknown }).role
          const allowed =
            isRole(actorRole) &&
            isRole(targetRole) &&
            canSwitchAs(
              {
                id: actor.user.id,
                role: actorRole,
                switched: Boolean((actor.session as { switchedBy?: string | null }).switchedBy),
              },
              { id: target.id, role: targetRole }
            )
          if (!allowed) throw new APIError("FORBIDDEN")

          const session = await ctx.context.internalAdapter.createSession(
            target.id,
            true,
            { switchedBy: actor.user.id, expiresAt: new Date(Date.now() + SWITCH_AS_SECONDS * 1000) },
            true
          )
          if (!session) throw new APIError("INTERNAL_SERVER_ERROR")

          const keep = ctx.context.createAuthCookie(SWITCH_AS_COOKIE)
          await ctx.setSignedCookie(keep.name, actor.session.token, ctx.context.secret, {
            ...ctx.context.authCookies.sessionToken.attributes,
            maxAge: SWITCH_AS_SECONDS,
          })
          deleteSessionCookie(ctx, true)
          await setSessionCookie(ctx, { session, user: target }, true)
          return ctx.json({ ok: true })
        }
      ),
      switchAsStop: createAuthEndpoint("/switch-as/stop", { method: "POST", requireHeaders: true }, async (ctx) => {
        const current = await getSessionFromCtx(ctx)
        const switchedBy = (current?.session as { switchedBy?: string | null } | undefined)?.switchedBy
        if (!current || !switchedBy) throw new APIError("BAD_REQUEST")

        const keep = ctx.context.createAuthCookie(SWITCH_AS_COOKIE)
        const rootToken = await ctx.getSignedCookie(keep.name, ctx.context.secret)
        const root = rootToken ? await ctx.context.internalAdapter.findSession(rootToken) : null

        await ctx.context.internalAdapter.deleteSession(current.session.token)
        expireCookie(ctx, keep)
        // The ROOT session expired or was revoked meanwhile: end the switched
        // session anyway and leave the browser signed out, never stuck as the
        // other account.
        if (!root || root.session.userId !== switchedBy) {
          deleteSessionCookie(ctx)
          return ctx.json({ restored: false })
        }
        await setSessionCookie(ctx, root)
        return ctx.json({ restored: true })
      }),
    },
  }) satisfies BetterAuthPlugin

export const auth = betterAuth({
  // The Prisma adapter stops at Prisma ORM 7. Auth talks SQL directly
  // through Kysely instead — the same database, no Prisma in the middle —
  // which is also what keeps auth working on Prisma ORM 8.
  database: kyselyAdapter(authDb, { type: "postgres" }),

  // Keeping the Auth.js variable name is deliberate: the upgrade to 2.0 already
  // drops every active session, and asking everyone to rename an environment
  // variable on top of that buys nothing.
  secret: process.env.AUTH_SECRET,

  // Without this the origin is taken from the incoming request, which makes
  // OAuth callbacks and redirects depend on whatever host answered. The kit
  // already ships this variable, so no new one appears in .env.example.
  baseURL: process.env.NEXT_PUBLIC_APP_URL,


  // Better Auth's models are named in camelCase; the tables the Prisma
  // migrations created are PascalCase. `modelName` maps each, the column
  // names already match one-to-one.
  user: {
    modelName: "User",
    /**
     * Changing the address the account is identified by.
     *
     * Better Auth walks this in two hops, and both are worth knowing because
     * together they cover the two ways it goes wrong:
     *
     *   1. a confirmation to the address the account has NOW. Somebody who
     *      stole a session cannot move the account without also reading the old
     *      mailbox, and the rightful owner is warned where the thief cannot
     *      intercept it;
     *   2. only after that, a verification to the NEW address. A typo cannot
     *      strand the account somewhere nobody reads, because the move lands
     *      only when that second one is clicked.
     *
     * The email changes at the end of the chain, never before. Both hops need
     * `emailVerification.sendVerificationEmail`, configured further down.
     *
     * One behaviour worth knowing next to the UI: when the new address already
     * belongs to another account, the library answers exactly as it does on
     * success and sends nothing. That is deliberate — otherwise the form
     * becomes a way to ask which addresses are registered — and it is why the
     * page promises no email, only that we have taken the request.
     */
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const { sendChangeEmailConfirmation } = await import("@/lib/email")
        await sendChangeEmailConfirmation(user.email, newEmail, url)
      },
    },

    /**
     * The door that automatic account linking would otherwise leave open.
     *
     * Better Auth asks for the second factor on `/sign-in/email` and nowhere
     * else. Linking is automatic for a provider that verified the address. Put
     * together, somebody who controls a Google account with your address can
     * press "Continue with Google", be attached to your existing account, and be
     * signed in WITHOUT the authenticator — even if you never connected Google
     * and sign in only with a password.
     *
     * The comparison that shows it is a hole rather than a trade-off: an attacker
     * holding your mailbox who tries a password reset is still stopped, because
     * signing in afterwards goes through `/sign-in/email` and asks for the code.
     * The social door does not ask.
     *
     * So the automatic half is refused for accounts that turned 2FA on, and only
     * the automatic half:
     *
     *   - connecting Google yourself from Settings still works. That request
     *     carries your session, which is what the cookie check below looks for,
     *     and you are already past the second factor when you make it;
     *   - signing in with a provider you connected on purpose still works,
     *     because the account is linked already and this never runs (T1: we do
     *     not ask for a TOTP on top of Google, which does that better);
     *   - a brand new account created through Google is untouched: it has no
     *     second factor to go around.
     */
    validateUserInfo: async ({ user, source }, ctx) => {
      // The rule itself is in src/lib/account-linking.ts; this gathers the two
      // facts it needs and does as it is told.
      if (source.method !== "oauth" || source.action !== "link-account") return
      if (!user.email) return

      const existing = await db8.orm.public.User.select("id", "twoFactorEnabled").where({ email: user.email }).first()
      if (!existing) return

      // A session belonging to this same user means the request came from
      // inside the app — the "Connect" button in Settings — rather than from
      // the sign-in page. Whoever presses "Continue with Google" on the way in
      // has no such cookie, and that is the whole distinction.
      let hasOwnSession = false
      const token = await ctx.getSignedCookie(
        ctx.context.authCookies.sessionToken.name,
        ctx.context.secret
      )
      if (token) {
        const active = await ctx.context.internalAdapter.findSession(token)
        hasOwnSession = active?.session?.userId === existing.id
      }

      const refuse = refusesAutomaticLink({
        method: source.method,
        action: source.action,
        twoFactorEnabled: existing.twoFactorEnabled,
        hasOwnSession,
      })
      if (!refuse) return

      return {
        error: "two_factor_linking",
        errorDescription:
          "This account uses two-factor authentication. Sign in with your password and a code, then connect this provider from Settings.",
      }
    },

    additionalFields: {
      // Server-owned: `input: false` means neither the API nor an OAuth profile
      // can set it, so no one signs up as an admin. The values stay uppercase to
      // match the Prisma enum, which is what the admin panel and its tests read.
      role: {
        type: ["USER", "ADMIN", "ROOT"],
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },

  session: {
    modelName: "Session",
    // Sessions live in the database now, so `auth.api.getSession` would hit it
    // on nearly every request. This cache is the same trade the 1.6.4 fix made
    // by hand with a 60 second throttle: a session revoked elsewhere can stay
    // alive on another device until the cookie expires. Same window, same
    // reasoning, one config line instead of three files.
    cookieCache: { enabled: true, maxAge: 60 },
    additionalFields: {
      // Who opened this session with Switch As. Server-owned, like `role`.
      switchedBy: { type: "string", required: false, input: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // bcrypt only considers the first 72 bytes; reject longer input instead of
    // silently truncating it.
    maxPasswordLength: 72,
    // Replaces the sessionVersion column: resetting a password ends every other
    // session, which is what that column existed to fake.
    revokeSessionsOnPasswordReset: true,
    // Better Auth hashes with scrypt by default. We keep bcrypt so the hashes
    // already in the database still verify: without this, upgrading would lock
    // out every existing password user, and no data migration could fix it.
    password: {
      hash: hashPassword,
      verify: ({ password, hash }) => verifyPassword(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      const { sendPasswordResetEmail } = await import("@/lib/email")
      await sendPasswordResetEmail(user.email, url)
    },
  },

  // Only the providers with both keys set (src/lib/oauth-providers.ts): one
  // registered without them fails on the first click, not at startup.
  socialProviders: Object.fromEntries(
    enabledOAuthProviders().map((provider) => [provider, oauthCredentials(provider)!])
  ),

  account: {
    modelName: "Account",
    // What Auth.js needed `allowDangerousEmailAccountLinking` for. Here it is
    // the default: a provider that verified the email links to the account that
    // already has it. Written out because it is a security-relevant behaviour,
    // and a reader should not have to know a default to know what happens.
    //
    // With two-factor authentication on the account, that convenience becomes a
    // way around it. See `validateUserInfo` below.
    accountLinking: { enabled: true },
  },


  emailVerification: {
    // The 1.x sign-up flow sent a magic link and let the click double as
    // verification. Here the library sends its own verification email, which
    // is the same idea without the trick. Only when email is configured: with
    // no key there is nothing to send and sign-up still completes.
    sendOnSignUp: emailEnabled(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendMagicLinkEmail } = await import("@/lib/email")
      await sendMagicLinkEmail(user.email, url)
    },
  },

  verification: { modelName: "Verification" },

  // Where a failed OAuth round trip lands. The default is Better Auth's own
  // error page at /api/auth/error, which is outside the kit's design and says
  // nothing a visitor can act on. Sending it to the sign-in page means the
  // error code arrives as ?error=..., which that page already knows how to
  // render — including the refusal above, and every other OAuth failure that
  // until now ended on a stranger's page.
  onAPIError: { errorURL: "/login" },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.email && emailEnabled()) {
            const { sendWelcomeEmail } = await import("@/lib/email")
            // Awaited for the same reason as the webhook emails: nothing
            // guarantees a promise left running after the response finishes.
            await sendWelcomeEmail(user.email, user.name ?? "").catch(console.error)
          }
        },
      },
    },
  },

  plugins: [
    // Magic link needs email configured (emailEnabled()); without it the form is hidden in
    // the UI and the plugin is not registered. The client plugin is registered
    // unconditionally: it only adds methods, and its types come from the type
    // of the plugin rather than from this array.
    ...(emailEnabled()
      ? [
          magicLink({
            expiresIn: 15 * 60, // link valid for 15 minutes
            // Stored as a hash, not as the token itself. Whoever reads the
            // database, from a leaked backup to a bug elsewhere, finds nothing
            // that opens an account. It is also one of the mitigations named by
            // GHSA-965c-763c-88jm, fixed in Better Auth 1.7.7, where an OAuth
            // state value was accepted as a magic link token: with tokens
            // hashed, the two can no longer meet in storage. Keep the global
            // `verification.storeIdentifier` unset (or "plain") for that to hold.
            storeToken: "hashed",
            sendMagicLink: async ({ email, url }) => {
              const { sendMagicLinkEmail } = await import("@/lib/email")
              await sendMagicLinkEmail(email, url)
            },
          }),
        ]
      : []),
    // Two-factor authentication (2.2). Registered unconditionally: nobody is
    // asked for a second factor until they turn one on themselves, and the
    // table is empty until then.
    twoFactor({
      twoFactorTable: "TwoFactor",
      // The name the user will read INSIDE their authenticator app, forever.
      // It has to come from config: a clone that renames itself would otherwise
      // ship its users a code labelled with somebody else's product.
      issuer: siteConfig.name,
      totpOptions: { digits: 6 },
      // Default, written out because it is the line that prevents lock-outs:
      // enabling stores an unverified secret, and only a correct code flips it
      // on. Set it to true and an interrupted setup leaves the account asking
      // for codes from an authenticator that was never actually paired.
      skipVerificationOnEnable: false,
      backupCodeOptions: {
        // Default is "plain". These codes each open the account on their own,
        // so they are stored encrypted with AUTH_SECRET instead.
        storeBackupCodes: "encrypted",
        // The library's own generator mixes upper case, lower case and digits,
        // which is unreadable on the piece of paper we ask people to keep. See
        // src/lib/backup-codes.ts.
        customBackupCodesGenerate: generateBackupCodes,
      },
    }),
    switchAs(),
    ...(process.env.NODE_ENV === "development" ? [devLogin()] : []),
    ...(process.env.DEMO_MODE === "true" ? [demoLogin()] : []),
    // MUST stay last. Server actions cannot set cookies the way a route
    // handler does, so without this a sign-in from an action succeeds, returns
    // a session, and sets nothing: the user lands on the dashboard signed out.
    // It is the quietest failure in this whole migration.
    nextCookies(),
  ],
})
