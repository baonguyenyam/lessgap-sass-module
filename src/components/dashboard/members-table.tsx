"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { UserCheck, UserCog, UserMinus, UserPlus, Users, UserX } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { inviteMember, removeMembers, setMemberRole, setMembersSuspended } from "@/app/actions/members"
import { DataTable, dataTableColumns, type BulkAction, type TableHeading } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions } from "@/components/data-table/row-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { OptionSelect } from "@/components/form/option-select"
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/schemas/tenant"
import type { TableQuery } from "@/lib/table-query"
import { useDrawer } from "@/stores/drawer"
import { StatusBadge } from "@/components/data-table/status-badge"
import { Ban, CircleCheck } from "lucide-react"

export type MemberRow = {
  id: string
  userId: string
  name: string
  email: string
  role: string
  status: "active" | "suspended"
  createdAt: string
  lastActiveAt: string | null
}

const INVITE = "member-invite"
const ROLE = "member-role"

type Props = {
  rows: MemberRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  roleOptions: string[]
  /** The roles the viewer may hand out (only an owner grants `owner`). */
  grantableRoles: string[]
  canManage: boolean
  canInvite: boolean
  viewerUserId: string
}

export function MembersTable({
  heading,
  rows,
  total,
  query,
  defaults,
  roleOptions,
  grantableRoles,
  canManage,
  canInvite,
  viewerUserId,
}: { heading?: TableHeading } & Props) {
  const t = useTranslations("dashboard.members")
  const format = useFormatter()
  const openDrawer = useDrawer((s) => s.open)

  const removeConfirm = {
    title: t("removeConfirm.title"),
    description: t("removeConfirm.description"),
    confirmLabel: t("list.remove"),
  }
  const suspendConfirm = {
    title: t("suspendConfirm.title"),
    description: t("suspendConfirm.description"),
    confirmLabel: t("list.suspend"),
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
      col.accessor("status", {
        header: t("list.colStatus"),
        cell: ({ row }) => (
          <StatusBadge
            tone={row.original.status === "suspended" ? "danger" : "success"}
            icon={row.original.status === "suspended" ? Ban : CircleCheck}
          >
            {t(`list.status.${row.original.status}`)}
          </StatusBadge>
        ),
      }),
      col.accessor("lastActiveAt", {
        header: t("list.colLastActive"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {row.original.lastActiveAt ? format.relativeTime(new Date(row.original.lastActiveAt)) : t("list.never")}
          </span>
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
                { label: t("list.changeRole"), icon: UserCog, onSelect: () => openDrawer(ROLE, row.original.id) },
                ...(row.original.role === "owner"
                  ? []
                  : row.original.status === "suspended"
                    ? [
                        {
                          label: t("list.reactivate"),
                          icon: UserCheck,
                          run: () => setMembersSuspended([row.original.id], false),
                        },
                      ]
                    : [
                        {
                          label: t("list.suspend"),
                          icon: UserX,
                          confirm: suspendConfirm,
                          run: () => setMembersSuspended([row.original.id], true),
                        },
                      ]),
                {
                  label: t("list.remove"),
                  icon: UserMinus,
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
    ? [
        { label: t("list.reactivate"), icon: UserCheck, run: (ids) => setMembersSuspended(ids, false) },
        {
          label: t("list.suspend"),
          icon: UserX,
          confirm: suspendConfirm,
          run: (ids) => setMembersSuspended(ids, true),
        },
        {
          label: t("list.remove"),
          icon: UserMinus,
          variant: "destructive",
          confirm: removeConfirm,
          run: (ids) => removeMembers(ids),
        },
      ]
    : []

  return (
    <>
      <DataTable
        heading={heading}
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
        empty={{
          icon: Users,
          title: t("list.empty.title"),
          description: t("list.empty.description"),
          action: canInvite ? (
            <Button onClick={() => openDrawer(INVITE)}>
              <UserPlus />
              {t("invite.title")}
            </Button>
          ) : undefined,
        }}
        actions={
          canInvite ? (
            <Button onClick={() => openDrawer(INVITE)}>
              <UserPlus className="h-4 w-4" />
              {t("invite.title")}
            </Button>
          ) : null
        }
      />
      {canInvite && <InviteDrawer roleOptions={grantableRoles} />}
      {canManage && <RoleDrawer rows={rows} roleOptions={grantableRoles} />}
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
    <FormControl>
      <OptionSelect
        value={value}
        onValueChange={onChange}
        options={roleOptions.map((role) => ({ value: role, label: role }))}
      />
    </FormControl>
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
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-3">
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
      </div>
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
      size="sm"
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
