/** `Job.status` values (spec/16-operations.md). */
export const JOB_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

/** `EmailMessage.status` values (spec/16-operations.md, "Email outbox"). */
export const EMAIL_STATUSES = ["QUEUED", "SENT", "REFUSED", "FAILED"] as const
export type EmailStatus = (typeof EMAIL_STATUSES)[number]
