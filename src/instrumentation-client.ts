/**
 * Browser errors to Sentry (ADR 0017), only when NEXT_PUBLIC_SENTRY_DSN is
 * set. The SDK is loaded on demand, so a deployment without Sentry ships none
 * of it to the browser.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  void Promise.all([import("@sentry/nextjs"), import("@/platform/sentry")]).then(([Sentry, { scrubEvent }]) => {
    Sentry.init({
      dsn,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false, httpBodies: [] },
      tracesSampleRate: 0,
      beforeSend: (event) => scrubEvent(event),
      initialScope: { tags: { runtime: "browser" } },
    })
  })
}
