import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { db8 } from "@/lib/db8"

export async function POST() {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db8.orm.public.User.select("stripeCustomerId").where({ id: currentUser.id }).first()

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
