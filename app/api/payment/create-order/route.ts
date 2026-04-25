import { NextResponse } from "next/server";
import razorpay from "@/lib/razorpay";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    const order = await razorpay.orders.create({
      amount: 100, // ₹1 in paise (test)
      currency: "INR",
      receipt: `tpl_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create payment order. Please try again." },
      { status: 500 }
    );
  }
}
