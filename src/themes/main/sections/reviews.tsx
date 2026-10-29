import type { SiteData } from "@/themes/types"

/** The approved reviews (task 11.2/11.3): `SiteData.reviews`, shown only
 * when `moderateReview` has published them. */
export default function ReviewsSection({ data }: { data: SiteData }) {
  const reviews = data.reviews
  if (!reviews || reviews.length === 0) return null
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="mb-4 text-2xl font-bold">What Customers Say</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border p-4">
            <p className="font-medium">{"★".repeat(r.rating)}</p>
            {r.body && <p className="mt-1 text-sm text-muted-foreground">&ldquo;{r.body}&rdquo;</p>}
            <p className="mt-1 text-sm text-muted-foreground">— {r.name}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
