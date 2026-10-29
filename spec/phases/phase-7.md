# Phase 7 — Chatbot (retrieval-augmented)

**Status:** draft
**Roadmap:** [roadmap.md#phase-7--chatbot](../roadmap.md)
**Read first:** [chatbot-rag.md](../08-chatbot-rag.md),
[ADR 0007](../adr/0007-pgvector-for-rag.md),
[module-system.md](../15-module-system.md),
[modules.md](../07-modules.md) (`chatbot`), [conventions](../13-conventions.md).

## Goal

A chat bubble on the tenant's site answers customers' questions from the
tenant's own information — in the customer's language — and hands off to an
action: book, see the menu, request a quote, leave a message. Facts that
must be exact (prices, hours, availability) never come from embeddings —
they come from tools reading the database, so the answer matches the site.
Embeddings are for prose: pages, FAQ entries and uploaded documents live in
`KnowledgeSource`/`KnowledgeChunk` with pgvector in the same RLS database
(ADR 0007). A `chatbot` module wires it through the lifecycle; per-tenant
and platform kill switches live on the switch registry; a provider
abstraction (`chatbot.provider`) keeps the LLM and embedder swappable.

## Out of scope

- Real LLM provider credentials in tests — the `local` provider stubs
  answers; `openai`/`anthropic` land behind the same `ChatProvider`
  interface when keys exist (decision 7-A).
- Voice, widget theming beyond the bubble's appearance controls.
- Cross-tenant analytics on conversations — logged per tenant, reviewed
  there only.
- Re-index on every event — `site.page.saved` + document upload/delete +
  FAQ save trigger it; booking/order data never enters the index.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 7-A | LLM + embedder | Real API / provider interface | **`ChatProvider` interface** like `DomainProvider` — `local` stubs answers + embeddings (deterministic), `openai` behind `OPENAI_API_KEY`; `chatbot.provider` platform switch picks |
| 7-B | Conversation logging | `ChatConversation` + `ChatMessage` rows / `NotificationLog` | **`ChatConversation` + `ChatMessage`** — 90-day retention job; personal data minimised before quality review |
| 7-C | Prompt template | DB / versioned file | **Versioned file** in `src/platform/chatbot/prompt.ts` — the kernel boundary lint (`no-restricted-imports`) keeps the kernel out of `src/modules/`; a tenant's `chatbot.prompt.<version>` TenantSetting overrides (like notify templates) |
| 7-D | Kill switches | Two switches / one | **`chatbot` tenant module + `feature.chatbot` platform switch** — a platform-off stops every site |
| 7-E | Re-index trigger | Job tick / `site.page.saved` event | **Event + job**: save/upload/delete enqueue `platform.chatbot.reindex` (the existing job runner) |

## Tasks

### 7.1 — Chatbot schema: sources, chunks, conversations
- **Goal:** `KnowledgeSource`, `KnowledgeChunk` (pgvector embedding),
  `ChatConversation`, `ChatMessage` — tenant-owned, RLS'd, deletable.
- **Files:** `prisma/contract.prisma`, migration (+`vector` extension
  `CREATE EXTENSION IF NOT EXISTS vector`), `models.ts`,
  `delete-tenant.ts` + T9.
- **Tests:** T9 extension — delete cleans all four.
- **Checks:** `pnpm db:emit`, `pnpm audit:tenancy`, `pnpm test:integration`.
- **Done when:** migration applied (pgvector index), 67 models classified.
- [x] done (`@prisma/orm-extension-pgvector` (8.0.0-rc.21) — three layers: control descriptor in `prisma.config.ts` `extensions`, runtime descriptor on `db8` and `platformDb` via shared `dbExtensions` (lesson added — a client without it throws `RUNTIME.MISSING_EXTENSION_PACK`). 4 models: `KnowledgeSource` (type/title/checksum/embeddingModel), `KnowledgeChunk` (`pgvector.Vector(384)`, language, tokenCount), `ChatConversation` (visitorKey, 90-day log), `ChatMessage` (role, sourcesJson) — @@rls cascade, 67 models classified, `deleteTenant` + T9 cover all. Two migration spaces: `app` → `8d60169c`, `pgvector` → `4a96b488` (extension installed in its own space).)

### 7.2 — Ingest pipeline: chunk, embed, re-index
- **Goal:** `chunkText` pure (split on headings/paragraphs to a token cap),
  `embed` behind `ChatProvider.embed`, `KnowledgeSource`/`KnowledgeChunk`
  upsert keyed by checksum — `site.page.saved`/FAQ save/document upload →
  `platform.chatbot.reindex` job; `embeddingModel` tracked per source.
- **Files:** `src/lib/chatbot/chunk.ts`, `src/modules/chatbot/server/provider.ts`,
  `src/platform/chatbot/ingest.ts`, `src/platform/jobs/registry.ts`,
  `src/modules/chatbot/module.ts`.
- **Tests:** unit — `chunkText` boundaries + token cap; integration —
  `reindex` creates chunks from a page's content keyed by tenant, a changed
  checksum re-embeds, an unchanged one is a no-op.
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** `reindex` populates `KnowledgeChunk` per tenant and is
  idempotent.
- [x] done (`src/lib/chatbot/chunk.ts` — `chunkText` (paragraph/heading boundaries, token cap ≈ 4 chars/token, hard-splits oversized blocks) + `estimateTokens`. `src/platform/chatbot/provider.ts` — `ChatProvider` (embed + chat + tools); `localProvider` = deterministic 384-dim hash embedding + stub chat that calls `get_services`/`get_hours`/`find_slots` by keyword (moved from `src/modules/chatbot/server/` — the kernel can't import modules, lint rule). `src/platform/chatbot/ingest.ts` — `collectSources` (published `Page`s + `chatbot.faq` TenantSetting) + `reindexTenant` (checksum+embeddingModel → upsert source, delete+re-chunk+embed). `src/modules/chatbot/module.ts` lifecycle. `platform.chatbot.reindex` JOBS. Feature keys `chatbot`, `chatbot.messages.monthly`, `chatbot.documents.max`, `chatbot.languages.max`, `chatbot.handoff.sms` + `module.chatbot` + `feature.chatbot` seeded. Unit `chunk.test.ts` 4/4; integration `chatbot-ingest.test.ts` 4/4 — tenant-keyed chunks, checksum no-op/change re-embeds, FAQ, tenant isolation.)

### 7.3 — Answer pipeline: prompt, tools, stream, log
- **Goal:** `answerChat(ctx, question)` — rate-limit
  (`consumeLimit` `chatbot.messages.monthly`), system prompt from the
  versioned template + tenant settings + tenant chatbot settings, retrieve
  top chunks (tenantId first, then distance), call the provider with tools
  (`get_services`, `get_hours`, `find_slots`, `start_booking`,
  `start_quote`, `leave_message`), stream the answer, log the conversation.
- **Files:** `src/platform/chatbot/answer.ts`, `src/modules/chatbot/prompts/base.ts`,
  `src/app/api/chat/route.ts` (SSE or JSON stream).
- **Tests:** unit — prompt assembly + tool-call parse; integration —
  a price answer comes from `get_services` (changing the price changes the
  answer, no re-index); a question hitting `chatbot.messages.monthly` cap
  returns `limit_reached`.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** a question gets a streamed, sourced answer and a logged
  conversation.
- [x] done (`src/platform/chatbot/answer.ts` — `answerChat`: `consumeLimit(chatbot.messages.monthly)` → tenant settings + `chatbot.settings` (tone/languages) + `chatbot.prompt.v1` TenantSetting override → `buildSystemPrompt` (injection-safe: tenant content is DATA, facts from tools, never confirms booking) → embed question → retrieve chunks (`tenantId` first, cosine top-5) → `provider.chat` with 6 tools → executes calls (`get_services`/`get_hours`/`find_slots` read the DB live; `start_booking`/`start_quote`/`leave_message` hand off) → logs `ChatConversation` + 2 `ChatMessage`s. `/api/chat` POST — `resolveHost` → `requireModule(chatbot)` + `feature.chatbot` switch (403 when off). Prompt moved to `src/platform/chatbot/prompt.ts` — kernel can't import `src/modules/`. Integration `chatbot-answer.test.ts` 4/4 — chunk answer + logged conversation, price-from-tools (change → new answer, no re-index), `chatbot.messages.monthly` cap → AppError, tenant-isolated retrieval; unit `chatbot-prompt.test.ts` 2/2.)

### 7.4 — Site chat bubble + dashboard + switches
- **Goal:** the widget on `/sites/[host]` (bubble → sheet → input →
  streamed reply); `/t/<slug>/chatbot` — sources (re-index button),
  settings (tone, languages, handoff targets), conversations list; the
  `chatbot` tenant module + `feature.chatbot` platform kill switch gate
  the API and the widget.
- **Files:** `src/components/chatbot/chat-bubble.tsx`,
  `src/app/(dashboard)/t/[slug]/chatbot/`, `src/app/actions/chatbot.ts`,
  nav, translations, `module.chatbot` + `feature.chatbot` seed.
- **Tests:** integration — `feature.chatbot` off → API 403 and the widget
  hidden; a source re-index button enqueues the job.
- **Checks:** `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** a tenant configures the bot, sees its conversations, and
  can be silenced platform-wide.
- [x] done (`src/components/chatbot/chat-bubble.tsx` — bubble → sheet → messages; `visitorKey` lazy in `currentVisitorKey()` inside `ask()` (sessionStorage in a render call is impure — react-hooks/purity). Mounted on `/sites/[host]` inside `<Layout>` when `chatbotEnabled` — `getSiteData` computes it from `TenantModule(chatbot)` + `PlatformSwitch(feature.chatbot)` (`SiteData.chatbotEnabled`). `/t/<slug>/chatbot` — sources + chunks count, `ReindexButton` (enqueues `platform.chatbot.reindex`), `ChatbotSettingsForm` (tone + languages → `chatbot.settings` TenantSetting), conversation log. Nav gated by `enabledModules`. `reindexNow` + `saveChatbotSettings` server actions audited. Integration `chatbot-kill-switch.test.ts` 3/3 — `feature.chatbot` off → API 403 + widget flag false; on → 200; `reindexNow` enqueues a `platform.chatbot.reindex` job row.)

### 7.5 — Required tests + cost record
- **Goal:** spec/08's three required tests pass, and cost per 1,000
  messages is measured and recorded in an ADR.
- **Tests:**
  - Retrieval never returns another tenant's chunk — two tenants, same
    text, only own chunks back (integration).
  - Price/hours answers come from tools — change a price, the answer
    changes without re-indexing (integration, stubbed provider).
  - Injection fixtures in a document don't change behaviour — the stubbed
    model asserts the system prompt and tool policy (unit + integration).
- **Files:** `tests/integration/chatbot-*.test.ts`,
  `tests/unit/lib/chatbot-*.test.ts`, `spec/adr/00XX-chatbot-cost.md`.
- **Done when:** all three spec tests green + ADR records the measured
  cost per 1,000 messages with the local provider's deterministic count.
- [ ] done

## Exit criteria

- The three required tests in chatbot-rag.md pass.
- Cost per 1,000 messages measured and recorded in the ADR.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

(none yet)
