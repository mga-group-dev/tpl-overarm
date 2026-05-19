import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { appendRegistration } from "@/lib/sheets";
import { registrationSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      formData,
    } = body;

    // Validate presence of required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !formData) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Payment configuration error" },
        { status: 500 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(generatedSignature, "utf-8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf-8");

    if (
      signatureBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // Validate form data against schema
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

    const data = parsed.data;
    const isPlayer = data.registrationType === "Player";
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Append to Google Sheets via Apps Script Web App
    await appendRegistration([
      timestamp,
      data.registrationType,
      data.fullName,
      String(data.age),
      data.gender,
      data.contactNumber,
      data.companyName,
      isPlayer ? (data.playingExpertise ?? "") : "",
      isPlayer ? (data.battingSkills?.toString() ?? "") : "",
      isPlayer ? (data.bowlingSkills?.toString() ?? "") : "",
      isPlayer ? (data.fieldingSkills?.toString() ?? "") : "",
      data.jerseySize,
      data.jerseyNumber,
      data.jerseyName,
      data.photoUrl,
      isPlayer ? (data.cricheroProfile ?? "") : "",
      razorpay_payment_id,
      razorpay_order_id,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please contact support." },
      { status: 500 }
    );
  }
}
