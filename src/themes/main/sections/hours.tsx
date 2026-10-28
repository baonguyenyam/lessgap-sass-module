import type { SiteData } from "@/themes/types"

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

export default function HoursSection({ data }: { data: SiteData }) {
  const entries = DAYS.map((d) => ({ day: d, value: data.settings.hours[d] }))
  if (entries.every((e) => !e.value || e.value === "closed")) return null
  return (
    <section className="py-6">
      <h2 className="text-lg font-semibold">Hours</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {entries.map(({ day, value }) => (
          <div key={day} className="flex justify-between border-b pb-1">
            <dt className="capitalize">{day}</dt>
            <dd>{!value || value === "closed" ? "Closed" : value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
