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
      isFreeRegistration = false,
    } = body;

    // =========================================
    // FREE REGISTRATION FLOW
    // =========================================

    if (isFreeRegistration) {
      if (!formData) {
        return NextResponse.json(
          { error: "Missing registration data" },
          { status: 400 }
        );
      }

      // Validate form data
      const parsed =
        registrationSchema.safeParse({
          ...formData,

          age: Number(formData.age),

          battingSkills:
            formData.battingSkills != null
              ? Number(formData.battingSkills)
              : undefined,

          bowlingSkills:
            formData.bowlingSkills != null
              ? Number(formData.bowlingSkills)
              : undefined,

          fieldingSkills:
            formData.fieldingSkills != null
              ? Number(formData.fieldingSkills)
              : undefined,
        });

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid registration data" },
          { status: 400 }
        );
      }

      const data = parsed.data;

      const isPlayer =
        data.registrationType === "Player";

      const timestamp =
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

      // Store FREE registration only
      await appendRegistration([
        timestamp,
        data.registrationType,
        data.fullName,
        String(data.age),
        data.gender,
        data.contactNumber,
        data.companyName ?? "",
        isPlayer
          ? data.playingExpertise ?? ""
          : "",
        isPlayer
          ? data.battingSkills?.toString() ??
              ""
          : "",
        isPlayer
          ? data.bowlingSkills?.toString() ??
              ""
          : "",
        isPlayer
          ? data.fieldingSkills?.toString() ??
              ""
          : "",
        data.jerseySize,
        data.jerseyNumber,
        data.jerseyName,
        data.photoUrl,
        isPlayer
          ? data.cricheroProfile ?? ""
          : "",
        "", // payment id
        "", // order id
        "Free",
        data.teamName ?? "",
      ]);

      return NextResponse.json({
        success: true,
      });
    }

    // =========================================
    // PAID REGISTRATION FLOW
    // =========================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { error: "Missing payment fields" },
        { status: 400 }
      );
    }

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Payment configuration error" },
        { status: 500 }
      );
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const signatureBuffer = Buffer.from(
      generatedSignature,
      "utf-8"
    );

    const receivedBuffer = Buffer.from(
      razorpay_signature,
      "utf-8"
    );

    if (
      signatureBuffer.length !==
        receivedBuffer.length ||
      !crypto.timingSafeEqual(
        signatureBuffer,
        receivedBuffer
      )
    ) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // IMPORTANT:
    // Do NOT appendRegistration here.
    // Webhook handles paid registrations.

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "========== VERIFY ROUTE ERROR =========="
    );

    if (error instanceof Error) {
      console.error("MESSAGE:", error.message);

      console.error("STACK:", error.stack);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Unknown server error" },
      { status: 500 }
    );
  }
}