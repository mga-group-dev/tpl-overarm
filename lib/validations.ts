import { z } from "zod";

export const registrationSchema = z
  .object({
    registrationType: z.enum(
      ["Player", "Spectator", "Team Owner"],
      {
        error: "Please select a registration type",
      }
    ),

    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be at most 100 characters"),

    age: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) {
          return undefined;
        }

        const num = Number(value);

        return isNaN(num) ? undefined : num;
      },
      z
        .number({
          error: "Age is required",
        })
        .int("Age must be a whole number")
        .positive("Age must be a positive number")
        .max(100, "Age must be 100 or less")
    ),

    gender: z.enum(["Male", "Female"], {
      error: "Please select a gender",
    }),

    contactNumber: z
      .string()
      .regex(
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian mobile number"
      ),

    companyName: z.string().optional(),

    jerseySize: z.enum(
      ["S", "M", "L", "XL", "XXL", "XXXL"],
      {
        error: "Please select a jersey size",
      }
    ),

    jerseyNumber: z
      .string()
      .regex(
        /^(0[1-9]|[1-9][0-9])$/,
        "Jersey number must be between 01 and 99"
      ),

    jerseyName: z
      .string()
      .min(1, "Name on jersey is required")
      .max(15, "Name on jersey must be at most 15 characters"),

    photoUrl: z.string().min(1, "Please upload your photo"),

    // =================================
    // PLAYER FIELDS
    // =================================

    playingExpertise: z
      .enum([
        "Batting",
        "Bowling",
        "Fielding",
        "All Rounder",
      ])
      .optional(),

    battingSkills: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .optional(),

    bowlingSkills: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .optional(),

    fieldingSkills: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .optional(),

    cricheroProfile: z.string().optional(),

    // =================================
    // ELIGIBILITY VERIFICATION
    // =================================

    eligibilityCategory: z
      .enum([
        "GST Registered Business Owner",
        "Salaried Professional",
        "DPIIT Startup Founder",
        "Trademark Holder",
        "None",
      ])
      .optional(),

    gstNumber: z.string().optional(),

    salaryCompanyName: z.string().optional(),

    designation: z.string().optional(),

    dpiitCertificate: z.string().optional(),

    trademarkCertificate: z.string().optional(),

    // =================================
    // TEAM OWNER
    // =================================

    teamName: z.string().optional(),
  })

  .superRefine((data, ctx) => {
    // =================================
    // PLAYER VALIDATION
    // =================================

    if (data.registrationType === "Player") {
      // Playing Expertise
      if (!data.playingExpertise) {
        ctx.addIssue({
          code: "custom",
          message: "Please select a playing expertise",
          path: ["playingExpertise"],
        });
      }

      // Batting
      if (data.battingSkills === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Please rate your batting skills",
          path: ["battingSkills"],
        });
      }

      // Bowling
      if (data.bowlingSkills === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Please rate your bowling skills",
          path: ["bowlingSkills"],
        });
      }

      // Fielding
      if (data.fieldingSkills === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Please rate your fielding skills",
          path: ["fieldingSkills"],
        });
      }

      // Crichero Profile
      if (
        !data.cricheroProfile ||
        data.cricheroProfile.trim().length < 1
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Cricheros profile is required",
          path: ["cricheroProfile"],
        });
      }

      // =================================
      // ELIGIBILITY VALIDATION
      // =================================

      if (!data.eligibilityCategory) {
        ctx.addIssue({
          code: "custom",
          message: "Please select an eligibility category",
          path: ["eligibilityCategory"],
        });
      }

      // GST
      if (
        data.eligibilityCategory ===
        "GST Registered Business Owner"
      ) {
        if (
          !data.gstNumber ||
          data.gstNumber.trim().length < 1
        ) {
          ctx.addIssue({
            code: "custom",
            message: "GST Number is required",
            path: ["gstNumber"],
          });
        }
      }

      // Salaried Professional
      if (
        data.eligibilityCategory ===
        "Salaried Professional"
      ) {
        if (
          !data.salaryCompanyName ||
          data.salaryCompanyName.trim().length < 2
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Company name is required",
            path: ["salaryCompanyName"],
          });
        }

        if (
          !data.designation ||
          data.designation.trim().length < 2
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Designation is required",
            path: ["designation"],
          });
        }
      }

      // DPIIT
      if (
        data.eligibilityCategory ===
        "DPIIT Startup Founder"
      ) {
        if (
          !data.dpiitCertificate ||
          data.dpiitCertificate.trim().length < 1
        ) {
          ctx.addIssue({
            code: "custom",
            message: "DPIIT Certificate is required",
            path: ["dpiitCertificate"],
          });
        }
      }

      // Trademark
      if (
        data.eligibilityCategory ===
        "Trademark Holder"
      ) {
        if (
          !data.trademarkCertificate ||
          data.trademarkCertificate.trim().length < 1
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Trademark Certificate is required",
            path: ["trademarkCertificate"],
          });
        }
      }
    }

    // =================================
    // TEAM OWNER VALIDATION
    // =================================

    if (data.registrationType === "Team Owner") {
      if (
        !data.teamName ||
        data.teamName.trim().length < 2
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Team name is required",
          path: ["teamName"],
        });
      }
    }
  });

export type RegistrationFormData = z.infer<
  typeof registrationSchema
>;