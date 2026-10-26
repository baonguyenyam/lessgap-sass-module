# 0014. ROOT above ADMIN, granted by configuration

**Status:** accepted
**Date:** 2026-10-26

## Context
The product owner asked for a ROOT level above ADMIN for his own account:
admins have authority inside tenants, ROOT over the whole system. Until phase 1
there are no tenants, and the kit's `User.role` (USER, ADMIN) gates the admin panel.

## Decision
- `User.role` is `USER < ADMIN < ROOT` (migration `kit_role_root`).
- Every check goes through `src/lib/roles.ts` (`isAdmin`, `isRoot`,
  `canChangeRole`). ROOT passes every admin check.
- Only ROOT changes roles, only between USER and ADMIN, never its own.
- ROOT is granted only by `ROOT_EMAILS`, applied by the seeds. Nothing in the
  UI or the API can grant or remove ROOT, so a stolen admin session cannot
  escalate. Removing an address from the variable demotes no one.
- The last ROOT cannot delete their account; an admin cannot delete theirs
  when no other admin or ROOT remains.
- Phase 1 mapping: ROOT is `platformRole OWNER` in spec/02-tenancy.md;
  per-tenant administration moves to tenant member roles (OWNER, MANAGER),
  and `User.role ADMIN` becomes platform staff. The phase 1 brief records the migration.

## Consequences
- One place decides role questions; inline `role === "ADMIN"` is a review defect.
- Adding a ROOT account needs a deploy-time config change and a seed run, by design.

## Options considered
- **ROOT promotable from the admin panel:** convenient, and exactly the escalation path to avoid.
- **A boolean `isRoot` next to `role`:** two fields to keep consistent; a rank on one enum is simpler.
