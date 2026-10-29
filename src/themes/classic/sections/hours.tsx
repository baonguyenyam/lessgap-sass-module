import type { SiteData } from "@/themes/types"

/** The classic hours section — a centered, thin-bordered table. */
export default function HoursSection({ data }: { data: SiteData }) {
  const hours = data.settings.hours
  const entries = Object.entries(hours)
  if (entries.length === 0) return null
  return (
    <section className="py-8">
      <h2 className="mb-4 text-center text-xl font-bold tracking-widest uppercase">Hours</h2>
      <dl className="mx-auto max-w-xs divide-y divide-stone-200 border border-stone-300">
        {entries.map(([day, time]) => (
          <div key={day} className="flex justify-between px-4 py-2 text-sm">
            <dt className="capitalize">{day}</dt>
            <dd>{time}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
