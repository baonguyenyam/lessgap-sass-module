import type { SiteData } from "@/themes/types"

/** The classic team section — staff in a centered serif list. */
export default function TeamSection({ data }: { data: SiteData }) {
  const team = data.team
  if (!team || team.length === 0) return null
  return (
    <section className="py-8">
      <h2 className="mb-4 text-center text-xl font-bold tracking-widest uppercase">Our Team</h2>
      <ul className="mx-auto max-w-md space-y-4">
        {team.map((m) => (
          <li key={m.id} className="text-center">
            <p className="text-lg font-semibold">{m.name}</p>
            {m.bio && <p className="text-sm text-stone-600 italic">{m.bio}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
