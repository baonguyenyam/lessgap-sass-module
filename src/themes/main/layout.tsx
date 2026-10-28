import Link from "next/link"
import type { Route } from "next"
import type { SiteData } from "@/themes/types"

/** The site shell — header with the business name, a minimal footer. */
export default function MainLayout({ children, data }: { children: React.ReactNode; data: SiteData }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-xl font-semibold">{data.settings.profile.name ?? data.tenant.name}</span>
          <nav aria-label="Site">
            <Link href={"/" as Route} className="text-sm underline">
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <footer className="border-t px-6 py-4 text-center text-sm text-slate-500">
        {data.settings.profile.address ?? data.tenant.name}
      </footer>
    </div>
  )
}
