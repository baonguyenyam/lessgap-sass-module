import type { SiteData } from "@/themes/types"
import HeroSection from "@/themes/main/sections/hero"
import HoursSection from "@/themes/main/sections/hours"
import ServicesSection from "@/themes/main/sections/services"

export default function HomePage({ data }: { data: SiteData }) {
  return (
    <>
      <HeroSection data={data} />
      <ServicesSection data={data} />
      <HoursSection data={data} />
      <section className="py-6">
        <h2 className="text-lg font-semibold">Contact</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {data.settings.profile.phone && <li>{data.settings.profile.phone}</li>}
          {data.settings.profile.email && <li>{data.settings.profile.email}</li>}
          {data.settings.profile.address && <li>{data.settings.profile.address}</li>}
        </ul>
      </section>
    </>
  )
}
