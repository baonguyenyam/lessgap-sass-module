"use client"

import { Check, Copy, Download, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"

import {
  startTwoFactorSetup,
  confirmTwoFactorSetup,
  regenerateBackupCodes,
  disableTwoFactor,
  type SetupState,
} from "@/app/actions/two-factor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/**
 * Two-factor authentication, in three states: off, pairing, on.
 *
 * The pairing state exists only in this component's memory. That is not a
 * shortcut, it is the requirement: the backup codes are shown exactly once and
 * are never retrievable again, so they must not survive a redirect, sit in a
 * query string, or be fetched a second time. Leaving the page before writing
 * them down means generating a new set, which the card says out loud.
 *
 * Every call is a server action. No secret, no code and no password is handled
 * by anything in this file beyond being typed into a form.
 */
export function TwoFactorCard({
  enabled,
  hasPassword,
  isDemo,
}: {
  enabled: boolean
  hasPassword: boolean
  isDemo: boolean
}) {
  const t = useTranslations("dashboard.settings.twoFactor")
  const [setupState, setupAction, setupPending] = useActionState<SetupState, FormData>(startTwoFactorSetup, {})
  const [confirmState, confirmAction, confirmPending] = useActionState<SetupState, FormData>(confirmTwoFactorSetup, {})
  const [codesState, codesAction, codesPending] = useActionState<SetupState, FormData>(regenerateBackupCodes, {})

  const error = setupState.error ?? confirmState.error ?? codesState.error
  const codes = setupState.setup?.backupCodes ?? codesState.backupCodes

  if (isDemo) {
    return <p className="text-sm text-muted-foreground">{t("demo")}</p>
  }

  if (!enabled && !hasPassword) {
    return <p className="text-sm text-muted-foreground">{t("needsPassword")}</p>
  }

  return (
    <div className="space-y-4 text-sm">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}

      {/* ── On ─────────────────────────────────────────────────────────── */}
      {enabled && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{t("status")}</span>
              <Badge variant="secondary">{t("on")}</Badge>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <ShieldOff />
                  {t("turnOff")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("turnOffTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("turnOffDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <form action={disableTwoFactor} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="disable-password">{t("passwordLabel")}</Label>
                    <Input
                      id="disable-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                      <Button type="button" variant="outline">
                        {t("cancel")}
                      </Button>
                    </AlertDialogCancel>
                    <Button type="submit" variant="destructive">
                      <ShieldOff />
                      {t("turnOff")}
                    </Button>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {codes && <BackupCodes codes={codes} />}

          {/* Labelled rather than left to the placeholder: a placeholder is
              gone the moment you type, and it is not a label to a screen reader. */}
          <form action={codesAction} className="space-y-2">
            <Label htmlFor="regenerate-password">{t("passwordLabel")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="regenerate-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full sm:w-64"
                required
              />
              <Button type="submit" variant="outline" disabled={codesPending}>
                <RefreshCw />
                {t("regenerate")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("regenerateHint")}</p>
          </form>
        </div>
      )}

      {/* ── Pairing ────────────────────────────────────────────────────── */}
      {!enabled && setupState.setup && (
        <div className="space-y-4">
          {/* Named apps, not "an authenticator app": somebody who has never set
              one up cannot act on a category noun. */}
          <p className="text-muted-foreground">{t("scan")}</p>

          {/* White plate on purpose: a QR has to stay dark-on-light to be
              readable, in either theme. The markup is generated by our own
              server from the pairing URI, not by anything the user typed. */}
          <div
            className="inline-block rounded-xl bg-white p-3 [&_svg]:h-44 [&_svg]:w-44"
            dangerouslySetInnerHTML={{ __html: setupState.setup.qrSvg }}
          />

          <div>
            <p className="text-xs text-muted-foreground">{t("manualEntry")}</p>
            <code className="mt-1 inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs break-all">
              {setupState.setup.secret}
            </code>
          </div>

          {codes && <BackupCodes codes={codes} />}

          <form action={confirmAction} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">{t("codeLabel")}</Label>
              <Input
                id="totp-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full font-mono tracking-widest sm:w-64"
                required
              />
            </div>
            <Button type="submit" disabled={confirmPending}>
              <Check />
              {t("confirm")}
            </Button>
          </form>
        </div>
      )}

      {/* ── Off ────────────────────────────────────────────────────────── */}
      {!enabled && !setupState.setup && (
        <form action={setupAction}>
          <div className="space-y-2">
            <Label htmlFor="enable-password">{t("passwordLabel")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="enable-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full sm:w-64"
                required
              />
              <Button type="submit" disabled={setupPending}>
                <ShieldCheck />
                {t("turnOn")}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

/**
 * The codes, with the warning above them rather than below: by the time you
 * read a note under a list you have already scrolled past the list.
 */
function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("dashboard.settings.twoFactor")
  const [copied, setCopied] = useState(false)

  const text = codes.join("\n")

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission can be refused; the codes are on screen anyway.
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">{t("codesTitle")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("codesWarning")}</p>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm sm:grid-cols-3">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? t("copied") : t("copy")}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download />
          {t("download")}
        </Button>
      </div>
    </div>
  )
}
