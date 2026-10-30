import { getTranslations } from "next-intl/server"
import { requirePlatformRole } from "@/platform/staff"
import { moduleRegistry } from "@/modules/registry"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { PackageOpen } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * The module catalog (task 2.10, spec/15): every registered module, its stage
 * and version. Per-tenant operations — enable, disable, export, delete — run
 * on the tenant's own Settings → Modules page or from the tenant detail.
 */
export default async function PlatformModulesPage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.modules")
  const modules = Object.entries(moduleRegistry)

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {modules.length === 0 ? (
        <EmptyState icon={PackageOpen} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.key")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.stage")}</TableHead>
              <TableHead>{t("columns.version")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map(([key, m]) => (
              <TableRow key={key}>
                <TableCell className="font-mono text-sm">{key}</TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>
                  <Badge variant={m.stage === "stable" ? "default" : "secondary"}>{m.stage}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{m.version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
import { PageHeader } from "@/components/layout/page-header"
