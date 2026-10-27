"use client"

import { Copy, Download, LogIn, Pencil, UserCog, Users } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo, useTransition } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { setUserRole, setUserRoles, updateUser } from "@/app/actions/admin"
import { startSwitchAs } from "@/app/actions/switch-as"
import { DataTable, dataTableColumns, type BulkAction } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions, type RowAction } from "@/components/data-table/row-actions"
import { Badge } from "@/components/ui/badge"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { OptionSelect } from "@/components/form/option-select"
import { ASSIGNABLE_ROLES, ROLES, canChangeRole, canSwitchAs, isAdmin, type Role } from "@/lib/roles"
import { userSchema } from "@/lib/schemas/user"
import type { TableQuery } from "@/lib/table-query"
import { useDrawer } from "@/stores/drawer"

export type UserRow = {
  id: string
  name: string
  email: string
  image: string | null
  role: Role
  createdAt: string
  plan: string | null
  status: string | null
}

type Viewer = { id: string; role: Role }

const DRAWER = "admin-user"

export function UsersTable({
  rows,
  total,
  query,
  defaults,
  viewer,
}: {
  rows: UserRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  viewer: Viewer
}) {
  const t = useTranslations("admin.users")
  const format = useFormatter()
  const openDrawer = useDrawer((s) => s.open)
  const [, startTransition] = useTransition()

  const columns = useMemo(() => {
    const col = dataTableColumns<UserRow>()
    return col.columns([
      col.accessor("email", {
        header: t("colUser"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar image={row.original.image} name={row.original.name} email={row.original.email} />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{row.original.name || "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      }),
      col.accessor("plan", {
        header: t("colPlan"),
        cell: ({ row }) => <span className="text-sm">{row.original.plan ?? t("free")}</span>,
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ row }) =>
          row.original.status ? (
            <Badge variant={row.original.status === "ACTIVE" ? "success" : "secondary"}>{row.original.status}</Badge>
          ) : (
            <Badge variant="secondary">{t("free")}</Badge>
          ),
      }),
      col.accessor("role", {
        header: t("colRole"),
        cell: ({ row }) => (
          <Badge variant={isAdmin(row.original.role) ? "default" : "outline"}>{row.original.role}</Badge>
        ),
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("colJoined"),
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), "date")}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => {
          const user = row.original
          const actions: RowAction[] = [{ label: t("edit"), icon: Pencil, onSelect: () => openDrawer(DRAWER, user.id) }]
          if (canSwitchAs({ ...viewer, switched: false }, user)) {
            actions.push({
              label: t("switchAs"),
              icon: LogIn,
              onSelect: () => startTransition(() => startSwitchAs(user.id)),
            })
          }
          actions.push({
            label: t("copyEmail"),
            icon: Copy,
            onSelect: () => navigator.clipboard.writeText(user.email).then(() => toast.success(t("copied"))),
          })
          return <RowActions actions={actions} label={user.email} />
        },
      }),
    ])
  }, [t, format, viewer, openDrawer])

  const bulkActions: BulkAction[] = [
    {
      label: t("exportCsv"),
      icon: Download,
      run: async (ids) => downloadCsv(rows.filter((r) => ids.includes(r.id))),
    },
  ]
  if (viewer.role === "ROOT") {
    for (const role of ASSIGNABLE_ROLES) {
      bulkActions.push({
        label: t(`setRole.${role}`),
        icon: UserCog,
        confirm: {
          title: t("setRoleConfirm.title"),
          description: t(`setRoleConfirm.${role}`),
          confirmLabel: t(`setRole.${role}`),
        },
        run: (ids) => setUserRoles(ids, role),
      })
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        query={query}
        defaults={defaults}
        getRowId={(row) => row.id}
        sortable={["email", "createdAt"]}
        searchPlaceholder={t("search")}
        filters={[{ key: "role", label: t("colRole"), options: ROLES.map((role) => ({ value: role, label: role })) }]}
        bulkActions={bulkActions}
        empty={{ icon: Users, title: t("empty.title"), description: t("empty.description") }}
      />
      <EditUserDrawer rows={rows} viewer={viewer} />
    </>
  )
}

function EditUserDrawer({ rows, viewer }: { rows: UserRow[]; viewer: Viewer }) {
  const id = useDrawer((s) => s.id)
  const user = rows.find((r) => r.id === id)
  // Remounted per user, so the form starts from that user's values.
  return user ? <EditUserForm key={user.id} user={user} viewer={viewer} /> : null
}

function EditUserForm({ user, viewer }: { user: UserRow; viewer: Viewer }) {
  const t = useTranslations("admin.users")
  const te = useTranslations("errors")
  const schema = userSchema({ nameRequired: te("nameRequired"), nameTooLong: te("nameTooLong") })
  const form = useForm<{ name: string; role: Role }>({
    resolver: zodResolver(schema.extend({ role: schemaRole })),
    defaultValues: { name: user.name, role: user.role },
  })
  const roleEditable =
    user.id !== viewer.id &&
    ASSIGNABLE_ROLES.some((role) => role !== user.role && canChangeRole(viewer.role, user.role, role))

  return (
    <FormDrawer
      kind={DRAWER}
      title={t("drawer.title")}
      description={user.email}
      form={form}
      onSubmit={async ({ name, role }) => {
        const result = await updateUser(user.id, { name })
        if (result.error) return result
        if (roleEditable && role !== user.role) await setUserRole(user.id, role, user.role)
      }}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("drawer.name")}</FormLabel>
            <FormControl>
              <Input {...field} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("drawer.role")}</FormLabel>
            <FormControl>
              <OptionSelect
                value={field.value}
                onValueChange={field.onChange}
                options={(roleEditable ? ASSIGNABLE_ROLES : [user.role]).map((role) => ({ value: role, label: role }))}
                disabled={!roleEditable}
              />
            </FormControl>
            <FormDescription>{roleEditable ? t("drawer.roleHint") : t("drawer.roleLocked")}</FormDescription>
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}

/** The role field of the drawer; the server checks the change with `canChangeRole` again. */
const schemaRole = z.enum(ROLES)

function UserAvatar({ image, name, email }: { image: string | null; name: string; email: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="h-8 w-8 shrink-0 rounded-full" />
  ) : (
    <div
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
    >
      {(name || email)[0]?.toUpperCase()}
    </div>
  )
}

/** The selected rows as a CSV file, built in the browser from what is on screen. */
function downloadCsv(rows: UserRow[]) {
  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [
    "email,name,role,plan,status,joined",
    ...rows.map((r) => [r.email, r.name, r.role, r.plan ?? "", r.status ?? "", r.createdAt].map(esc).join(",")),
  ]
  const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" }))
  const link = Object.assign(document.createElement("a"), { href: url, download: "users.csv" })
  link.click()
  URL.revokeObjectURL(url)
}
