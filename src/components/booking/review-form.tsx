"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { submitReview } from "@/app/actions/reviews"

/** The completed-appointment review form (task 11.2's visitor half, task
 * 12.4's UI): the manage token proves the visit — a rating + a note go
 * `pending` until the tenant approves. */
export function ReviewForm({ token }: { token: string }) {
  const t = useTranslations("site.booking")
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await submitReview({ token, rating, body: body || undefined })
    setPending(false)
    if ("error" in res && res.error) setError(res.error)
    else setDone(true)
  }
  if (done) return <p role="status">{t("review_thanks")}</p>
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="rv-rating">{t("review_rating")}</Label>
        <Input
          id="rv-rating"
          type="number"
          min={1}
          max={5}
          required
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rv-body">{t("review_body")}</Label>
        <Input id="rv-body" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("review_submitting") : t("review_submit")}
      </Button>
    </form>
  )
}
