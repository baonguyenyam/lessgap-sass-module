import * as Sentry from "@sentry/nextjs"
import { scrubEvent } from "@/platform/sentry"

// Edge runtime (the proxy). Same rules as the server config.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Nothing about the person or the request leaves the app (ADR 0017);
  // `scrubEvent` below is the second line.
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false, httpBodies: [] },
  tracesSampleRate: 0,
  beforeSend: (event) => scrubEvent(event),
  initialScope: { tags: { runtime: "edge" } },
})
