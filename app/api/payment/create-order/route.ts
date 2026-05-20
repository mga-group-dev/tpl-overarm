import { NextRequest, NextResponse } from "next/server";
import razorpay from "@/lib/razorpay";
import { registrationSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData } = body;

    if (!formData) {
      return NextResponse.json(
        { error: "Registration data is required" },
        { status: 400 }
      );
    }

    // Validate form data before creating the order so we can safely store it in notes
    const parsed = registrationSchema.safeParse({
      ...formData,
      age: Number(formData.age),
      battingSkills: formData.battingSkills != null ? Number(formData.battingSkills) : undefined,
      bowlingSkills: formData.bowlingSkills != null ? Number(formData.bowlingSkills) : undefined,
      fieldingSkills: formData.fieldingSkills != null ? Number(formData.fieldingSkills) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration data" },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Store all registration fields in Razorpay order notes (max 15 key-value pairs,
    // 256 chars per value). The webhook endpoint reads these notes to record the
    // registration even when the user does not return to the page after payment.
    const notes: Record<string, string> = {
      rt:  d.registrationType,
      fn:  d.fullName,
      ag:  String(d.age),
      gn:  d.gender,
      cn:  d.contactNumber,
      co:  d.companyName,
      pe:  d.playingExpertise ?? "",
      bs:  d.battingSkills?.toString() ?? "",
      bw:  d.bowlingSkills?.toString() ?? "",
      fs:  d.fieldingSkills?.toString() ?? "",
      js:  d.jerseySize,
      jn:  d.jerseyNumber,
      jnm: d.jerseyName,
      pu:  d.photoUrl.slice(0, 256),
      cp:  d.cricheroProfile ?? "",
    };

    const order = await razorpay.orders.create({
      amount: 50000, // ₹500 in paise
      currency: "INR",
      receipt: `tpl_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      notes,
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
