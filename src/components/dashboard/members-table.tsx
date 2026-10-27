"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { UserPlus } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { inviteMember, removeMembers, setMemberRole } from "@/app/actions/members"
import { DataTable, dataTableColumns, type BulkAction } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions } from "@/components/data-table/row-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/schemas/tenant"
import type { TableQuery } from "@/lib/table-query"
import { useDrawer } from "@/stores/drawer"

export type MemberRow = { id: string; userId: string; name: string; email: string; role: string; createdAt: string }

const INVITE = "member-invite"
const ROLE = "member-role"

type Props = {
  rows: MemberRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  roleOptions: string[]
  canManage: boolean
  viewerUserId: string
}

export function MembersTable({ rows, total, query, defaults, roleOptions, canManage, viewerUserId }: Props) {
  const t = useTranslations("dashboard.members")
  const format = useFormatter()
  const openDrawer = useDrawer((s) => s.open)

  const removeConfirm = {
    title: t("removeConfirm.title"),
    description: t("removeConfirm.description"),
    confirmLabel: t("list.remove"),
  }

  const columns = useMemo(() => {
    const col = dataTableColumns<MemberRow>()
    return col.columns([
      col.accessor("email", {
        header: t("list.colMember"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.original.name || "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      }),
      col.accessor("role", {
        id: "role",
        header: t("list.colRole"),
        cell: ({ row }) => (
          <Badge variant={row.original.role === "owner" ? "default" : "outline"}>{row.original.role}</Badge>
        ),
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("list.colJoined"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), "date")}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("list.colActions")}</span>,
        cell: ({ row }) =>
          canManage && row.original.userId !== viewerUserId ? (
            <RowActions
              label={row.original.email}
              actions={[
                { label: t("list.changeRole"), onSelect: () => openDrawer(ROLE, row.original.id) },
                {
                  label: t("list.remove"),
                  variant: "destructive",
                  confirm: removeConfirm,
                  run: () => removeMembers([row.original.id]),
                },
              ]}
            />
          ) : null,
      }),
    ])
  }, [t, format, canManage, viewerUserId, openDrawer]) // eslint-disable-line react-hooks/exhaustive-deps

  const bulkActions: BulkAction[] = canManage
    ? [{ label: t("list.remove"), variant: "destructive", confirm: removeConfirm, run: (ids) => removeMembers(ids) }]
    : []

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        query={query}
        defaults={defaults}
        getRowId={(row) => row.id}
        sortable={["role", "createdAt"]}
        searchPlaceholder={t("list.search")}
        filters={[{ key: "role", label: t("list.colRole"), options: roleOptions.map((r) => ({ value: r, label: r })) }]}
        bulkActions={bulkActions}
        emptyMessage={t("list.empty")}
        actions={
          canManage ? (
            <Button onClick={() => openDrawer(INVITE)}>
              <UserPlus className="h-4 w-4" />
              {t("invite.title")}
            </Button>
          ) : null
        }
      />
      {canManage && <InviteDrawer roleOptions={roleOptions} />}
      {canManage && <RoleDrawer rows={rows} roleOptions={roleOptions} />}
    </>
  )
}

function RoleSelect({
  value,
  onChange,
  roleOptions,
}: {
  value: string
  onChange: (value: string) => void
  roleOptions: string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <FormControl>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {roleOptions.map((role) => (
          <SelectItem key={role} value={role}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function InviteDrawer({ roleOptions }: { roleOptions: string[] }) {
  const t = useTranslations("dashboard.members")
  const te = useTranslations("dashboard.members.errors")
  const open = useDrawer((s) => s.kind === INVITE)
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema({ invalidEmail: te("invalidEmail"), roleRequired: te("roleRequired") })),
    defaultValues: { email: "", role: "staff" },
  })
  if (!open) return null

  return (
    <FormDrawer
      kind={INVITE}
      title={t("invite.title")}
      description={t("invite.description")}
      form={form}
      onSubmit={inviteMember}
    >
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("invite.email")}</FormLabel>
            <FormControl>
              <Input {...field} type="email" placeholder={t("invite.emailPlaceholder")} autoComplete="off" />
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
            <FormLabel>{t("list.colRole")}</FormLabel>
            <RoleSelect value={field.value} onChange={field.onChange} roleOptions={roleOptions} />
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}

function RoleDrawer({ rows, roleOptions }: { rows: MemberRow[]; roleOptions: string[] }) {
  const kind = useDrawer((s) => s.kind)
  const id = useDrawer((s) => s.id)
  const member = kind === ROLE ? rows.find((r) => r.id === id) : undefined
  return member ? <RoleForm key={member.id} member={member} roleOptions={roleOptions} /> : null
}

const roleSchema = z.object({ role: z.string().min(1) })

function RoleForm({ member, roleOptions }: { member: MemberRow; roleOptions: string[] }) {
  const t = useTranslations("dashboard.members")
  const form = useForm<{ role: string }>({ resolver: zodResolver(roleSchema), defaultValues: { role: member.role } })

  return (
    <FormDrawer
      kind={ROLE}
      title={t("list.changeRole")}
      description={member.email}
      form={form}
      onSubmit={({ role }) => setMemberRole(member.id, role)}
    >
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("list.colRole")}</FormLabel>
            <RoleSelect value={field.value} onChange={field.onChange} roleOptions={roleOptions} />
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}
