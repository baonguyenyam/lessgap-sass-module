# Platform specification

This folder is the plan for turning the starter kit into a multi-tenant
website platform for local businesses: restaurants, nail salons, barbers,
dental offices and similar. We are the operator. Businesses buy a plan, get a
website we design for them, and manage the everyday parts of it themselves:
business information, services and prices, appointments, a shop, quotes, a
chatbot.

It is written for two readers: the team, and the coding agents that build it
phase by phase. Agents: read this file, then the brief of the phase you were
asked to work on in [phases/](./phases/), then the documents that brief links to.

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
| 11 | [testing.md](./11-testing.md) | Test layers, test database, factories, the mandatory test-case catalogue |
| 12 | [migrations-and-data.md](./12-migrations-and-data.md) | Schema layout, writing migrations, RLS, zero-downtime changes, backfills, seeds |
| 13 | [conventions.md](./13-conventions.md) | Errors, action results, logging, money, time, i18n, naming |
| 14 | [environments-and-release.md](./14-environments-and-release.md) | Local, preview, staging, production; deploys, rollback, versioning |
| 15 | [module-system.md](./15-module-system.md) | The kernel, module manifest, lifecycle, stages and experiments, extension points, boundaries |
| — | [phases/](./phases/) | The brief for each phase: tasks, files, tests, checks |
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

The repository started from OpenStarterKit (MIT). It is now an independent
project, lessgap-sass-module; the kit is a reference we learned from, not an
upstream we merge ([ADR 0011](./adr/0011-independent-project-kit-as-reference.md)).
The rules in `AGENTS.md` apply to all code, plus `.agents/rules/multi-tenancy.md`
and `.agents/rules/modules.md` for platform code.

This folder lives outside `docs/` on purpose: `docs/` holds user guides,
each in two languages. The spec is an internal working document in English,
like the rest of the code.
