import { LogoMark } from "@/components/logo"
import { siteConfig } from "@/config/site"
import { currentYear } from "@/lib/current-year"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * The sign-in pages (spec/adr/0021, Studio Admin's auth v2): the form on the
 * left, a brand panel on the right from `lg` up. The panel only carries the
 * deployment's own name and tagline (environment variables), never copy about
 * the kit.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh p-2 lg:grid-cols-2">
      <div className="relative flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <div className="relative hidden h-full flex-col justify-between rounded-3xl bg-primary p-10 text-primary-foreground lg:flex">
        <div className="space-y-3">
          <LogoMark className="h-10 w-10 rounded-xl ring-1 ring-primary-foreground/20" iconClassName="h-6 w-6" />
          <p className="text-2xl font-medium">{siteConfig.name}</p>
          <p className="max-w-md text-sm text-primary-foreground/80">{siteConfig.tagline}</p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          © {await currentYear()} {siteConfig.name}
        </p>
      </div>
    </main>
  )
}
