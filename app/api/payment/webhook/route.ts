import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { appendRegistration } from "@/lib/sheets";

// Razorpay sends webhooks as raw JSON. We must read the raw body first so the
// HMAC signature can be verified before we do anything with the data.
export async function POST(request: NextRequest) {
  console.log("🔔 WEBHOOK TRIGGERED - Webhook handler is running");
  const rawBody = await request.text();

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify HMAC-SHA256 signature using the raw body
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuf      = Buffer.from(signature,    "utf-8");
  const expectedBuf = Buffer.from(expectedSig,  "utf-8");

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  type WebhookPayload = {
    event: string;
    payload: {
      payment: {
        entity: {
          id: string;
          order_id: string;
          notes: Record<string, string>;
        };
      };
    };
  };

  const event = JSON.parse(rawBody) as WebhookPayload;

  // Acknowledge events we don't handle so Razorpay doesn't retry them
}