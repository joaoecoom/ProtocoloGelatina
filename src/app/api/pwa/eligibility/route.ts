import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

function hasPaidSignalInSubscriptions(subs: Array<{ status?: string | null }>) {
  // Active/trialing/past_due/unpaid/canceled all indicate there was at least one checkout flow.
  return subs.some((s) =>
    ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete"].includes(s.status ?? ""),
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ canInstall: false }, { status: 401 });
  }

  if (user.isSuperAdmin) {
    return NextResponse.json({ canInstall: true }, { status: 200 });
  }

  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: user.email.toLowerCase(), limit: 10 });
    if (customers.data.length === 0) {
      return NextResponse.json({ canInstall: false }, { status: 200 });
    }

    for (const c of customers.data) {
      const customerId = c.id;
      const [subs, paymentIntents] = await Promise.all([
        stripe.subscriptions.list({ customer: customerId, limit: 5 }),
        stripe.paymentIntents.list({ customer: customerId, limit: 10 }),
      ]);

      if (hasPaidSignalInSubscriptions(subs.data)) {
        return NextResponse.json({ canInstall: true }, { status: 200 });
      }

      if (paymentIntents.data.some((pi) => pi.status === "succeeded")) {
        return NextResponse.json({ canInstall: true }, { status: 200 });
      }
    }
  } catch (e) {
    console.error("[api/pwa/eligibility]", e);
  }

  return NextResponse.json({ canInstall: false }, { status: 200 });
}
