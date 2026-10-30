# Module system

**Status:** `draft` · Decision: [ADR 0010](./adr/0010-modules-are-plugins-with-a-kernel.md)

Every business capability is a **module**: a self-contained plugin with a
manifest, a lifecycle, declared dependencies and declared extension points.
The **kernel** (`src/platform/`) knows how to load, gate and wire modules and
knows nothing about any particular one. This is what lets us switch a
capability off for everyone, on for one tenant, or ship it as an experiment
without touching the rest of the code.

## Kernel and modules

```
src/platform/            kernel: tenancy, entitlements, switches, module runtime,
                         events, jobs, navigation, settings, audit
src/modules/<key>/       one module per folder, same shape for all
src/modules/registry.ts  the only list of modules (generated, see "Scaffolding")
```

Rule of thumb: if two modules need it, it belongs in the kernel or in a
shared library (`src/lib`, `src/components/ui`), never copied. If only one
module needs it, it lives in that module.

## The manifest

`src/modules/<key>/module.ts` default-exports `defineModule({...})`. The
kernel reads nothing about a module except this object.

```ts
export default defineModule({
  key: "booking",                        // kebab or snake, unique, never renamed
  name: "modules.booking.name",          // translation key
  version: "1.0.0",                      // semver of the module's contract
  stage: "stable",                       // "experimental" | "beta" | "stable" | "deprecated"
  dependsOn: ["catalog", "team", "customers", "notifications"],
  optionalDependsOn: ["payments"],       // used if present and enabled

  features: bookingFeatures,             // defineFeatures({...}), see entitlements.md
  permissions: ["booking.read", "booking.manage", "booking.own"],
  settings: bookingSettingsSchema,       // Zod schema for the tenant's module settings, with defaults
  models: ["Resource", "AvailabilityRule", "TimeOff", "Appointment", "AppointmentEvent"],

  dashboard: {
    nav: [{ href: "bookings", label: "modules.booking.nav", icon: "calendar", permission: "booking.read" }],
    // routes live in src/app/(dashboard)/t/[slug]/<href>/ and call requireModule("booking")
  },
  site: {
    pages: ["book"],                     // page keys themes may render
    blocks: ["booking-widget", "next-available"],   // components in ./site/
  },
  events: {
    emits: ["booking.appointment.requested", "booking.appointment.confirmed", "booking.appointment.canceled", "booking.appointment.completed"],
    subscribes: { "catalog.service.archived": onServiceArchived },
  },
  jobs: { "booking.reminders": { schedule: "*/5 * * * *", handler: sendReminders } },
  extensionPoints: {
    "booking.checkout.before": "Lets payments add a deposit step",
  },
  extends: {},                           // contributions to other modules' extension points

  lifecycle: {
    onEnable: seedDefaultAvailability,   // per tenant, idempotent
    onDisable: undefined,                // optional; never deletes data
    describeData: countBookingData,      // per tenant: { appointments: 1240, resources: 4, … } for the purge screen
    onExport: exportBookingData,         // per tenant: streams CSV/JSON files, one per entity
    onPurge: purgeBookingData,           // per tenant; batched, idempotent; only via the purge job
  },
})
```

The manifest is validated by a Zod schema at build time and by the contract
tests ([testing.md](./11-testing.md)). A module that does not validate does
not load.

## Lifecycle

| State | Meaning | Who changes it |
| --- | --- | --- |
| **registered** | in `registry.ts`, code shipped | developer (PR) |
| **available** | platform switch `module.<key>` on, and stage allows it for this tenant | platform staff |
| **entitled** | the tenant's plan/add-on/override includes the module feature | billing, platform staff |
| **enabled** | the tenant (or staff) turned it on in **Settings → Modules** | tenant owner |
| **disabled** | turned off; data kept, everything hidden and paused | tenant owner or staff |
| **purge scheduled** | disabled, deletion requested, waiting out the grace period | tenant owner or staff |
| **purged** | data removed for one tenant | purge job, or tenant deletion |

A module is **active for a tenant** when it is available, entitled, enabled,
and every `dependsOn` module is active for that tenant. One function answers
it: `isModuleActive(ctx, key)`; `requireModule(ctx, key)` throws a not-found
for routes and a typed error for actions. `enableModule` refuses a key whose
dependencies are not enabled — a storefront cannot turn on without payments
— and `disableModule` refuses a module something still enabled depends on;
the chain holds in both directions.

- `onEnable` runs once per tenant when the module becomes active the first
  time (default settings, sample rows). It is idempotent.
- Disabling never deletes data and never runs a destructive hook. It hides
  navigation, routes (404), site blocks, and pauses the module's jobs and
  event subscribers for that tenant.
- `onPurge` deletes the module's rows for one tenant. It is called only by
  the purge job (below) and by tenant deletion, never automatically on disable.
- Disabling a module that others depend on is refused with the list of dependants.

### No tables per tenant

Turning a module on creates **no table and no database**. A module's tables
are created once, for every tenant, by the migration that ships with its
code; rows carry `tenantId` and RLS keeps each tenant to its own
([ADR 0002](./adr/0002-shared-database-tenant-id-and-rls.md)). Enabling for a
tenant writes one `TenantModule` row and runs `onEnable`.

### Settings → Modules

One page in the tenant dashboard, owner only (managers see it read-only),
listing every module that is available to the tenant:

| Module state | Shown | Actions |
| --- | --- | --- |
| not entitled | name, what it does, which plan includes it | Upgrade |
| entitled, never enabled | name, description | Enable |
| active | name, short usage summary | Settings, Disable |
| disabled | "Off since <date>. Your data is kept." and the counts from `describeData` | Enable, Export data, Delete data |
| purge scheduled | "Deletes on <date>." | Cancel deletion, Export data |

Platform staff see the same page for any tenant in the console, with the
same actions plus an immediate purge (still audited, still with the counts and typed confirmation).

### Export

Available while a module is disabled or purge-scheduled (and always to
staff). Runs as a job, calls the module's `onExport`, writes one file per
entity (CSV for tables people open in a spreadsheet, JSON for nested data)
into a zip under the tenant's storage prefix, emails the owner a signed link
valid for 7 days, and writes an audit entry. Exports never include data of
other modules, secrets, payment card data (never stored) or other tenants' rows.

### Delete data (scheduled purge)

1. The module must be disabled. No active module may `dependsOn` it; if one
   does, the button is disabled with "Used by: Booking, Quotes".
2. The owner clicks **Delete data**. The screen shows exactly what goes, from
   `describeData` ("1,240 appointments, 4 resources, 312 reminders logged"),
   recommends **Export data** first, and asks the owner to type the module's name.
3. A `ModulePurge` row is created with status `scheduled` and
   `runAfter = now + 7 days`. The owner gets an email with a cancel link;
   audit entry `module.purge.scheduled`.
4. During the 7 days the data stays untouched and the module cannot be
   re-enabled without first cancelling the deletion (one click, audited).
5. After `runAfter`, the purge job calls `onPurge` in batches until it reports
   zero remaining rows, records the counts it deleted, sets status `done`,
   resets the module's `TenantModule` row (as if never enabled), emails the
   owner and writes `module.purge.completed`.
6. A failure leaves status `failed` with the error, alerts platform staff, and
   is retried; `onPurge` is idempotent, so a retry continues where it stopped.

Rules for `onPurge`:

- Deletes only rows of its own models for that tenant, through `tenantDb`.
- Deletes the module's files in storage and its embeddings, if any.
- Never deletes data of another module. Other modules refer to this one's
  rows by plain id and must render a missing reference gracefully ("deleted
  service"); that is checked by their tests, not prevented here.
- Data required by law (tax records of paid orders) is anonymised instead of
  deleted, and the screen says so before the owner confirms.

Backups: deleted rows remain in database point-in-time backups until those
expire (retention set in [security-compliance.md](./10-security-compliance.md)).
The confirmation screen states this plainly.

## Stages and experiments

| Stage | Who can see it | Guarantees |
| --- | --- | --- |
| `experimental` | tenants in the module's allow-list (staff-managed), platform staff | may change or disappear; data may be purged on removal with notice |
| `beta` | allow-list or a rollout percentage (stable hash of tenant id) | contract stable, behaviour may change |
| `stable` | anyone entitled | semver; breaking changes go through `deprecated` |
| `deprecated` | tenants already using it; hidden from new ones | removal date announced in the platform console |

Rollouts are platform switches: `module.<key>.rollout` holds
`{ allow: string[], percent: number }`. The same mechanism works for a
feature inside a module: `feature.<featureKey>.rollout`.

This is how to try something new: create the module (or feature) as
`experimental`, allow-list our own demo tenant and one friendly customer,
promote to `beta` with a percentage, then `stable`. No branch lives longer
than a PR; unfinished work ships dark behind the stage.

## Extension points

Modules collaborate without importing each other's internals:

| Mechanism | Use when | API |
| --- | --- | --- |
| **Service call** | you need data or an action now from a dependency | `import { getService } from "@/modules/catalog/server"` (public index only) |
| **Event** | something happened and others may react, later or not at all | `emit(ctx, "booking.appointment.confirmed", payload)`; subscribers in manifests; delivered in-process after commit, through the jobs table when the subscriber is slow |
| **Extension point** | a module lets others plug a step or a UI slot into its flow | declared in `extensionPoints`, filled in another module's `extends`, resolved by the kernel only for active modules |
| **Site block** | a theme shows module UI | `site.blocks`, rendered by themes through `<ModuleBlock name="booking-widget" />` |

Event payloads are typed in the emitting module's `events.ts` and versioned
(`booking.appointment.confirmed@1`). Adding a field is fine; removing or changing one
needs a new version and both emitted during migration.

## Boundaries, enforced

Rules an agent will forget are enforced by tools, not by reminders.

- **ESLint `no-restricted-imports`** (added in phase 0): files in
  `src/modules/<a>/` may not import `src/modules/<b>/*` except
  `src/modules/<b>/server` (the index) and `src/modules/<b>/events`.
  Themes may import only `src/modules/*/site` and types.
  `src/platform/` may not import any module except through the registry.
- **Contract tests**: every manifest validates; every declared model is
  classified; every dashboard route of a module calls `requireModule`; every
  feature key used in a module is declared in it; `dependsOn` has no cycles;
  every emitted event has a payload type.
- **Tenancy audit**: models listed in a manifest exist and carry `tenantId`.

## Scaffolding

`pnpm new:module <key>` (phase 0) creates the folder with every source file in
the standard shape, a manifest at `stage: "experimental"`, and regenerates
`registry.ts`. Modules do not have separate Prisma files: their models belong
in the module's section of the shared `prisma/contract.prisma` when a later
task introduces them ([ADR 0024](./adr/0024-contract-ownership-by-section.md)).
Agents create modules only with this command, so every module starts identical.

`pnpm modules:check` runs manifest validation, the dependency graph check and
the boundary lint for modules only; it is part of `pnpm test`.

## Removing a module

1. Mark it `deprecated` with a removal date; announce to affected tenants.
2. After the date: switch off, run `onPurge` for every tenant through a job.
3. Contract migration drops its tables (expand/contract rules apply).
4. Delete the folder; the registry regenerates.
