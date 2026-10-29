import type { SiteData } from "@/themes/types"

/** The classic hero — a centered welcome, serif, no image. */
export default function HeroSection({ data }: { data: SiteData }) {
  return (
    <section className="py-10 text-center">
      <h1 className="text-4xl font-bold">{data.settings.profile.name ?? data.tenant.name}</h1>
      {data.settings.profile.tagline && (
        <p className="mt-3 text-lg text-stone-600 italic">{data.settings.profile.tagline}</p>
      )}
    </section>
  )
}
