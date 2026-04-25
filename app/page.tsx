
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
              <p className="font-bold text-gray-900">31st May 2026</p>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-8 py-6 space-y-5 text-sm text-gray-600">
            <p>
              Bring your best game. The pitch is set and the spotlight is yours. Build your
              squad and get ready for an action-packed showdown.
            </p>

            <div className="h-px bg-gray-100" />

            <div>
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-800 mb-3">
                For All Participants
                <span className="text-green-600 bg-green-50 border border-green-100 rounded-full px-2.5 py-0.5 normal-case text-xs tracking-normal font-semibold">
                  Rs 500 per person
                </span>
              </h2>
              <ul className="space-y-2.5">
                {[
                  "Official Tournament T-Shirt",
                  "Food and Snacks during matches",
                  "Evening refreshments (Tea or Coffee)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                Registration is confirmed only after successful payment.
              </p>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-800 mb-1">
                Individual Player Rewards
              </h2>
              <p className="text-gray-500 mb-3 text-xs">Exclusive awards for outstanding performers:</p>
              <ul className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                {[
                  "Most Sixes",
                  "Most Fours",
                  "Man of the Match",
                  "Player of the Tournament",
                  "Best Fielder",
                  "Most Wickets",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
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
