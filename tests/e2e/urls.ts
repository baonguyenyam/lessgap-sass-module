/**
 * Where signing in or up lands: `/dashboard` redirects to the tenant's home,
 * `/t/<slug>` (phase 1, task 1.7). Wait for this, not for `/dashboard`.
 */
export const TENANT_HOME = /\/t\/[a-z0-9]+(?:-[a-z0-9]+)*$/
