"use server"

import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { revalidatePath } from "next/cache"

export async function dismissOnboarding() {
  const user = await getCurrentUser()
  if (!user) return

  await db8.orm.public.User.where({ id: user.id }).update({ onboardingDismissedAt: nowTs() })

  revalidatePath("/t/[slug]", "page")
}
