# 0019. Tenant roles are permission groups, built-in plus custom

**Status:** proposed
**Date:** 2026-10-26

## Context
The tenancy spec fixes tenant roles at `OWNER | MANAGER | STAFF`. The owner
requires real permission groups: an account creator owns their tenant (paid
or free plan alike) and can then create sub-users and define their own role
groups — a "receptionist" that manages bookings but not prices, a
"technician" that only sees their calendar. The reference projects
(vnbca.org, bellav-2026, platform.madelab.io) all ship this as role rows with
permission checkboxes.

## Decision
- **Permissions live in one registry**, `src/platform/tenancy/permissions.ts`,
  seeded from each module manifest's declared permissions plus kernel ones.
  Strings are `<module>.<verb>` ([conventions](../13-conventions.md)). No
  `Permission` table — the catalog is code, and a database copy of it is a
  second source of truth.
- **Roles are rows, through Better Auth's organization plugin with
  `dynamicAccessControl`.** Built-in role keys `owner`, `manager`, `staff`
  exist as static `roles` in the plugin config; anything a tenant creates is
  an `organizationRole` row holding its permission list. `owner` is
  immutable: its permissions cannot be edited, the role cannot be deleted,
  and the last owner cannot be removed or demoted.
- **One role per member.** `Member.role` holds a role key — static or custom.
  Stacking roles is a "later" decision.
- **Custom roles are a feature**: `roles.custom` gate plus a `roles.max`
  limit fed to `maximumRolesPerOrganization`, so a plan can sell the
  capability and its size.
- **Role management UI** lives in the tenant dashboard settings; the
  platform console shows roles read-only for support.

## Consequences
- Permission checks stay `(entitlement) AND (role permission)` — a custom
  role cannot grant what the plan does not include, because entitlements are
  resolved before the role's statement is consulted.
- `organizationRole` is a Better Auth-owned table: `identity` classification,
  created with the plugin's schema, never hand-migrated.
- Phase-1 task 1.3 (permissions map) becomes the registry + the static
  roles; the roles management page is its own task.

## Options considered
- **Fixed enum only:** simplest, fails the owner's requirement directly.
- **Role + Permission + RolePermission tables** (vnbca's shape): flexible,
  but splits the permission catalog between code and rows, and lets a
  permission exist in the database that no manifest declares.
- **ABAC/policy engine (Casbin etc.):** far more than role groups need.
