import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const TENANT = "intake-tenant"

describe("intake forms (15.1)", () => {
  beforeEach(resetDatabase)

  it("a form's fields validate answers; a response lands on the appointment", async () => {
    await db8.orm.public.Tenant.create({ id: TENANT, name: "Intake Co", slug: "intake", status: "ACTIVE" })
    const form = await db8.orm.public.IntakeForm.create({
      tenantId: TENANT,
      name: "Visit",
      fields: [
        { label: "Preferred pronouns", kind: "text", required: false },
        { label: "First visit?", kind: "checkbox", required: true },
      ],
    })
    const { intakeAnswerError } = await import("@/lib/intake")
    // A required checkbox missing → error.
    expect(intakeAnswerError(form.fields, {})).toBe("required:First visit?")
    // The answers pass → response can land.
    expect(intakeAnswerError(form.fields, { "First visit?": true })).toBeNull()

    const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
    const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })
    const appt = await db8.orm.public.Appointment.create({
      tenantId: TENANT,
      staffId: staff.id,
      customerId: customer.id,
      startTs: "2099-12-31T10:00:00.000Z",
      endTs: "2099-12-31T11:00:00.000Z",
      status: "confirmed",
    })
    const response = await db8.orm.public.IntakeResponse.create({
      tenantId: TENANT,
      formId: form.id,
      appointmentId: appt.id,
      customerId: customer.id,
      answers: { "Preferred pronouns": "she/her", "First visit?": true },
    })
    expect(response.appointmentId).toBe(appt.id)
    expect((response.answers as Record<string, unknown>)["First visit?"]).toBe(true)
  })
})
