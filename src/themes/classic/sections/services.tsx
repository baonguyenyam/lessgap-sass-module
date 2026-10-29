import type { SiteData } from "@/themes/types"

/** The classic services section — services in a bordered list, leader dots. */
export default function ServicesSection({ data }: { data: SiteData }) {
  const catalog = data.catalog
  if (!catalog || catalog.services.length === 0) return null
  const price = (s: { priceCents: number; currency: string }) =>
    `${(s.priceCents / 100).toFixed(0)} ${s.currency.toUpperCase()}`
  return (
    <section className="py-8">
      <h2 className="mb-4 text-center text-xl font-bold tracking-widest uppercase">Services</h2>
      {catalog.categories.map((c) => {
        const services = catalog.services.filter((s) => s.categoryId === c.id)
        if (services.length === 0) return null
        return (
          <div key={c.id} className="mb-6">
            <h3 className="border-b border-stone-300 pb-1 text-center text-lg font-semibold">{c.name}</h3>
            {services.map((s) => (
              <div key={s.id} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                <span>{s.name}</span>
                <span className="flex-1 border-b border-dotted border-stone-300" aria-hidden />
                <span>{price(s)}</span>
              </div>
            ))}
          </div>
        )
      })}
      {catalog.services
        .filter((s) => !s.categoryId)
        .map((s) => (
          <div key={s.id} className="flex items-baseline justify-between gap-2 py-2 text-sm">
            <span>{s.name}</span>
            <span className="flex-1 border-b border-dotted border-stone-300" aria-hidden />
            <span>{price(s)}</span>
          </div>
        ))}
    </section>
  )
}
