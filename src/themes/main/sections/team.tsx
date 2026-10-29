import type { SiteData } from "@/themes/types"

/** The team's staff section (task 4.3): the people the site shows — rendered
 * from `SiteData.team`, present when the module is enabled. */
export default function TeamSection({ data }: { data: SiteData }) {
  const team = data.team
  if (!team || team.length === 0) return null
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="mb-4 text-2xl font-bold">Our Team</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {team.map((m) => (
          <div key={m.id} className="rounded-lg border p-4">
            <p className="font-medium">{m.name}</p>
            {m.bio && <p className="mt-1 text-sm text-muted-foreground">{m.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
