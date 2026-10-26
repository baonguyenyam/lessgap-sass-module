# 0004. Vercel for Platforms for subdomains and custom domains

**Status:** proposed
**Date:** 2026-10-26

## Context
Each tenant needs `<slug>.<sites-domain>` and optionally its own domain with
HTTPS. The kit already deploys to Vercel. Vercel for Platforms supports
wildcard domains (with Vercel nameservers or delegated validation), adding
custom domains by API with automatic certificates, unlimited custom domains
on Pro with a soft limit of 100,000 per project, and rate limits of 100
domain additions and 50 verifications per hour per team.

## Decision
Host on Vercel. Sites apex on Vercel nameservers with a wildcard domain.
Custom domains added and verified through the Vercel SDK, from one wrapper in
`src/platform/domains/vercel.ts`. Tenant sites use a separate apex from the
dashboard and that apex goes to the Public Suffix List.

## Consequences
- No certificate management on our side.
- Rate limits shape the verification job and the "Check now" button.
- Moving hosts later means replacing one wrapper and re-pointing DNS.

## Options considered
- **Cloudflare for SaaS (custom hostnames) in front of any host:** strong, and a
  good fallback if we leave Vercel; adds a second provider today.
- **Self-managed proxy with Caddy on-demand TLS:** cheapest per domain,
  operational burden we do not want.
- **DigitalOcean App Platform (used by platform.madelab.io):** workable, but the
  kit already deploys to Vercel and Vercel documents this exact multi-tenant
  workflow (wildcard, domain API, verification).
