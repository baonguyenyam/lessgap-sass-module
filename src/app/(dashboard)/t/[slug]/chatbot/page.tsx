import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReindexButton } from "@/components/chatbot/reindex-button"
import { ChatbotSettingsForm } from "@/components/chatbot/settings-form"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Chatbot (task 7.4): sources + re-index, settings, and the
 * conversation log. */
export default async function ChatbotPage() {
  const c = await requireTenantContext("settings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "chatbot"
  )
  const t = await getTranslations("dashboard.chatbot")
  const [sources, conversations, settingsRow] = await Promise.all([
    db8.orm.public.KnowledgeSource.where({ tenantId: c.tenantId }).include("chunks").all(),
    db8.orm.public.ChatConversation.where({ tenantId: c.tenantId })
      .include("messages")
      .orderBy((x) => x.updatedAt.desc())
      .all(),
    db8.orm.public.TenantSetting.where({ tenantId: c.tenantId, key: "chatbot.settings" }).first(),
  ])
  const settings =
    typeof settingsRow?.value === "object" && settingsRow.value !== null
      ? (settingsRow.value as { tone?: string; languages?: string[] })
      : {}
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ReindexButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("sources", { count: sources.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sources_empty")}</p>
          ) : (
            sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  {s.title} <span className="text-muted-foreground">({s.type})</span>
                </span>
                <span className="text-muted-foreground">
                  {s.chunks.length} chunks · {s.embeddingModel}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatbotSettingsForm tone={settings.tone ?? ""} languages={(settings.languages ?? []).join(",")} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("conversations", { count: conversations.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("conversations_empty")}</p>
          ) : (
            conversations.slice(0, 20).map((conv) => (
              <div key={conv.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {conv.visitorKey} · {conv.messages.length} {t("messages")} ·{" "}
                  {toDate(conv.updatedAt).toUTCString().slice(0, 16)}
                </p>
                {conv.messages.slice(-3).map((m) => (
                  <p key={m.id} className="mt-1 truncate text-muted-foreground">
                    {m.role === "user" ? "→" : "←"} {m.content}
                  </p>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
