import type { SiteData } from "@/themes/types"

export default function HeroSection({ data }: { data: SiteData }) {
  const { name, tagline } = data.settings.profile
  return (
    <section className="py-10 text-center">
      <h1 className="text-4xl font-bold">{name ?? data.tenant.name}</h1>
      {tagline && <p className="mt-3 text-lg text-slate-600">{tagline}</p>}
    </section>
  )
}
