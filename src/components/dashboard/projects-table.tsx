"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useFormatter, useNow, useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { deleteProjects, saveProject } from "@/app/actions/projects"
import { DataTable, dataTableColumns, type BulkAction } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions } from "@/components/data-table/row-actions"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PROJECT_DESCRIPTION_MAX, PROJECT_NAME_MAX, projectSchema, type ProjectInput } from "@/lib/schemas/project"
import type { TableQuery } from "@/lib/table-query"
import { useDrawer } from "@/stores/drawer"

export type ProjectRow = { id: string; name: string; description: string | null; createdAt: string; updatedAt: string }

const DRAWER = "project"

export function ProjectsTable({
  rows,
  total,
  query,
  defaults,
}: {
  rows: ProjectRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
}) {
  const t = useTranslations("dashboard.projects")
  const format = useFormatter()
  // A clock next-intl owns, so "2 minutes ago" is the same on the server and in the browser.
  const now = useNow({ updateInterval: 60_000 })
  const router = useRouter()
  const openDrawer = useDrawer((s) => s.open)

  const deleteConfirm = {
    title: t("deleteConfirm.title"),
    description: t("deleteConfirm.description"),
    confirmLabel: t("delete"),
  }

  const columns = useMemo(() => {
    const col = dataTableColumns<ProjectRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/dashboard/projects/${row.original.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{row.original.description || t("noDescription")}</p>
          </div>
        ),
      }),
      col.accessor("updatedAt", {
        id: "updatedAt",
        header: t("colUpdated"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.relativeTime(new Date(row.original.updatedAt), now)}
          </span>
        ),
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("colCreated"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), "date")}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => (
          <RowActions
            label={row.original.name}
            actions={[
              { label: t("open"), onSelect: () => router.push(`/dashboard/projects/${row.original.id}`) },
              { label: t("edit"), onSelect: () => openDrawer(DRAWER, row.original.id) },
              {
                label: t("delete"),
                variant: "destructive",
                confirm: deleteConfirm,
                run: () => deleteProjects([row.original.id]),
              },
            ]}
          />
        ),
      }),
    ])
  }, [t, format, now, router, openDrawer]) // eslint-disable-line react-hooks/exhaustive-deps

  const bulkActions: BulkAction[] = [
    { label: t("delete"), variant: "destructive", confirm: deleteConfirm, run: (ids) => deleteProjects(ids) },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        query={query}
        defaults={defaults}
        getRowId={(row) => row.id}
        sortable={["name", "updatedAt", "createdAt"]}
        searchPlaceholder={t("searchPlaceholder")}
        bulkActions={bulkActions}
        emptyMessage={query.q ? t("noResultsBody", { query: query.q }) : t("emptyBody")}
        actions={
          <Button onClick={() => openDrawer(DRAWER)}>
            <Plus className="h-4 w-4" />
            {t("newTitle")}
          </Button>
        }
      />
      <ProjectDrawer rows={rows} />
    </>
  )
}

function ProjectDrawer({ rows }: { rows: ProjectRow[] }) {
  const id = useDrawer((s) => s.id)
  const kind = useDrawer((s) => s.kind)
  if (kind !== DRAWER) return null
  const project = id ? rows.find((r) => r.id === id) : null
  // Remounted per record, so the form starts from its values.
  return <ProjectForm key={id ?? "new"} project={project ?? null} />
}

function ProjectForm({ project }: { project: ProjectRow | null }) {
  const t = useTranslations("dashboard.projects")
  const te = useTranslations("errors")
  const schema = projectSchema({
    nameRequired: te("nameRequired"),
    nameTooLong: te("nameTooLong"),
    descriptionTooLong: te("descriptionTooLong"),
  })
  const form = useForm<ProjectInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: project?.name ?? "", description: project?.description ?? "" },
  })

  return (
    <FormDrawer
      kind={DRAWER}
      title={project ? t("editTitle") : t("newTitle")}
      description={project ? project.name : t("newDescription")}
      form={form}
      onSubmit={(values) => saveProject(project?.id ?? null, values)}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("colName")}</FormLabel>
            <FormControl>
              <Input {...field} maxLength={PROJECT_NAME_MAX} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("description")}</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} maxLength={PROJECT_DESCRIPTION_MAX} rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}
