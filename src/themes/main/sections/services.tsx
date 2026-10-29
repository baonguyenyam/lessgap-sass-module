import type { SiteData } from "@/themes/types"

/** The catalog's services section (task 4.2): services grouped by category —
 * rendered from `SiteData.catalog`, present when the module is enabled. */
export default function ServicesSection({ data }: { data: SiteData }) {
  const catalog = data.catalog
  if (!catalog || catalog.services.length === 0) return null
  const byCategory = catalog.categories.map((c) => ({
    ...c,
    services: catalog.services.filter((s) => s.categoryId === c.id),
  }))
  const uncategorized = catalog.services.filter((s) => !s.categoryId)
  const price = (s: { priceCents: number; currency: string }) =>
    `${(s.priceCents / 100).toFixed(0)} ${s.currency.toUpperCase()}`
  const row = (s: (typeof catalog.services)[number]) => (
    <div key={s.id} className="flex items-baseline justify-between border-b py-2 last:border-0">
      <div>
        <p className="font-medium">{s.name}</p>
        {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
      </div>
      <p className="text-sm">
        {s.durationMinutes} min · {price(s)}
      </p>
    </div>
  )
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="mb-4 text-2xl font-bold">Services</h2>
      {byCategory
        .filter((c) => c.services.length > 0)
        .map((c) => (
          <div key={c.id} className="mb-4">
            <h3 className="text-lg font-semibold">{c.name}</h3>
            {c.services.map(row)}
          </div>
        ))}
      {uncategorized.length > 0 && <div>{uncategorized.map(row)}</div>}
    </section>
  )
}
