import Link from "next/link"
import type { Route } from "next"
import type { SiteData } from "@/themes/types"

/** The classic shell — a centered serif masthead, a thin double-rule frame. */
export default function ClassicLayout({ children, data }: { children: React.ReactNode; data: SiteData }) {
  return (
    <div className="min-h-screen bg-stone-50 font-serif text-stone-900">
      <header className="border-b-4 border-double border-stone-300 py-8 text-center">
        <p className="text-3xl font-bold tracking-wide">{data.settings.profile.name ?? data.tenant.name}</p>
        {data.settings.profile.tagline && (
          <p className="mt-1 text-sm text-stone-600 italic">{data.settings.profile.tagline}</p>
        )}
        <nav aria-label="Site" className="mt-4">
          <Link href={"/" as Route} className="text-sm tracking-widest uppercase underline-offset-4 hover:underline">
            Home
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
      <footer className="border-t border-stone-300 py-4 text-center text-xs text-stone-500">
        {data.settings.profile.address ?? data.tenant.name}
      </footer>
    </div>
  )
}
