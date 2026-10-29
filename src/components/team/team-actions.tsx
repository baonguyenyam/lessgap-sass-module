"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { addStaff, removeStaff } from "@/app/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** The team add/remove actions (task 4.3). */
export function TeamActions({ add, remove, staffId }: { add?: boolean; remove?: boolean; staffId?: string }) {
  const t = useTranslations("dashboard.team")
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const r = await fn()
      setError(r.error ?? null)
    })

  if (add) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t("staffName")}
          placeholder={t("staffName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48"
        />
        <Input
          aria-label={t("staffBio")}
          placeholder={t("staffBio")}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-64"
        />
        <Button size="sm" disabled={pending || !name.trim()} onClick={() => run(() => addStaff({ name, bio }))}>
          {t("actions.add")}
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </div>
    )
  }
  return (
    <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => removeStaff(staffId!))}>
      {t("actions.remove")}
    </Button>
  )
}
