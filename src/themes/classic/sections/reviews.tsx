import type { SiteData } from "@/themes/types"

/** The classic reviews section — approved reviews, centered serif. */
export default function ReviewsSection({ data }: { data: SiteData }) {
  const reviews = data.reviews
  if (!reviews || reviews.length === 0) return null
  return (
    <section className="py-8">
      <h2 className="mb-4 text-center text-xl font-bold tracking-widest uppercase">What Customers Say</h2>
      <ul className="mx-auto max-w-md space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="text-center">
            <p className="text-lg font-semibold">{"★".repeat(r.rating)}</p>
            {r.body && <p className="text-sm text-stone-600 italic">&ldquo;{r.body}&rdquo;</p>}
            <p className="mt-1 text-sm text-stone-500">— {r.name}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
