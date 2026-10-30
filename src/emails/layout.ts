/**
 * The shell every tenant email renders in (`notify.design` TenantSetting):
 * `plain` is the raw body; `branded` wraps it in a header with the business
 * name and a footer — the two designs the management page offers, like the
 * reference projects' email surfaces. */
export type EmailDesign = "plain" | "branded"
export const EMAIL_DESIGNS: EmailDesign[] = ["plain", "branded"]

export function wrapEmail(design: EmailDesign, business: string, bodyHtml: string): string {
  if (design !== "branded") return bodyHtml
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f4;font-family:system-ui,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e5e0;border-radius:8px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #e5e5e0;font-weight:600;font-size:15px">${business}</div>
    <div style="padding:24px;font-size:14px;line-height:1.6;color:#1a1a18">${bodyHtml}</div>
    <div style="padding:16px 24px;border-top:1px solid #e5e5e0;font-size:12px;color:#6b6b63">${business}</div>
  </div>
</body></html>`
}
