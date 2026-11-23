// Pricing / Pilot Structure sections, hidden from the public site until launch (commercial terms
// not yet finalised for public display). Preserved here, unreferenced, from the pre-redesign
// App.tsx (25 Oct 2026 hide decision; rates approved 22 Oct 2026 from
// Ordin_Core_Supported_Living_and_Homecare_Pricing_Schedules) so the 23 Nov 2026 homepage redesign
// does not delete this functionality -- only re-render <PilotStructureSection /> and
// <PricingTableSection /> from App.tsx when pricing is ready to go public.
import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import { Card } from "./components/ui/card";

const PILOT_TIMELINE = [
  { phase: "Week 1", label: "Onboarding" },
  { phase: "Week 2–4", label: "Governance rhythm implementation" },
  { phase: "Week 5–8", label: "Operational review and optimisation" },
  { phase: "Week 9–12", label: "Evaluation and governance outcomes review" },
];

const PILOT_INCLUDED = [
  "Full platform access",
  "Onboarding support",
  "Governance review sessions",
  "Priority support",
  "Future feature consideration",
];

export function PilotStructureSection() {
  return (
    <section className="py-20 bg-[#DDE7EF] dark:bg-slate-900 border-t border-[#C6D5E1]/35 dark:border-slate-800" id="pricing">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        <div className="mx-auto max-w-2xl text-center mb-12">
          <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            12-Week Early Adopter Pilot
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#172B3B] dark:text-white sm:text-4xl">
            Pilot Structure
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            A structured 12-week programme to embed governance rhythm inside real operational services.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-20">
          {PILOT_TIMELINE.map((item) => (
            <Card key={item.phase} className="p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col">
              <p className="text-sm font-black uppercase tracking-wider text-[#28536F] dark:text-[#5B9FD4] mb-2">{item.phase}</p>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-semibold">{item.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-black text-[#172B3B] dark:text-white mb-4">Included in Every Pilot</h3>
            <ul className="space-y-2.5">
              {PILOT_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckBadgeIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-black text-[#172B3B] dark:text-white mb-4">Pilot Guarantee</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Complete the full 12-week pilot and retain:</p>
            <ul className="space-y-2.5">
              {["Founder pricing for 12 months", "Priority onboarding into future releases", "Early access to new governance modules"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckBadgeIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-black text-[#172B3B] dark:text-white mb-4">Pilot Expectations</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Pilot providers should:</p>
            <ul className="space-y-2.5">
              {["Actively use the platform", "Attend review sessions", "Provide operational feedback", "Participate in governance evaluation"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckBadgeIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function PricingTableSection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-950 border-t border-[#C6D5E1]/35 dark:border-slate-800" id="pricing">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Pricing
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#172B3B] dark:text-white sm:text-4xl">
            Simple, per-service pricing
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Product charges for the governance platform, not care-delivery fees. All bands include the same core governance functions. Prices shown are monthly, before tax.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="p-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-black text-[#172B3B] dark:text-white mb-1">Supported living</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Priced per address, by agreed operational capacity — not daily occupancy.</p>
            <div className="overflow-hidden rounded-xl border border-[#C6D5E1] dark:border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#DDE7EF] dark:bg-slate-800 text-left text-[#172B3B] dark:text-white">
                    <th className="px-4 py-2.5 font-bold">Capacity</th>
                    <th className="px-4 py-2.5 font-bold">Monthly site price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C6D5E1]/60 dark:divide-slate-800">
                  {[
                    ["1–6 clients", "£100"],
                    ["7–10 clients", "£125"],
                    ["11–15 clients", "£150"],
                    ["16+ clients", "Individual quotation"],
                  ].map(([band, price]) => (
                    <tr key={band} className="text-slate-700 dark:text-slate-300">
                      <td className="px-4 py-2.5">{band}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#172B3B] dark:text-white">{price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#28536F] dark:text-[#5B9FD4]">Multi-site discount</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sites 1–3: full price · Sites 4–6: 5% off · Sites 7–10: 10% off. Beyond 10 active sites, individual quotation.</p>
          </Card>

          <Card className="p-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-black text-[#172B3B] dark:text-white mb-1">Homecare</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Priced on provider-wide active client count, calculated once across all branches.</p>
            <div className="overflow-hidden rounded-xl border border-[#C6D5E1] dark:border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#DDE7EF] dark:bg-slate-800 text-left text-[#172B3B] dark:text-white">
                    <th className="px-4 py-2.5 font-bold">Clients (provider-wide)</th>
                    <th className="px-4 py-2.5 font-bold">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C6D5E1]/60 dark:divide-slate-800">
                  {[
                    ["First 25 clients", "£100/mo minimum, includes 1st branch"],
                    ["Clients 26–50", "+£2 per client"],
                    ["Clients 51–200", "+£1.50 per client"],
                    ["Clients 201–300", "+£1.25 per client"],
                    ["Above 300", "Individual quotation"],
                  ].map(([band, price]) => (
                    <tr key={band} className="text-slate-700 dark:text-slate-300">
                      <td className="px-4 py-2.5">{band}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#172B3B] dark:text-white">{price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#28536F] dark:text-[#5B9FD4]">Additional branches</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">£25/month per additional branch beyond the first. E.g. 80 clients across 3 branches = £245/month.</p>
          </Card>
        </div>

        <p className="mt-10 text-center text-xs text-slate-500 dark:text-slate-500">
          One provider running both service types receives a single invoice with separate supported-living and homecare lines. Supported-living multi-site discounts do not apply to homecare. <a href="#" className="underline hover:text-[#28536F] dark:hover:text-[#5B9FD4]">See full pricing schedule</a>.
        </p>
      </div>
    </section>
  );
}
