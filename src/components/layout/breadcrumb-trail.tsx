import type { Route } from "next"
import * as React from "react"
import Link from "next/link"
import type { Crumb } from "@/lib/breadcrumb"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/**
 * A breadcrumb trail on the stock shadcn parts. The last entry is the current
 * page and is not a link. Pages build the trail once, with `breadcrumbJsonLd`
 * from the same value, so the row on screen and the BreadcrumbList in the
 * markup cannot describe different paths.
 */
export function BreadcrumbTrail({ trail, className }: { trail: Crumb[]; className?: string }) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1
          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href as Route}>{crumb.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
