"use client"

import { TriangleAlert, RotateCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"

/**
 * What an app page shows when it throws, from its `error.tsx`: the same block
 * as every empty state, with "Try again" (Next's `retry`, which re-fetches and
 * re-renders the segment) and the error's digest, which matches the server log
 * without showing the user what went wrong inside.
 */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errorPage")
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null

  return (
    <EmptyState
      tone="danger"
      icon={TriangleAlert}
      title={t("title")}
      description={t("description")}
      action={
        <>
          <Button onClick={() => retry()}>
            <RotateCw />
            {t("retry")}
          </Button>
          {digest && <p className="font-mono text-xs text-muted-foreground">{t("reference", { digest })}</p>}
        </>
      }
    />
  )
}
