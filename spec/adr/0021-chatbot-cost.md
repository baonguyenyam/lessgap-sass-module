# 0021. Chatbot cost per 1,000 messages

**Status:** accepted
**Date:** 2026-10-29

## Context

The roadmap's exit criterion for phase 7: measure and record the cost per
1,000 chatbot messages. The provider interface (`ChatProvider`) has two
implementations: `local` (deterministic, dev/test) and a hosted model behind
env keys. The cost is measurable in tokens either way.

## Measured

Using `estimateTokens` (token ≈ 4 characters):

| Component | Tokens/message |
| --- | --- |
| System prompt (rules + business name, no chunks) | ~180 |
| Retrieved chunks (top-5 × ~400-token cap, median ~120) | ~600 |
| User question | ~15 |
| Answer | ~80 |
| **Total per message** | **~875** |

Per 1,000 messages: **~875k tokens**.

## Cost

- **`local` provider:** $0 — deterministic hashing and templates, no model.
- **Hosted model (typical, ~$0.15/1M input, ~$0.60/1M output):**
  input ≈ 795k tokens × $0.15/1M + output ≈ 80k × $0.60/1M ≈ **$0.17 per
  1,000 messages**, plus embeddings (~$0.02/1M tokens, one-time per source).
- **Kill switch + cap:** `chatbot.messages.monthly` and `feature.chatbot`
  bound the spend — a tenant can never exceed its plan's cap.

## Consequences

- Re-index on every `site.page.saved`/FAQ/document save keeps embedding cost
  per-source, not per-message.
- If a hosted provider's per-token price rises, the ADR updates — the
  pipeline (retrieval cap of 5 chunks, ~400-token chunks) bounds the input.
