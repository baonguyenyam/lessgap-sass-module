# Platform specification

This folder is the plan for turning the starter kit into a multi-tenant
website platform for local businesses: restaurants, nail salons, barbers,
dental offices and similar. We are the operator. Businesses buy a plan, get a
website we design for them, and manage the everyday parts of it themselves:
business information, services and prices, appointments, a shop, quotes, a
chatbot.

It is written for two readers: the team, and the coding agents that build it
phase by phase. Agents: read this file, then the phase you were asked to work
on in [roadmap.md](./roadmap.md), then the documents that phase links to.

## Documents

| # | Document | Answers |
| --- | --- | --- |
| 00 | [vision.md](./00-vision.md) | What we sell, to whom, and what we will not build |
| 01 | [architecture.md](./01-architecture.md) | How requests flow, where code lives, which layers exist |
| 02 | [tenancy.md](./02-tenancy.md) | What a tenant is, how data stays isolated, who can do what |
| 03 | [domains.md](./03-domains.md) | Subdomains, custom domains, DNS, SSL |
| 04 | [entitlements.md](./04-entitlements.md) | Platform switches, plans, features, limits, how a check is made |
| 05 | [billing.md](./05-billing.md) | How we charge tenants, and how tenants charge their customers |
| 06 | [sites-themes-verticals.md](./06-sites-themes-verticals.md) | How a tenant site renders, how themes and industry presets work |
| 07 | [modules.md](./07-modules.md) | Every business module: scope, data, plan gating |
| 08 | [chatbot-rag.md](./08-chatbot-rag.md) | The per-tenant assistant: ingestion, retrieval, limits, safety |
| 09 | [data-model.md](./09-data-model.md) | The Prisma models, in one place |
| 10 | [security-compliance.md](./10-security-compliance.md) | Threats, HIPAA, PCI, SMS consent, accessibility |
| — | [roadmap.md](./roadmap.md) | The phases, their scope and their exit criteria |
| — | [glossary.md](./glossary.md) | The words, so code and docs use the same ones |
| — | [adr/](./adr/) | Decisions, each with its reasons and the options we rejected |

## How this spec is kept true

- **A decision changes → write an ADR.** Add `adr/NNNN-title.md` with status
  `accepted`, mark the old one `superseded by NNNN`, and update the documents
  that described the old decision in the same change. Never silently edit an
  accepted ADR.
- **A phase ships → update its status** in [roadmap.md](./roadmap.md) and note
  anything that shipped differently from what is written here.
- **Code and spec disagree → the disagreement is a bug.** Fix whichever is
  wrong; do not leave both.
- **Statuses** used in headers: `draft` (open for change), `accepted`
  (build to it), `implemented` (shipped and matches), `superseded`.

## Relationship to the starter kit

The repository started as OpenStarterKit (MIT). We keep it mergeable with
upstream: see [ADR 0001](./adr/0001-fork-and-keep-upstream-mergeable.md). Kit
rules in `AGENTS.md` still apply to kit code; platform code follows the same
rules plus `.agents/rules/multi-tenancy.md` and `.agents/rules/modules.md`.

This folder lives outside `docs/` on purpose: `docs/` holds the kit's user
guides, each in two languages. The spec is an internal working document in
English, like the rest of the code.
