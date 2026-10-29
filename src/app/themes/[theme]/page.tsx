import { notFound } from "next/navigation"
import { resolveTheme } from "@/themes/registry"
import { themeFixtures } from "@/themes/fixtures"

/** A theme's fixture render (spec/11 D8): the shared theme's full SiteData
 * without a tenant — used by the axe spec and for visual review. */
export default async function ThemeFixturePage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme: key } = await params
  const data = themeFixtures[key]
  if (!data) notFound()
  const theme = resolveTheme(key)
  const Page = theme.pages["home"] ?? Object.values(theme.pages)[0]
  const Layout = theme.layout
  return (
    <Layout data={data}>
      <Page data={data} />
    </Layout>
  )
}
