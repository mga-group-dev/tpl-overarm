import { z } from "zod";

export const registrationSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),

  age: z
    .coerce.number()
    .int("Age must be a whole number")
    .positive("Age must be a positive number")
    .max(100, "Age must be 100 or less"),

  gender: z.enum(["Male", "Female"], { error: "Please select a gender" }),

  contactNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),

  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be at most 100 characters"),

  playingExpertise: z.enum(["Batting", "Bowling", "Fielding", "All Rounder"], { error: "Please select a playing expertise" }),

  battingSkills: z
    .coerce.number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 10")
    .max(10, "Rating must be between 1 and 10"),

  bowlingSkills: z
    .coerce.number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 10")
    .max(10, "Rating must be between 1 and 10"),

  fieldingSkills: z
    .coerce.number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 10")
    .max(10, "Rating must be between 1 and 10"),

  jerseySize: z.enum(["S", "M", "L", "XL", "XXL", "XXXL"], { error: "Please select a jersey size" }),

  jerseyNumber: z
    .string()
    .regex(/^(0[1-9]|[1-9][0-9])$/, "Jersey number must be between 01 and 99"),

  jerseyName: z
    .string()
    .min(1, "Name on jersey is required")
    .max(15, "Name on jersey must be at most 15 characters"),

  photoUrl: z
    .string()
    .url("Please upload a valid photo")
    .min(1, "Please upload your photo"),

  cricheroProfile: z
    .string()
    .min(1, "Cricheros profile is required")
    .max(200, "Cricheros profile must be at most 200 characters"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
