import { PageSkeleton } from "@/components/layout/page-skeleton"

/** Shown for the moment `/dashboard` takes to pick the tenant and redirect. */
export default function DashboardRedirectLoading() {
  return <PageSkeleton variant="cards" />
}
