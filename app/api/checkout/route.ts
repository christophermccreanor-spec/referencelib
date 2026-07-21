import { NextRequest, NextResponse } from "next/server";

// Full-membership checkout: R599/year via Paystack, using the account
// already live on Tamkeen Coaching (see planning/03-pricing-and-ai-cost-model.md).
// This route only initialises a transaction; Paystack redirects the student
// to their own hosted checkout page, so no card details ever touch this app.
//
// Before this works, set PAYSTACK_SECRET_KEY and PAYSTACK_PLAN_CODE in
// .env.local. The plan code comes from the Paystack dashboard once a R599/year
// plan is created there (Payments > Plans > Create plan). Never commit the
// secret key to any file.

const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const planCode = process.env.PAYSTACK_PLAN_CODE;

  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack is not configured yet. Set PAYSTACK_SECRET_KEY in .env.local." },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email) {
    return NextResponse.json({ error: "An email address is required." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    email,
    amount: 59900, // R599.00 in the smallest currency unit (cents).
    currency: "ZAR",
  };
  if (planCode) payload.plan = planCode;

  try {
    const res = await fetch(PAYSTACK_INIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.status) {
      return NextResponse.json({ error: data.message ?? "Paystack could not start the checkout." }, { status: 502 });
    }
    return NextResponse.json({ authorizationUrl: data.data.authorization_url });
  } catch (error) {
    console.error("[api/checkout]", error);
    return NextResponse.json({ error: "Could not reach Paystack. Please try again shortly." }, { status: 502 });
  }
}
