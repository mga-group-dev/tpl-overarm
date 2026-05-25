"use client";

import { useState, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, type RegistrationFormData } from "@/lib/validations";
import Image from "next/image";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <span className="w-0.5 h-4 rounded-full bg-green-500 shrink-0" />
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RegistrationForm() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema) as Resolver<RegistrationFormData>,
    defaultValues: { registrationType: "Player" },
    shouldUnregister: true,
  });

  const registrationType = watch("registrationType");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploadSuccess(false);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be 5MB or less.");
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setValue("photoUrl", data.url, { shouldValidate: true });
      setIsUploadSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
      setPhotoPreview(null);
      setUploadedFileName(null);
      setValue("photoUrl", "", { shouldValidate: false });
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    setUploadedFileName(null);
    setIsUploadSuccess(false);
    setUploadError(null);
    setValue("photoUrl", "", { shouldValidate: false });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(data: RegistrationFormData) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create Razorpay order (form data is stored in order notes so the
      //    webhook can record the registration even if the user leaves the page)
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: data }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Failed to create order");

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay checkout. Please refresh and try again.");

      // 3. Open checkout modal
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Tax Sahi Hai® TPL 3.0",
          description: "Tournament Registration Fee",
          order_id: orderData.orderId,
          prefill: {
            name: data.fullName,
            contact: data.contactNumber,
          },
          theme: { color: "#16a34a" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 4. Verify payment on server
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  formData: getValues(),
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error ?? "Payment verification failed");
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="py-8 text-center space-y-5">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-green-50">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Confirmed</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
            Welcome to <strong className="text-gray-700">Tax Sahi Hai TPL 3.0</strong>. Your payment
            was successful and your registration is confirmed. See you on the pitch on{" "}
            <strong className="text-gray-700">27th June 2026</strong>.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 text-xs font-semibold text-green-700">
          Payment received
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

      {/* Registration Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          I am registering as <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "Player", desc: "I want to play in the tournament" },
            { value: "Spectator", desc: "I want to watch the tournament" },
              { value: "Team Owner", desc: "I want to own/manage a team" },
          ] as const).map(({ value, desc }) => (
            <label
              key={value}
              className="flex flex-col gap-1 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 hover:border-green-400 has-checked:border-green-500 has-checked:bg-green-50 has-checked:text-green-700 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <input
                  {...register("registrationType")}
                  type="radio"
                  value={value}
                  className="accent-green-600"
                />
                <span className="font-semibold">{value}</span>
              </div>
              <span className="text-xs text-gray-400 pl-5">{desc}</span>
            </label>
          ))}
        </div>
        {errors.registrationType && (
          <p className="mt-1 text-xs text-red-500">{errors.registrationType.message}</p>
        )}
      </div>

      <SectionLabel label="Personal Information" />

      {/* Full Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register("fullName")}
          type="text"
          placeholder="Enter your full name"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
      </div>

      {/* Age */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Age <span className="text-red-500">*</span>
        </label>
        <input
          {...register("age", { valueAsNumber: true })}
          type="number"
          min={1}
          max={100}
          placeholder="Enter your age"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age.message}</p>}
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Gender <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {(["Male", "Female"] as const).map((g) => (
            <label
              key={g}
              className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm text-gray-700 hover:border-green-400 has-checked:border-green-500 has-checked:bg-green-50 has-checked:text-green-700 transition-all"
            >
              <input
                {...register("gender")}
                type="radio"
                value={g}
                className="accent-green-600"
              />
              {g}
            </label>
          ))}
        </div>
        {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
      </div>

      {/* Contact Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Contact Number <span className="text-red-500">*</span>
        </label>
        <input
          {...register("contactNumber")}
          type="tel"
          maxLength={10}
          placeholder="10-digit Indian mobile number"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.contactNumber && (
          <p className="mt-1 text-xs text-red-500">{errors.contactNumber.message}</p>
        )}
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register("companyName")}
          type="text"
          placeholder="Enter your company name"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.companyName && (
          <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>
        )}
      </div>

      <SectionLabel label="Jersey Details" />

      {/* Jersey Size */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Jersey T-Shirt Size <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["S", "M", "L", "XL", "XXL", "XXXL"] as const).map((size) => (
            <label
              key={size}
              className="flex items-center justify-center min-w-13 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold cursor-pointer hover:border-green-400 has-checked:bg-green-600 has-checked:border-green-600 has-checked:text-white transition-all text-gray-400"
            >
              <input
                {...register("jerseySize")}
                type="radio"
                value={size}
                className="sr-only"
              />
              {size}
            </label>
          ))}
        </div>
        {errors.jerseySize && (
          <p className="mt-1 text-xs text-red-500">{errors.jerseySize.message}</p>
        )}
      </div>

      {/* Jersey Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Preferred Jersey Number (01 to 99) <span className="text-red-500">*</span>
        </label>
        <input
          {...register("jerseyNumber")}
          type="text"
          maxLength={2}
          placeholder="e.g. 07"
          className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.jerseyNumber && (
          <p className="mt-1 text-xs text-red-500">{errors.jerseyNumber.message}</p>
        )}
      </div>

      {/* Jersey Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Name to be Printed on Jersey <span className="text-red-500">*</span>
        </label>
        <input
          {...register("jerseyName")}
          type="text"
          maxLength={15}
          placeholder="Max 15 characters"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.jerseyName && (
          <p className="mt-1 text-xs text-red-500">{errors.jerseyName.message}</p>
        )}
      </div>

      <SectionLabel label="Profile Photo" />

      {/* Photo Upload */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-0.5">
          Profile Photo <span className="text-red-500">*</span>
        </p>
        <p className="text-xs text-gray-400 mb-4">Clear front-facing photo &bull; JPEG / PNG / WebP &bull; Max 5 MB</p>

        <input type="hidden" {...register("photoUrl")} />

        <div className="flex flex-col items-center gap-4">
          {/* Avatar circle */}
          <div className="relative">
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative w-36 h-36 rounded-full overflow-hidden border-4 ${isUploadSuccess ? "border-green-500" : "border-gray-200"} bg-gray-100 shadow-sm transition-all ${!isUploading ? "cursor-pointer" : "cursor-default"}`}
            >
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Profile photo preview"
                  fill
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full gap-1.5 text-gray-300">
                  <svg className="w-14 h-14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              )}

              {/* Upload spinner overlay */}
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50">
                  <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-[10px] font-semibold text-white tracking-wide">Uploading</span>
                </div>
              )}

              {/* Hover hint when photo exists */}
              {photoPreview && !isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Success ring badge */}
            {isUploadSuccess && !isUploading && (
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Camera button when no photo */}
            {!photoPreview && !isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-green-600 border-2 border-white flex items-center justify-center shadow hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* File name + action buttons */}
          {photoPreview && !isUploading ? (
            <div className="flex flex-col items-center gap-2">
              {uploadedFileName && (
                <p className="text-xs text-gray-400 max-w-45 truncate text-center">{uploadedFileName}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ) : !photoPreview && !isUploading ? (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Upload your profile photo</p>
              <p className="text-xs text-gray-400 mt-0.5">Click the circle or the camera button</p>
            </div>
          ) : null}

          {/* Photo tips */}
          <ul className="w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5">
            {[
              "Face clearly visible, looking straight at camera",
              "Good lighting, plain or simple background",
              "No sunglasses, caps, or filters",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />

        {uploadError && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {uploadError}
          </div>
        )}
        {errors.photoUrl && !uploadError && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {errors.photoUrl.message}
          </div>
        )}
      </div>

      {registrationType === "Player" && (
        <>
      <SectionLabel label="Cricket Profile" />

      {/* Playing Expertise */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Playing Expertise <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {(["Batting", "Bowling", "Fielding", "All Rounder"] as const).map((exp) => (
            <label
              key={exp}
              className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 hover:border-green-400 has-checked:border-green-500 has-checked:bg-green-50 has-checked:text-green-700 transition-all"
            >
              <input
                {...register("playingExpertise")}
                type="radio"
                value={exp}
                className="accent-green-600"
              />
              {exp}
            </label>
          ))}
        </div>
        {errors.playingExpertise && (
          <p className="mt-1 text-xs text-red-500">{errors.playingExpertise.message}</p>
        )}
      </div>

      {/* Skill Ratings */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-5">
        <p className="text-sm font-semibold text-gray-700">Skill Ratings (1 to 10)</p>

        {(
          [
            { name: "battingSkills", label: "Batting Skills" },
            { name: "bowlingSkills", label: "Bowling Skills" },
            { name: "fieldingSkills", label: "Fielding Skills" },
          ] as const
        ).map(({ name, label }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {label} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <label
                  key={n}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-sm cursor-pointer hover:border-green-400 hover:text-green-600 has-checked:bg-green-600 has-checked:border-green-600 has-checked:text-white font-semibold transition-all text-gray-400"
                >
                  <input
                    {...register(name)}
                    type="radio"
                    value={n}
                    className="sr-only"
                  />
                  {n}
                </label>
              ))}
            </div>
            {errors[name] && (
              <p className="mt-1 text-xs text-red-500">{errors[name]?.message}</p>
            )}
          </div>
        ))}
      </div>

      <SectionLabel label="Cricheros Profile" />

      {/* Cricheros Profile */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Cricheros Profile <span className="text-red-500">*</span>
        </label>
        <input
          {...register("cricheroProfile")}
          type="text"
          placeholder="Cricheros profile URL or username"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
        />
        {errors.cricheroProfile && (
          <p className="mt-1 text-xs text-red-500">{errors.cricheroProfile.message}</p>
        )}
      </div>
        </>
      )}
{registrationType === "Team Owner" && (
  <>
    <SectionLabel label="Team Owner Details" />
<>
  {/* Important Information */}
{/* Important Information */}
<div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-5">
  <div className="flex items-start gap-3">
    <div className="mt-0.5">
      <svg
        className="w-5 h-5 text-green-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M12 20h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
        />
      </svg>
    </div>

    <div className="flex-1 space-y-5">

      {/* Heading */}
      <div>
        <h3 className="text-lg font-bold text-green-900">
          Important Information for Team Owners
        </h3>
      </div>

      {/* Benefits */}
      <div className="rounded-xl border border-green-100 bg-white p-4">
        <h4 className="text-sm font-bold text-gray-900 mb-3">
          Team Owner Benefits
        </h4>

        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            Team Owners are allowed to play for their own team.
          </li>

          <li className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            Participation in the Player Auction Event included.
          </li>
        </ul>
      </div>

      {/* Ownership Fee */}
      <div className="rounded-xl border border-green-100 bg-white p-4">
        <h4 className="text-sm font-bold text-gray-900 mb-2">
          Team Ownership Fee
        </h4>

        <div className="text-3xl font-extrabold text-green-700 mb-2">
          ₹15,000
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Includes{" "}
          <span className="font-semibold text-gray-800">
            5 Crore Auction Credits
          </span>{" "}
          to build your squad during the auction.
        </p>
      </div>

      {/* Top Ups */}
      <div className="rounded-xl border border-green-100 bg-white p-4">
        <h4 className="text-sm font-bold text-gray-900 mb-3">
          Optional Auction Credit Top-Ups
        </h4>

        <p className="text-sm text-gray-600 mb-4">
          Increase your bidding power during the auction:
        </p>

        <div className="space-y-3">

          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <span className="font-semibold text-gray-800">
              ₹2,500
            </span>

            <span className="text-sm text-gray-600">
              Additional 2 Crore Credits
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <span className="font-semibold text-gray-800">
              ₹1,500
            </span>

            <span className="text-sm text-gray-600">
              Additional 1 Crore Credits
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <span className="font-semibold text-gray-800">
              ₹1,000
            </span>

            <span className="text-sm text-gray-600">
              Additional 50 Lakh Credits
            </span>
          </div>

        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-bold text-amber-900 mb-3">
          Important Notes
        </h4>

        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            No top-up options beyond the limits mentioned above.
          </li>

          <li className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Unused auction credits are non-refundable.
          </li>
        </ul>
      </div>

    </div>
  </div>
</div>

  <SectionLabel label="Team Owner Details" />

  {/* Team Name */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      Team Name <span className="text-red-500">*</span>
    </label>

    <input
      {...register("teamName")}
      type="text"
      placeholder="Enter your team name"
      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
    />

    {errors.teamName && (
      <p className="mt-1 text-xs text-red-500">
        {errors.teamName.message}
      </p>
    )}
  </div>
</>
   

   

   

    

    
  </>
)}
      {/* Submit Error */}
      {submitError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {submitError}
        </div>
      )}

      {/* Submit Button */}
    {/* Submit Button */}
<button
  type="submit"
  disabled={isSubmitting || isUploading}
  className={`w-full rounded-xl px-6 py-4 text-sm font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
    registrationType === "Team Owner"
      ? "bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 focus:ring-emerald-500"
      : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
  }`}
>
  {isSubmitting ? (
    <span className="flex items-center justify-center gap-2">
      <svg
        className="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />

        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>

      {registrationType === "Team Owner"
        ? "Processing Team Registration..."
        : "Processing"}
    </span>
  ) : registrationType === "Team Owner" ? (
    <div className="flex flex-col items-center justify-center leading-tight">
      <span className="text-base font-extrabold">
        Pay ₹15,000 and Register as Team Owner
      </span>

      <span className="text-[11px] font-medium text-green-100 mt-1">
        Includes 5 Crore Auction Credits
      </span>
    </div>
  ) : (
    "Pay Rs 500 and Register"
  )}
</button>
    </form>
  );
}
