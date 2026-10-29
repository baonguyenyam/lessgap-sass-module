import type { SiteData } from "@/themes/types"
import HeroSection from "@/themes/classic/sections/hero"
import HoursSection from "@/themes/classic/sections/hours"
import ServicesSection from "@/themes/classic/sections/services"
import TeamSection from "@/themes/classic/sections/team"

export default function HomePage({ data }: { data: SiteData }) {
  return (
    <>
      <HeroSection data={data} />
      <ServicesSection data={data} />
      <TeamSection data={data} />
      <HoursSection data={data} />
      <section className="py-6 text-center text-sm text-stone-600">
        {data.settings.profile.phone && <p>{data.settings.profile.phone}</p>}
        {data.settings.profile.email && <p>{data.settings.profile.email}</p>}
        {data.settings.profile.address && <p>{data.settings.profile.address}</p>}
      </section>
    </>
  )
}
