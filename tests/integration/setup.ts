import { config } from "dotenv"

config({ path: [".env.local", ".env"], quiet: true })

function requiredTestDatabaseUrl(): string {
  const value = process.env["DATABASE_URL_TEST"]
  if (!value) throw new Error("DATABASE_URL_TEST is required to run integration tests.")
  return value
}

process.env["DATABASE_URL"] = requiredTestDatabaseUrl()
