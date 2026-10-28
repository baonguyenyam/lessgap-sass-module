import * as Sentry from "@sentry/nextjs"
import { scrubEvent } from "@/platform/sentry"

// Server runtime (ADR 0017). Loaded by `src/instrumentation.ts` only when
// SENTRY_DSN is set. No tracing, no data collection; `scrubEvent` drops the
// request, the user and every tag but the allowed ones.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Nothing about the person or the request leaves the app (ADR 0017);
  // `scrubEvent` below is the second line.
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false, httpBodies: [] },
  tracesSampleRate: 0,
  beforeSend: (event) => scrubEvent(event),
  initialScope: { tags: { runtime: "nodejs" } },
})
