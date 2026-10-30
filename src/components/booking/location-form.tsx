"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createLocation } from "@/app/actions/locations"

export function LocationForm() {
  const t = useTranslations("dashboard.locations")
  const router = useRouter()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    await createLocation({ name, address: address || undefined })
    setPending(false)
    setName("")
    setAddress("")
    router.refresh()
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="loc-name">{t("name")}</Label>
        <Input id="loc-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="loc-address">{t("address")}</Label>
        <Input id="loc-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="self-end">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? t("adding") : t("add_button")}
        </Button>
      </div>
    </form>
  )
}
