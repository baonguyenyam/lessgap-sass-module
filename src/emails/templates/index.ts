/**
 * Email templates (task 5.6, spec/07): code, not database — a tenant's
 * override lives in `TenantSetting` (`notify.template.<key>.<locale>`), the
 * platform's defaults here, per locale. The platform name never appears in
 * tenant-to-customer messages. */
export type TemplateData = Record<string, string>
export type RenderedTemplate = { subject: string; html: string }
export type TemplateDef = { [locale: string]: (data: TemplateData) => RenderedTemplate }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const p = (lines: string[]) => `<p>${lines.join("<br/>")}</p>`

export const templates: Record<string, TemplateDef> = {
  "booking.confirmation": {
    en: (d) => ({
      subject: `Booking confirmed: ${d.service}`,
      html: p([
        `Hi ${esc(d.name)},`,
        `${esc(d.service)} with ${esc(d.staff)} at ${d.time}.`,
        `<a href="${d.manageUrl}">Manage your booking</a>`,
      ]),
    }),
    vi: (d) => ({
      subject: `Đã đặt lịch: ${d.service}`,
      html: p([
        `Chào ${esc(d.name)},`,
        `${esc(d.service)} với ${esc(d.staff)} lúc ${d.time}.`,
        `<a href="${d.manageUrl}">Quản lý cuộc hẹn</a>`,
      ]),
    }),
  },
  "booking.reminder": {
    en: (d) => ({
      subject: `Reminder: ${d.service} at ${d.time}`,
      html: p([
        `Hi ${esc(d.name)},`,
        `a reminder that ${esc(d.service)} is at ${d.time}.`,
        `<a href="${d.manageUrl}">Manage your booking</a>`,
      ]),
    }),
    vi: (d) => ({
      subject: `Nhắc lịch: ${d.service} lúc ${d.time}`,
      html: p([
        `Chào ${esc(d.name)},`,
        `nhắc bạn có ${esc(d.service)} lúc ${d.time}.`,
        `<a href="${d.manageUrl}">Quản lý cuộc hẹn</a>`,
      ]),
    }),
  },
  "booking.canceled": {
    en: (d) => ({
      subject: `Booking cancelled: ${d.service}`,
      html: p([`Hi ${esc(d.name)},`, `your ${esc(d.service)} booking at ${d.time} has been cancelled.`]),
    }),
    vi: (d) => ({
      subject: `Đã huỷ lịch: ${d.service}`,
      html: p([`Chào ${esc(d.name)},`, `cuộc hẹn ${esc(d.service)} lúc ${d.time} đã bị huỷ.`]),
    }),
  },
  "quotes.sent": {
    en: (d) => ({
      subject: `Your quote from ${d.business}`,
      html: p([
        `Hi ${esc(d.name)},`,
        `${esc(d.business)} priced your request — total ${d.totalCents}.`,
        `<a href="${d.acceptUrl}">View and accept your quote</a>`,
      ]),
    }),
    vi: (d) => ({
      subject: `Báo giá từ ${d.business}`,
      html: p([
        `Chào ${esc(d.name)},`,
        `${esc(d.business)} đã báo giá — tổng ${d.totalCents}.`,
        `<a href="${d.acceptUrl}">Xem và chấp nhận báo giá</a>`,
      ]),
    }),
  },
  "customer.export": {
    en: (d) => ({
      subject: "Your data export",
      html: p([`Hi ${esc(d.name)},`, `attached is the data ${esc(d.business)} holds about you.`]),
    }),
  },
}

/** The template keys every locale knows about. */
export const templateKeys = Object.keys(templates)
/** The locales each template ships. */
export const templateLocales = (key: string): string[] => Object.keys(templates[key] ?? {})
