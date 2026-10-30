# Data model

**Status:** `draft`

The platform core, as it will be added to `prisma/contract.prisma` in phases 1–3.
The sketches below use Prisma 7 syntax for readability; write them in the
contract's Prisma 8 syntax (see the `prisma-8` skill, `contract.md`).
Module models are listed in [modules.md](./07-modules.md) and get their full
definition in the phase that builds them. Conventions first, because they
apply to every model anyone adds.

## Conventions

- Ids ([ADR 0013](./adr/0013-identifier-strategy.md)): CUID2 (`@onCreate(cuid(2))`) for
  business records, UUID v7 (`@onCreate(uuid(7))`, native `uuid`) for append-only
  high-volume tables, NanoID codes from `@/lib/ids` for what people read or type.
- Every tenant-owned model: `tenantId String`, relation to `Tenant` with
  `onDelete: Cascade`, and `@@index([tenantId, <most common filter>])`.
  Unique constraints that are unique per tenant include `tenantId`
  (`@@unique([tenantId, slug])`), never a global unique.
- Money: `Int` in the smallest unit plus the tenant's `currency`. Never `Float`.
- Time: `DateTime` in UTC. A tenant has `timeZone` (IANA). Wall-clock
  concepts (opening hours) are stored as `"HH:mm"` strings with a weekday.
- Soft delete only where history matters (`Service`, `Product`: `archivedAt`);
  everything else is deleted for real.
- Status fields are Prisma enums. History of a status lives in an `*Event` table.
- JSON columns only for data a theme or form definition owns
  (`Site.tokens`, `Site.sections`, `QuoteForm.fields`), always parsed with a
  Zod schema on read and write.
- Every table gets `createdAt` and `updatedAt`.

## Core models (sketch)

```prisma
// Better Auth organization, extended. Mapped with modelName: "tenant".
model Tenant {
  id               String        @id @default(cuid())
  name             String
  slug             String        @unique
  status           TenantStatus  @default(PROVISIONING)
  verticalKey      String
  timeZone         String        @default("America/Chicago")
  currency         String        @default("usd")
  defaultLanguage  String        @default("en")
  stripeCustomerId String?       @unique   // platform billing
  stripeAccountId  String?       @unique   // Connect, tenant payments
  chargesEnabled   Boolean       @default(false)
  members          Member[]
  invitations      Invitation[]
  domains          Domain[]
  site             Site?
  subscription     Subscription?
  overrides        EntitlementOverride[]
  addOns           TenantAddOn[]
  usage            UsageCounter[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

enum TenantStatus { PROVISIONING ACTIVE PAST_DUE SUSPENDED CANCELED }

// Better Auth member; `role` is a role KEY — built-in ("owner", "manager",
// "staff") or a custom organizationRole (ADR 0019). One role per member.
model Member {
  id        String     @id @default(cuid())
  tenantId  String
  userId    String
  role      String
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  @@unique([tenantId, userId])
}

// Custom roles are Better Auth rows (`organizationRole` table from
// `dynamicAccessControl`), not our models: identity classification, created
// by the plugin's schema, shape { organizationId, role, permission }.
// Nothing in our code writes them by hand — always through the plugin API.

// On User (kit model): platformRole PlatformRole?  — null for everyone who is not our staff.
enum PlatformRole { OWNER ADMIN SUPPORT DESIGNER }

model Domain {
  id          String       @id @default(cuid())
  tenantId    String
  hostname    String       @unique         // lowercase, no port, no trailing dot
  kind        DomainKind                   // SUBDOMAIN | CUSTOM
  status      DomainStatus @default(PENDING)
  isPrimary   Boolean      @default(false)
  redirectTo  String?
  verification Json?                        // records returned by Vercel, shown to the owner
  lastCheckedAt DateTime?
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  @@index([tenantId])
}

model Site {
  id        String     @id @default(cuid())
  tenantId  String     @unique
  themeKey  String
  tokens    Json        // validated by the theme's token schema
  sections  Json        // validated by the theme's section schema
  languages String[]    @default(["en"])
  status    SiteStatus  @default(DRAFT)   // DRAFT | PUBLISHED | MAINTENANCE
  publishedAt DateTime?
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

// Kit Plan, extended with entitlements. Stripe price ids stay as they are.
// features: Json  — { [FeatureKey]: boolean | number | null }, validated against the registry
// visibility: PlanVisibility (PUBLIC | UNLISTED | ARCHIVED)
// setupFeeCents: Int?
// feeModel: Json  — application fee model for Connect payments

// Kit Subscription, re-owned: tenantId String @unique replaces userId.

model AddOn {
  id            String   @id @default(cuid())
  key           String   @unique
  name          String
  features      Json
  stripePriceId String   @unique
  isActive      Boolean  @default(true)
}

model TenantAddOn {
  id       String @id @default(cuid())
  tenantId String
  addOnId  String
  quantity Int    @default(1)
  @@unique([tenantId, addOnId])
}

model EntitlementOverride {
  id            String    @id @default(cuid())
  tenantId      String
  featureKey    String
  value         Json       // boolean | number | null
  ignoresSwitch Boolean   @default(false)
  reason        String
  expiresAt     DateTime?
  createdById   String
  createdAt     DateTime  @default(now())
  @@unique([tenantId, featureKey])
}

model UsageCounter {
  id          String   @id @default(cuid())
  tenantId    String
  limitKey    String
  periodStart DateTime
  used        Int      @default(0)
  @@unique([tenantId, limitKey, periodStart])
}

model PlatformSwitch {
  key       String   @id
  value     Json
  updatedById String?
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(cuid())
  tenantId   String?
  actorId    String?
  actorKind  String   // member | platform | customer | system
  action     String   // "plan.changed", "impersonation.started", "service.price.updated", …
  targetType String?
  targetId   String?
  data       Json?
  reason     String?
  createdAt  DateTime @default(now())
  @@index([tenantId, createdAt])
}

model TenantModule {
  id          String    @id @default(cuid())
  tenantId    String
  moduleKey   String
  enabled     Boolean   @default(false)
  settings    Json?                       // validated by the module's settings schema
  enabledAt   DateTime?
  disabledAt  DateTime?
  firstEnabledAt DateTime?                // onEnable ran
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@unique([tenantId, moduleKey])
}

model ModulePurge {
  id            String       @id @default(cuid())
  tenantId      String
  moduleKey     String
  status        PurgeStatus  @default(SCHEDULED)   // SCHEDULED | RUNNING | DONE | CANCELED | FAILED
  runAfter      DateTime                           // now + 7 days when scheduled by a tenant
  requestedById String
  counts        Json?                              // describeData at request time, then deleted counts
  lastError     String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  @@index([status, runAfter])
  @@index([tenantId, moduleKey])
}

model ModuleExport {
  id            String   @id @default(cuid())
  tenantId      String
  moduleKey     String
  status        String   // queued | ready | expired | failed
  storageKey    String?  // tenants/<tenantId>/exports/<id>.zip
  expiresAt     DateTime?
  requestedById String
  createdAt     DateTime @default(now())
  @@index([tenantId, createdAt])
}

model Job {
  id          String    @id @default(cuid())
  tenantId    String?
  kind        String
  payload     Json
  status      JobStatus @default(QUEUED)
  runAt       DateTime  @default(now())
  attempts    Int       @default(0)
  lastError   String?
  lockedUntil DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([status, runAt])
}

// Operations models — platform-owned, tenantId optional (a failed platform
// job or an email to a non-member may have none). See operations.md.

// Delivery record for every sendEmail() call; the "email queue" staff watch.
model EmailMessage {
  id          String      @id @default(uuid(7))   // append-only, high volume
  tenantId    String?
  kind        String                              // "auth.magic_link", "booking.confirmation", …
  toAddress   String
  subject     String
  provider    String                              // "brevo" | "resend" | "ses"
  providerId  String?
  status      EmailStatus @default(QUEUED)
  lastError   String?                             // masked — the log-line rule applies
  sentAt      DateTime?
  createdAt   DateTime    @default(now())
  @@index([tenantId, createdAt])
  @@index([status, createdAt])
}

enum EmailStatus { QUEUED SENT REFUSED FAILED }

// One row per error digest; the record that survives log retention.
model ErrorReport {
  id          String    @id @default(uuid(7))
  digest      String                            // hash of source + error name + first frame
  source      String                            // marketing | dashboard | platform | site | api | cron | job
  message     String                            // masked
  requestId   String?
  tenantId    String?
  count       Int       @default(1)
  firstSeenAt DateTime  @default(now())
  lastSeenAt  DateTime  @default(now())
  resolvedAt  DateTime?                         // set by staff; cleared if it recurs
  @@unique([digest])
  @@index([lastSeenAt])
}

// Per-tenant backup bundle in R2 (snapshots/<tenantId>/<id>.json.gz).
model TenantSnapshot {
  id          String         @id @default(cuid())
  tenantId    String
  status      SnapshotStatus @default(QUEUED)
  storageKey  String?
  sizeBytes   Int?
  reason      String?                             // staff-entered for manual snapshots
  createdById String?                             // null when the nightly job took it
  expiresAt   DateTime?                           // matches the bucket lifecycle (30 days)
  lastError   String?
  createdAt   DateTime       @default(now())
  completedAt DateTime?
  @@index([tenantId, createdAt])
}

enum SnapshotStatus { QUEUED RUNNING READY FAILED }
```

## What changes in kit models

| Kit model | Change | Phase |
| --- | --- | --- |
| `User` | add `platformRole`; `role` (USER/ADMIN) maps to `platformRole` and is removed after migration | 1 |
| `Subscription` | `userId` → `tenantId` | 2 |
| `Purchase` | `userId` → `tenantId` | 2 |
| `Plan` | add `features`, `visibility`, `setupFeeCents`, `feeModel` | 2 |
| `Project` | example model of the kit; removed from the product, kept in kit merges | 1 |

The migration for `Subscription` and `Purchase` creates one tenant per existing
user with data, so a database that already has kit users keeps working.


## Later-phase additions

- **`WaitlistEntry`** — a visitor's name on a fully booked day;
  `joinWaitlist` adds them, `manageAppointment`'s cancel notifies the day's
  waiters, `bookAppointment`'s `booked` transition clears the entry.
- **`Review`** — a customer's rating after a `completed` appointment;
  `submitReview` lands `pending`, `moderateReview` publishes it.
- **`IntakeForm`/`IntakeResponse`** — a contact-and-preferences form the
  tenant asks before a visit (ADR 0028's contact-only scope — no PHI).
- **`GiftCard`/`GiftCardLedger`, `Package`/`CustomerPackage`/`PackageLedger`,
  `Membership`/`CustomerMembership`/`MembershipLedger`** — prepaid balances;
  the ledger is the twin of each balance.
- **`Location`** — a tenant's physical branch (ADR 0025); `StaffMember`,
  `Appointment`, `AvailabilityRule`, `TimeOff` and `Order` carry
  `locationId` nullable.
- **`HealthCheck`** — platform-private; the `platform.health_check` job's
  probe rows the public `/status` page renders (ADR 0029).
- **`MemberNotification`** — a member's in-app feed row (phase 17.1): one
  per workspace event (`order.placed`, `booking.created`,
  `waitlist.joined`), `userId` null broadcasts to everyone, `readAt` marks
  it seen; `deleteTenant` sweeps the rows.
