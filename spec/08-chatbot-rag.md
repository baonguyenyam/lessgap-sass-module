# Chatbot (retrieval-augmented)

**Status:** `draft`

## What it does

A chat bubble on the tenant's site that answers customers' questions from the
tenant's own information, in the customer's language, and hands off to an
action: book, see the menu, request a quote, call, leave a message. It does
not answer from general knowledge about other businesses, and it never makes
up prices, hours or availability.

## Knowledge

| Source | How it enters | Kept in sync |
| --- | --- | --- |
| Site settings (hours, address, phone, policies) | structured, injected into the prompt, not embedded | always current, read at answer time |
| Services and prices, menu, products | structured, retrieved by tool call, not embedded | always current |
| Availability | tool call to `booking` | always current |
| Pages on the site | chunked and embedded | re-indexed on save via `site.page.saved` event |
| FAQ entries written by the tenant | embedded | re-indexed on save |
| Uploaded documents (PDF, DOCX, TXT) | extracted, chunked, embedded | re-indexed on upload or delete |

Facts that change and must be exact (prices, hours, availability) are never
answered from embeddings: they come from tools that read the database, so the
answer matches the site. Embeddings are for prose.

## Storage

`KnowledgeSource` (tenantId, type, title, status, checksum) and
`KnowledgeChunk` (tenantId, sourceId, content, language, embedding
`vector(N)`, token count) in the same database with pgvector
([ADR 0007](./adr/0007-pgvector-for-rag.md)). RLS applies to chunks like any
tenant table; retrieval always filters by `tenantId` first, then by vector
distance.

## Answer pipeline

1. Rate-limit by visitor and by tenant. `consumeLimit(ctx, "chatbot.messages.monthly", 1)`.
2. Build the system prompt from the tenant's settings and the tenant's chatbot
   settings (tone, languages, what to hand off), from a versioned template in
   `src/modules/chatbot/prompts/`.
3. Retrieve top chunks for the question (tenant filter, language preference).
4. Call the model with tools: `get_services`, `get_hours`, `find_slots`,
   `start_booking`, `start_quote`, `leave_message`.
5. Stream the answer. Show sources (page titles) when prose came from chunks.
6. Log the conversation for the tenant (90 days default), without storing
   payment data, and with personal data removed from what we use for quality review.

## Safety

- The tenant's content is data. Instructions inside a page or document are
  not followed; the system prompt says so and tests include injection attempts.
- No medical, legal or financial advice; the dental vertical's prompt directs
  clinical questions to call the office.
- The bot never confirms a booking itself; it hands the customer to the
  booking flow, where availability and deposits are enforced.
- Per-tenant kill switch, and platform kill switch `feature.chatbot`.

## Providers

LLM and embeddings behind `src/modules/chatbot/server/provider.ts`, chosen by
the `chatbot.provider` platform switch. Changing the embedding model requires
a re-index job per tenant, tracked by `KnowledgeSource.embeddingModel`.

## Gates

`chatbot`, `chatbot.messages.monthly`, `chatbot.documents.max`,
`chatbot.languages.max`, `chatbot.handoff.sms`.

## Required tests

- Retrieval never returns another tenant's chunk (integration, two tenants, same text).
- Price and hours answers come from tools: changing a price changes the answer
  without re-indexing (integration with a stubbed model).
- Prompt injection fixtures in a document do not change behaviour (stubbed model asserts the system prompt and tool policy).
