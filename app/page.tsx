
import RegistrationForm from "@/app/components/RegistrationForm";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-green-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Event Banner */}
        <div className="rounded-2xl overflow-hidden shadow border border-gray-100">

          {/* Hero Header */}
          <div className="bg-linear-to-br from-green-700 to-emerald-500 px-8 py-6 text-white flex flex-col md:flex-row items-center gap-4 justify-between">
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-none text-center">TPL 3.0</h1>
              <p className="text-green-100 text-sm mt-2">Game On: 2026 Edition</p>
            </div>
            <div className="bg-white rounded-lg p-2 w-max">
              <Image
                src="https://taxsahihai.com/main_logo.png"
                alt="Tax Sahi Hai"
                width={220}
                height={60}
                priority
              />
            </div>
          </div>



          {/* Key Dates */}
          <div className="bg-white grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">
                Match Date
              </p>
              <p className="font-bold text-gray-900">27th June 2026</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-1">
                Registration Closes
              </p>
              <p className="font-bold text-gray-900">10th June 2026</p>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-8 py-6 space-y-5 text-sm text-gray-600">
            <p>
       Curated participation from Founders, Professionals, Business owners & Corporate leaders.
            </p>

            <div className="h-px bg-gray-100" />

        

          

            
          </div>
        </div>

        {/* Registration Form Card */}
        <div className="rounded-2xl bg-white shadow border border-gray-100 overflow-hidden">
          <div className="bg-linear-to-r from-green-600 to-emerald-500 px-8 py-5">
            <h2 className="text-lg font-bold text-white">Player Registration</h2>
            <p className="text-green-100 text-xs mt-0.5">
              Fill in your details to secure your spot in the tournament
            </p>
          </div>
          <div className="px-8 py-8">
            <RegistrationForm />
          </div>
        </div>

      </div>
    </main>
  );
}
