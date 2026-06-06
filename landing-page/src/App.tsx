import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import logoImg from "./assets/logo.png";
import heroSeeWorseImg from "./assets/See what is getting worse eralier.png";
import heroTrackConcernsImg from "./assets/track concerns.png";
import heroMaintainStrongerImg from "./assets/Maintain stronger.png";
import problemRepeatedConcernsImg from "./assets/direct feedback.png";
import problemEscalationsLosingVisibilityImg from "./assets/escalations losing visibility.png";
import problemRisksIncreasingHousesImg from "./assets/Risks Increasing accross houses.png";
import problemActionsNotBeingFollowedImg from "./assets/Actions not being follwed.png";
import problemOverRelianceMemoryImg from "./assets/over-reliance on memory.png";
import problemDifficultyOversightImg from "./assets/governance becomes diff.png";
import workflowDailySignalImg from "./assets/Daily governance signal.png";
import workflowTrajectoryAwarenessImg from "./assets/trajectorry awareness.png";
import workflowEscalationLeadershipImg from "./assets/escalation & leadership decisions.png";
import workflowWeeklyReviewImg from "./assets/Weekly Governance Review.png";
import workflowOversightNarrativeImg from "./assets/Oversight Narrative.png";
import audienceDirectorsImg from "./assets/Directors.png";
import audienceResponsibleIndividualsImg from "./assets/Responsible Individuals.png";
import audienceRegisteredManagersImg from "./assets/interaction.png";
import audienceSupportedLivingProvidersImg from "./assets/supported living persons.png";
import audienceMentalHealthServicesImg from "./assets/mental Health & Community services.png";
import supportImg from "./assets/support.png";
import interactionImg from "./assets/interaction.png";
import structuredReviewImg from "./assets/structured review.png";
import earlyAccessImg from "./assets/early access.png";
import governanceIsImg from "./assets/governance is.png";
import governanceDiff2Img from "./assets/governance becomes diff 2.png";
import designedToSupportGovernanceImg from "./assets/designed  to support governance.png";
import rightArrowImg from "./assets/right arrow.png";

// Role-based screenshot imports
import roleTeamLeaderImg from "./assets/role_team_leader.png";
import roleRegisteredManagerImg from "./assets/role_registered_manager.png";
import roleResponsibleIndividualImg from "./assets/role_responsible_individual.png";
import roleDirectorImg from "./assets/role_director.png";

// Governance Output screenshot imports
import outputPulseReviewImg from "./assets/output_pulse_review.png";
import outputRiskTrajectoryImg from "./assets/output_risk_trajectory.png";
import outputEscalationTrackingImg from "./assets/output_escalation_tracking.png";
import outputRhythmCompletionImg from "./assets/output_rhythm_completion.png";
import outputOversightNarrativeImg from "./assets/output_oversight_narrative.png";

import {
  CheckBadgeIcon,
  ChevronDownIcon,
  MoonIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const NAV_LINKS = [
  { label: "Why Ordin Core", href: "#why" },
  { label: "How It Works", href: "#workflow" },
  { label: "For Who", href: "#audience" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Login", href: "https://work.ordincore.co.uk" },
];

const PROBLEM_CARDS = [
  {
    image: problemRepeatedConcernsImg,
    title: "Repeated Concerns Across Shifts",
    description: "Small issues repeated over time can indicate larger operational pressure.",
    color: "bg-brand-soft/20 text-[#1E7D4F] border border-brand-border/30",
  },
  {
    image: problemEscalationsLosingVisibilityImg,
    title: "Escalations Losing Visibility",
    description: "Important concerns can become unclear once shifts change or teams rotate.",
    color: "bg-brand-soft/20 text-[#1E7D4F] border border-brand-border/30",
  },
  {
    image: problemRisksIncreasingHousesImg,
    title: "Risks Increasing Across Houses",
    description: "Leadership teams need clearer visibility of worsening patterns across services.",
    color: "bg-brand-soft/20 text-[#1E7D4F] border border-brand-border/30",
  },
  {
    image: problemActionsNotBeingFollowedImg,
    title: "Actions Not Being Followed Through",
    description: "Operational actions should remain visible until completed and reviewed.",
    color: "bg-brand-soft/20 text-[#1E7D4F] border border-brand-border/30",
  },
  {
    image: problemOverRelianceMemoryImg,
    title: "Over-Reliance on Memory & Messaging",
    description: "Critical oversight should not rely on WhatsApp messages, verbal updates or memory.",
    color: "bg-brand-soft/20 text-[#1E7D4F] border border-brand-border/30",
  },
  {
    image: problemDifficultyOversightImg,
    title: "Difficulty Demonstrating Oversight",
    description: "Services often struggle to evidence operational governance during inspections.",
    color: "bg-brand-soft/20 text-[#1E7D4F] border border-brand-border/30",
  },
];

const WORKFLOW_STEPS = [
  {
    number: "1",
    title: "Daily Governance Signal",
    description: "Operational concerns or pressures are identified and recorded.",
    example: "Examples: medication concern, repeated safeguarding themes, staffing instability, deterioration in service culture, repeated incidents.",
    image: workflowDailySignalImg,
  },
  {
    number: "2",
    title: "Trajectory Awareness",
    description: "Repeated patterns and worsening concerns become visible over time.",
    example: "Patterns are analysed across services, shifts and teams.",
    image: workflowTrajectoryAwarenessImg,
  },
  {
    number: "3",
    title: "Escalation & Leadership Decisions",
    description: "Managers review concerns, assign actions and track operational follow-up.",
    example: "Decisions are recorded with ownership and timescales.",
    image: workflowEscalationLeadershipImg,
  },
  {
    number: "4",
    title: "Weekly Governance Review",
    description: "Leadership teams conduct structured operational governance review across services.",
    example: "Risks, actions and progress are reviewed.",
    image: workflowWeeklyReviewImg,
  },
  {
    number: "5",
    title: "Oversight Narrative",
    description: "Governance visibility and leadership decisions remain reconstructable over time.",
    example: "Clear continuity of oversight is maintained.",
    image: workflowOversightNarrativeImg,
  },
];

const AUDIENCE_CARDS = [
  {
    image: audienceDirectorsImg,
    title: "Directors",
    description: "Cross-service governance visibility and operational oversight across multiple houses and teams.",
  },
  {
    image: audienceResponsibleIndividualsImg,
    title: "Responsible Individuals / Nominated Individuals",
    description: "Structured assurance and clearer visibility of operational governance over time.",
  },
  {
    image: audienceRegisteredManagersImg,
    title: "Registered Managers",
    description: "Daily operational review, escalation visibility and governance follow-up support.",
  },
  {
    image: audienceSupportedLivingProvidersImg,
    title: "Supported Living Providers",
    description: "Improved visibility across houses, staffing pressures and service-level concerns.",
  },
  {
    image: audienceMentalHealthServicesImg,
    title: "Mental Health & Community Services",
    description: "Supports governance review within complex and high-risk operational environments.",
  },
];

const GOVERNANCE_OUTPUTS = [
  { name: "pulse", label: "Governance Pulse Review", image: outputPulseReviewImg, desc: "A service-by-service checklist showing daily and weekly completion rates." },
  { name: "risk", label: "Cross-House Risk Trajectory", image: outputRiskTrajectoryImg, desc: "A dashboard showing which houses are improving, stable, or worsening over time." },
  { name: "escalation", label: "Escalation Tracking View", image: outputEscalationTrackingImg, desc: "Operational escalations mapped to active leadership interventions." },
  { name: "rhythm", label: "Governance Rhythm Completion", image: outputRhythmCompletionImg, desc: "Compliance tracker mapping weekly executive checks." },
  { name: "narrative", label: "Monthly Oversight Narrative", image: outputOversightNarrativeImg, desc: "A compiled audit trail detailing the reasoning behind key leadership decisions." },
];

const PILOT_BENEFITS = [
  { label: "Onboarding support", image: supportImg },
  { label: "Governance workflow guidance", image: interactionImg },
  { label: "Structured review sessions", image: structuredReviewImg },
  { label: "Early platform access", image: earlyAccessImg },
  { label: "Direct feedback opportunities", image: governanceIsImg },
];

const FOUR_QUESTIONS = [
  {
    question: "What is getting worse?",
    answer: "Identify recurring concerns and emerging operational pressures.",
  },
  {
    question: "What needs our attention?",
    answer: "Focus leadership time where it matters most.",
  },
  {
    question: "Are we following through?",
    answer: "Maintain visibility of actions, reviews and outcomes.",
  },
  {
    question: "Can we demonstrate oversight over time?",
    answer: "Maintain a structured, reconstructable record of governance activity.",
  },
];

const PILOT_TIMELINE = [
  { phase: "Week 1", label: "Onboarding" },
  { phase: "Week 2–4", label: "Governance rhythm implementation" },
  { phase: "Week 5–8", label: "Operational review and optimisation" },
  { phase: "Week 9–12", label: "Evaluation and governance outcomes review" },
];

const PILOT_PRICING_DOM = [
  {
    tier: "Small Provider",
    scope: "1–50 service users",
    price: "£49",
    features: ["Up to 5 management users", "Full governance pulse", "Escalations", "Weekly governance reviews", "Monthly governance narrative", "Direct founder support"],
  },
  {
    tier: "Medium Provider",
    scope: "50–150 service users",
    price: "£99",
    features: ["Multiple managers", "Multiple service areas", "Cross-team oversight", "Priority support"],
  },
  {
    tier: "Large Provider",
    scope: "150+ service users",
    price: "£199",
    features: ["Multi-branch oversight", "Director dashboard", "Strategic reporting", "Pilot partner status"],
  },
];

const PILOT_PRICING_SL = [
  { scope: "1–3 houses", price: "£149" },
  { scope: "4–8 houses", price: "£249" },
  { scope: "9–15 houses", price: "£399" },
  { scope: "16+ houses", price: "Contact Us" },
];

const PILOT_INCLUDED = [
  "Full platform access",
  "Onboarding support",
  "Governance review sessions",
  "Priority support",
  "Future feature consideration",
];

const FAQ_ITEMS = [
  { q: "Is Ordin Core a care management system?", a: "No. Ordin Core is a governance oversight layer — it does not replace your care management system." },
  { q: "Does it replace care notes?", a: "No. Ordin Core sits alongside your care notes and existing records." },
  { q: "Does it replace incident systems?", a: "No. It brings governance concerns into a structured oversight process rather than replacing incident reporting." },
  { q: "How long does implementation take?", a: "Typically less than two weeks." },
  { q: "Is staff training provided?", a: "Yes. Onboarding and staff training are included." },
];

const FOOTER_LINKS = [
  {
    title: "Platform",
    links: ["Why Ordin Core", "How It Works", "For Who", "Blog", "Pilot Programme"],
  },
  {
    title: "Resources",
    links: ["Governance Philosophy", "Example Outputs", "Care Sector Insights"],
  },
  {
    title: "Company",
    links: ["About Us", "Contact Us", "Pilot Enquiries"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Data Security", "Terms & Conditions"],
  },
];

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Modal / Form States
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoFormName, setDemoFormName] = useState("");
  const [demoFormEmail, setDemoFormEmail] = useState("");
  const [demoFormPhone, setDemoFormPhone] = useState("");
  const [demoFormOrg, setDemoFormOrg] = useState("");
  const [demoFormRole, setDemoFormRole] = useState("");
  const [demoFormServices, setDemoFormServices] = useState("");
  const [demoFormServiceType, setDemoFormServiceType] = useState("");
  const [demoFormContactMethod, setDemoFormContactMethod] = useState("Email");
  const [demoFormMessage, setDemoFormMessage] = useState(
    "Hi! I am interested in learning more about how Ordin Core can help support our care service's operational governance. Please contact me to arrange a brief demonstration."
  );
  const [demoSubmitStatus, setDemoSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [demoSubmitError, setDemoSubmitError] = useState("");

  // Pilot Programme Modal / Form States
  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false);
  const [pilotFormName, setPilotFormName] = useState("");
  const [pilotFormEmail, setPilotFormEmail] = useState("");
  const [pilotFormPhone, setPilotFormPhone] = useState("");
  const [pilotFormOrg, setPilotFormOrg] = useState("");
  const [pilotFormRole, setPilotFormRole] = useState("");
  const [pilotFormServices, setPilotFormServices] = useState("");
  const [pilotFormServiceType, setPilotFormServiceType] = useState("");
  const [pilotFormChallenge, setPilotFormChallenge] = useState("");
  const [pilotFormHelp, setPilotFormHelp] = useState("");
  const [pilotFormConsent, setPilotFormConsent] = useState(false);
  const [pilotSubmitStatus, setPilotSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [pilotSubmitError, setPilotSubmitError] = useState("");

  // Hero Tabbed Device Frame State
  const [activeHeroTab, setActiveHeroTab] = useState<"team_leader" | "registered_manager" | "responsible_individual" | "director">("team_leader");

  // Output Lightbox State
  const [activeOutputDetail, setActiveOutputDetail] = useState<{ label: string; image: string; desc: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Handle Form Submission with Web3Forms
  const handleDemoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDemoSubmitStatus("submitting");
    setDemoSubmitError("");

    try {
      const formData = new FormData();
      formData.append("access_key", "b9e46d19-c01b-4527-a65f-67e31817e04e");
      formData.append("name", demoFormName);
      formData.append("email", demoFormEmail);
      formData.append("phone", demoFormPhone);
      formData.append("organisation", demoFormOrg);
      formData.append("role", demoFormRole);
      formData.append("number_of_services_sites", demoFormServices);
      formData.append("type_of_service", demoFormServiceType);
      formData.append("preferred_contact_method", demoFormContactMethod);
      formData.append("message", demoFormMessage);
      formData.append("subject", "Ordin Core Landing Page - Demo Request");

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setDemoSubmitStatus("success");
        setDemoFormName("");
        setDemoFormEmail("");
        setDemoFormPhone("");
        setDemoFormOrg("");
        setDemoFormRole("");
        setDemoFormServices("");
        setDemoFormServiceType("");
        setDemoFormContactMethod("Email");
      } else {
        setDemoSubmitStatus("error");
        setDemoSubmitError(data.message || "Failed to submit demo request.");
      }
    } catch (err: any) {
      setDemoSubmitStatus("error");
      setDemoSubmitError(err.message || "An unexpected network error occurred.");
    }
  };

  // Handle Pilot Programme Form Submission with Web3Forms
  const handlePilotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPilotSubmitStatus("submitting");
    setPilotSubmitError("");

    try {
      const formData = new FormData();
      formData.append("access_key", "b9e46d19-c01b-4527-a65f-67e31817e04e");
      formData.append("name", pilotFormName);
      formData.append("email", pilotFormEmail);
      formData.append("phone", pilotFormPhone);
      formData.append("organisation", pilotFormOrg);
      formData.append("role", pilotFormRole);
      formData.append("number_of_services_sites", pilotFormServices);
      formData.append("type_of_service", pilotFormServiceType);
      formData.append("current_governance_challenge", pilotFormChallenge);
      formData.append("what_ordin_core_can_help_with", pilotFormHelp);
      formData.append("consent_to_be_contacted", pilotFormConsent ? "Yes" : "No");
      formData.append("subject", "Ordin Core Landing Page - Pilot Programme Application");

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPilotSubmitStatus("success");
        setPilotFormName("");
        setPilotFormEmail("");
        setPilotFormPhone("");
        setPilotFormOrg("");
        setPilotFormRole("");
        setPilotFormServices("");
        setPilotFormServiceType("");
        setPilotFormChallenge("");
        setPilotFormHelp("");
        setPilotFormConsent(false);
      } else {
        setPilotSubmitStatus("error");
        setPilotSubmitError(data.message || "Failed to submit pilot application.");
      }
    } catch (err: any) {
      setPilotSubmitStatus("error");
      setPilotSubmitError(err.message || "An unexpected network error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F3] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-40 border-b border-[#B0D4C0] dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Ordin Core" className="h-9 w-9 rounded-xl object-cover ring-2 ring-[#B0D4C0]/50" />
            <div className="leading-none">
              <p className="text-sm font-black uppercase tracking-widest text-[#1A3D28] dark:text-white">ordin</p>
              <p className="text-xs font-bold uppercase tracking-widest text-[#1E7D4F] dark:text-emerald-400">core</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300 lg:flex">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-1 transition-colors hover:text-[#1E7D4F] dark:hover:text-[#3DAB72]"
              >
                {item.label}
                {item.href.startsWith("#") && <ChevronDownIcon className="h-3.5 w-3.5 opacity-55" />}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button onClick={() => setIsDemoModalOpen(true)} className="rounded-full px-5 py-2 text-sm shadow-md hover:shadow-lg transition">
              Book a Demo
            </Button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-full border border-[#B0D4C0] dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center transition hover:border-[#1E7D4F] hover:bg-[#E2F0EA]/45"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon className="h-4.5 w-4.5 text-amber-400" /> : <MoonIcon className="h-4.5 w-4.5 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      <main>

        {/* ── HERO ── */}
        <section className="bg-gradient-to-b from-white to-[#F0F7F3] dark:from-slate-900 dark:to-slate-950 border-b border-[#B0D4C0]/40 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Governance Oversight for Care Services
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-[#1A3D28] dark:text-white sm:text-5xl">
                Structured Governance Oversight for Supported Living & Care
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                Ordin Core gives Directors, Responsible Individuals, and Registered Managers structured operational oversight of worsening trends, risks, active escalations, and audit-ready leadership decisions.
              </p>

              <div className="flex flex-col gap-3.5">
                {[
                  { img: heroSeeWorseImg, text: "See what is getting worse earlier across services" },
                  { img: heroTrackConcernsImg, text: "Track escalations cleanly with assigned leadership actions" },
                  { img: heroMaintainStrongerImg, text: "Evidence robust governance to regulators dynamically" },
                ].map(({ img, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <div className="h-9 w-9 shrink-0 rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-white dark:bg-slate-800 p-2 flex items-center justify-center shadow-sm">
                      <img src={img} alt="" className="h-full w-full object-contain" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Button onClick={() => setIsDemoModalOpen(true)} className="rounded-full gap-2 px-6 py-3.5 shadow-md">
                  Book a Demo
                  <img src={rightArrowImg} alt="" className="h-4 w-4 object-contain invert brightness-200" />
                </Button>
                <a href="#workflow" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#B0D4C0] bg-white dark:bg-slate-800 px-6 py-3 text-sm font-bold text-[#1A3D28] dark:text-white hover:bg-[#E2F0EA]/30 transition shadow-sm">
                  View Governance Workflow
                </a>
                <button onClick={() => setIsPilotModalOpen(true)} className="text-sm font-bold text-[#1E7D4F] dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                  Join Pilot Programme →
                </button>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[#B0D4C0]/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
                <img src={designedToSupportGovernanceImg} alt="" className="h-5 w-5 shrink-0 object-contain mt-0.5" />
                <p>Designed around real operational workflows and statutory duties within supported living, mental health, and community care environments.</p>
              </div>
            </div>

            {/* Right – Interactive Role-based Device Frame Preview */}
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex flex-wrap gap-1 bg-[#E2F0EA]/80 dark:bg-slate-900 p-1.5 rounded-2xl border border-[#B0D4C0]/60 dark:border-slate-800 shadow-inner">
                {[
                  { id: "team_leader", label: "Team Leader" },
                  { id: "registered_manager", label: "Registered Manager" },
                  { id: "responsible_individual", label: "RI / Nominated" },
                  { id: "director", label: "Director" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveHeroTab(tab.id as any)}
                    className={`flex-1 min-w-[90px] text-center px-2.5 py-2 rounded-xl text-xs font-bold transition duration-200 ${activeHeroTab === tab.id
                        ? "bg-[#1E7D4F] text-white shadow"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Display Area (Device Frame mockup) */}
              <Card className="overflow-hidden rounded-3xl border border-[#B0D4C0] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl relative transition-all duration-300">
                <div className="border-b border-[#B0D4C0]/50 dark:border-slate-800 px-5 py-3.5 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#1A3D28]/30 dark:bg-slate-700" />
                    <span className="h-3 w-3 rounded-full bg-[#1E7D4F]/30 dark:bg-slate-700" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/30 dark:bg-slate-700" />
                    <span className="ml-2 text-xs font-bold text-[#1A3D28] dark:text-slate-300 capitalize tracking-wide">
                      Role View: {activeHeroTab.replace("_", " ")}
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                    Live Session
                  </span>
                </div>

                <div className="bg-slate-950 relative min-h-[360px] flex items-center justify-center">
                  <div className="absolute inset-0 w-full h-full p-1 bg-slate-950">
                    <img
                      src={
                        activeHeroTab === "team_leader"
                          ? roleTeamLeaderImg
                          : activeHeroTab === "registered_manager"
                            ? roleRegisteredManagerImg
                            : activeHeroTab === "responsible_individual"
                              ? roleResponsibleIndividualImg
                              : roleDirectorImg
                      }
                      alt={`${activeHeroTab} screenshot`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#B0D4C0]/55 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-500 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-semibold text-[#1A3D28] dark:text-[#A8D5BE]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Interactive Screenshot View
                  </span>
                  <span>Select tabs above to inspect actual platform dashboards</span>
                </div>
              </Card>
            </div>

          </div>
        </section>

        {/* ── THE FOUR QUESTIONS ── */}
        <section className="py-20 bg-white dark:bg-slate-950 border-b border-[#B0D4C0]/40 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-14">
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                The Four Questions Every Leadership Team Needs Answered
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FOUR_QUESTIONS.map((item, idx) => (
                <Card key={item.question} className="p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col">
                  <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1A3D28] dark:bg-emerald-600 text-sm font-black text-white shadow">
                    {idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-[#1A3D28] dark:text-white mb-2 leading-snug">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── GOVERNANCE PROBLEMS ── */}
        <section className="py-20 bg-white dark:bg-slate-950" id="why">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                Governance Problems Build Quietly
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Most operational failures do not occur overnight. They are the cumulative result of subtle, compounding challenges that develop over weeks and months.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PROBLEM_CARDS.map((card) => (
                <Card key={card.title} className="p-6 hover:shadow-lg transition duration-300 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between group">
                  <div>
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2F0EA] dark:bg-slate-800 p-2.5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                      <img src={card.image} alt={card.title} className="h-full w-full object-contain" />
                    </div>
                    <h3 className="text-base font-bold text-[#1A3D28] dark:text-white mb-2">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{card.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#B0D4C0]/30 dark:border-slate-800 text-sm font-bold text-[#1E7D4F] dark:text-[#3DAB72]">
                    Addressed by Ordin Core
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-20 bg-[#F0F7F3] dark:bg-slate-900 border-y border-[#B0D4C0]/35 dark:border-slate-800" id="workflow">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                How Ordin Core Works
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                A structured, routine-driven governance loop designed to enforce operational transparency and continuous oversight.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-stretch">
              {WORKFLOW_STEPS.map((step) => (
                <Card key={step.title} className="p-5 dark:border-slate-800 dark:bg-slate-800/60 flex flex-col justify-between shadow-sm relative">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A3D28] dark:bg-emerald-600 text-sm font-black text-white shadow">
                        {step.number}
                      </span>
                      <div className="h-9 w-9 p-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm flex items-center justify-center border border-[#B0D4C0]/30 dark:border-slate-850">
                        <img src={step.image} alt={step.title} className="h-full w-full object-contain" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-[#1A3D28] dark:text-white mb-2 leading-tight">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-4">{step.description}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700/60 pt-3 italic">
                    {step.example}
                  </p>
                </Card>
              ))}

              {/* Quote card */}
              <Card key="quote" className="p-5 bg-[#E2F0EA] dark:bg-slate-950 border border-[#B0D4C0] dark:border-emerald-800/40 flex flex-col justify-between shadow">
                <div>
                  <p className="text-3xl font-serif text-[#1E7D4F] dark:text-emerald-500 leading-none mb-2">"</p>
                  <p className="text-sm font-bold text-[#1A3D28] dark:text-slate-200 leading-relaxed">
                    Ordin Core aligns daily activities to weekly reviews, ensuring that critical data is captured and reconstructable.
                  </p>
                </div>
                <div className="pt-4 flex justify-between items-end border-t border-[#B0D4C0]/50 dark:border-slate-800">
                  <img src={designedToSupportGovernanceImg} alt="" className="h-10 w-auto object-contain opacity-90" />
                  <span className="text-sm uppercase tracking-wider font-bold text-[#1E7D4F] dark:text-emerald-400">Assurance</span>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ── BUILT FOR ── */}
        <section className="py-20 bg-white dark:bg-slate-950" id="audience">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                Built for Operational & Governance Leadership
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Ordin Core supports every layer of care governance with tailored views, escalations, and insights.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {AUDIENCE_CARDS.map((card) => (
                <Card key={card.title} className="p-6 text-center hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[#E2F0EA] dark:bg-slate-800 p-2.5 flex items-center justify-center shadow-sm">
                      <img src={card.image} alt={card.title} className="h-full w-full object-contain" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1A3D28] dark:text-white mb-2">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{card.description}</p>
                  </div>
                  <div className="mt-4 text-sm uppercase font-bold tracking-wider text-[#1E7D4F] dark:text-[#3DAB72]">
                    Dedicated View
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4-COLUMN COMPARISON ── */}
        <section className="py-20 bg-[#F0F7F3] dark:bg-slate-900 border-t border-[#B0D4C0]/30 dark:border-slate-800" id="resources">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

              {/* Col 1 – Fragmented Visibility */}
              <Card className="p-6 space-y-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white leading-snug">
                  Fragmented Visibility Disrupts Oversight
                </h3>
                <ul className="space-y-2.5">
                  {["Different shifts and team rotations", "Multiple services, locations and branches", "Verbal updates and WhatsApp streams", "Siloed databases and custom spreadsheets", "Varying levels of management experience", "Inspection stress due to poor audit trails"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-350">
                      <CheckBadgeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-bold text-[#1E7D4F] dark:text-[#3DAB72]">
                  Ordin Core establishes a clean, unified workflow across your services.
                </p>
                <div className="flex gap-2 pt-1">
                  <img src={problemDifficultyOversightImg} alt="" className="h-14 w-14 rounded-xl border border-[#B0D4C0]/55 dark:border-slate-700 object-contain bg-white dark:bg-slate-800 p-1.5 shadow-sm" />
                  <img src={governanceDiff2Img} alt="" className="h-14 w-14 rounded-xl border border-[#B0D4C0]/55 dark:border-slate-700 object-contain bg-white dark:bg-slate-800 p-1.5 shadow-sm" />
                </div>
              </Card>

              {/* Col 2 – Not Another CMS */}
              <Card className="p-6 space-y-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white leading-snug">
                  Not Another Care Management System
                </h3>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Most platforms focus on:</p>
                  <ul className="space-y-2">
                    {["Daily care logs & charts", "Medication (eMAR) logs", "Staff shift rostering", "Basic incident capture", "Folders for static policies"].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-350">
                        <XMarkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-[#B0D4C0]/20 dark:border-slate-700/60 pt-3">
                  <p className="text-sm font-bold text-[#1E7D4F] dark:text-emerald-400 mb-2">Ordin Core focuses on:</p>
                  <ul className="space-y-2">
                    {["Governance visibility", "Worsening risk trajectories", "Active escalation tracking", "Assurance & rhythm oversight", "Regulatory inspection readiness"].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-white font-medium">
                        <CheckBadgeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* Col 3 – Designed for Operational Use */}
              <Card className="p-6 space-y-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white leading-snug">
                  Designed for Operational Use
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  We empower leadership teams to enforce compliance and oversight without overwhelming staff with paperwork.
                </p>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Our Workflow:</p>
                  <ul className="space-y-2">
                    {["Rapid 3-minute inputs", "Visual traffic-light summaries", "Action and ownership logs", "Clean role delegation", "Structured reviews"].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-350 font-medium">
                        <CheckBadgeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-[#B0D4C0]/20 dark:border-slate-700/60 pt-3">
                  <p className="text-sm font-bold text-slate-450 dark:text-slate-500 mb-2">Avoids:</p>
                  <ul className="space-y-2">
                    {["Duplicate log entries", "Lengthy essay formats", "Over-complicated software", "Administrative bloat"].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-500">
                        <XMarkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* Col 4 – Assurance Outcomes */}
              <Card className="p-6 space-y-4 dark:border-slate-800 dark:bg-slate-800/50">
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white leading-snug">
                  Uncompromised Oversight & Assurance
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Never worry about gaps in your governance audits during an inspection.
                </p>
                <ul className="space-y-2">
                  {["A continuous audit trail of decisions", "Reconstructable evidence for inspections", "Clean delegation and task handovers", "Immediate visibility of neglected houses", "Structured support for new managers"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-350">
                      <CheckBadgeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">This supports:</p>
                  <ul className="space-y-2">
                    {["Structured governance review", "Operational assurance", "Leadership continuity", "Internal oversight", "Inspection preparation"].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CheckBadgeIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ── EXAMPLE OUTPUTS ── */}
        <section className="py-20 bg-white dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                Example Governance Outputs
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Inspect high-fidelity previews of the key oversight screens compiled automatically by Ordin Core. Click any screen to open a detailed high-resolution interactive review.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-stretch">
              {GOVERNANCE_OUTPUTS.map((output) => (
                <div
                  key={output.name}
                  onClick={() => setActiveOutputDetail(output)}
                  className="text-center group cursor-pointer flex flex-col justify-between"
                >
                  <div className="mb-3 overflow-hidden rounded-2xl border border-[#B0D4C0] dark:border-slate-800 bg-[#F0F7F3] dark:bg-slate-900 hover:border-[#1E7D4F] dark:hover:border-slate-600 transition shadow-sm h-36 flex items-center justify-center relative">
                    <img
                      src={output.image}
                      alt={output.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-[#1A3D28]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="bg-white/95 dark:bg-slate-900/95 text-[#1A3D28] dark:text-white text-sm font-bold px-3 py-1.5 rounded-full shadow border border-brand-border">
                        Inspect Page
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#1A3D28] dark:text-slate-300 group-hover:text-[#1E7D4F] transition">
                    {output.label}
                  </p>
                </div>
              ))}

              <div className="rounded-3xl bg-slate-950 border border-slate-800 p-5 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
                <img src={designedToSupportGovernanceImg} alt="" className="h-10 w-10 object-contain opacity-80" />
                <div>
                  <p className="text-sm font-bold text-white leading-tight mb-1">View Real Reviews</p>
                  <p className="text-sm text-slate-500">Examine how data is presented</p>
                </div>
                <Button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full text-sm rounded-full py-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold transition"
                >
                  Request Live Demo →
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── PILOT PROGRAMME ── */}
        <section className="py-20 bg-[#F0F7F3] dark:bg-slate-900 border-t border-[#B0D4C0]/35 dark:border-slate-800" id="pilot">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 items-start">

              {/* Left */}
              <div className="space-y-8">
                <div>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                    Join the Ordin Core Pilot Programme
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-350">
                    We are selecting a limited cohort of supported living, mental health, and care providers in the UK to implement and refine governance structures inside real operational services.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-[#1A3D28] dark:text-white mb-5">Participating providers receive:</p>
                  <div className="grid grid-cols-5 gap-3">
                    {PILOT_BENEFITS.map((benefit) => (
                      <div key={benefit.label} className="flex flex-col items-center gap-2.5 text-center">
                        <div className="h-12 w-12 rounded-2xl border border-[#B0D4C0] dark:border-slate-800 bg-white dark:bg-slate-800 p-2.5 flex items-center justify-center shadow-sm">
                          <img src={benefit.image} alt={benefit.label} className="h-full w-full object-contain" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug font-semibold">{benefit.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => setIsPilotModalOpen(true)}
                  className="rounded-full gap-2 px-7 py-4 text-sm shadow-md hover:shadow-lg"
                >
                  Apply for Pilot Access
                  <img src={rightArrowImg} alt="" className="h-4 w-4 object-contain invert brightness-200" />
                </Button>
              </div>

              {/* Right */}
              <Card className="p-8 dark:border-slate-800 dark:bg-slate-800/80 shadow-xl border border-[#B0D4C0]/60">
                <h3 className="text-lg font-bold text-[#1A3D28] dark:text-white mb-3">
                  Governance is More Than Compliance Auditing
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-450 mb-6">
                  True governance lies in maintaining immediate cross-branch awareness of trends, and tracking leadership decisions properly from signal to closure:
                </p>
                <ul className="space-y-3.5">
                  {[
                    "Catching repeated shift concerns before they compound",
                    "Logging worsening risk trajectories across separate houses",
                    "Ensuring escalations always have clear ownership & actions",
                    "Validating whether corrective measures are actually working over time",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-350 font-medium">
                      <CheckBadgeIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 border-t border-[#B0D4C0]/20 dark:border-slate-700 pt-6 flex items-start gap-4">
                  <img src={governanceIsImg} alt="" className="h-10 w-10 shrink-0 object-contain opacity-85" />
                  <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
                    Ordin Core is engineered as an active, daily discipline that brings team leaders, managers, and directors into a robust, synchronized assurance loop.
                  </p>
                </div>
              </Card>

            </div>
          </div>
        </section>

        {/* ── PILOT STRUCTURE & PRICING ── */}
        <section className="py-20 bg-white dark:bg-slate-950 border-t border-[#B0D4C0]/35 dark:border-slate-800" id="pricing">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">

            {/* Pilot Structure */}
            <div className="mx-auto max-w-2xl text-center mb-12">
              <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                12-Week Early Adopter Pilot
              </span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                Pilot Structure
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                A structured 12-week programme to embed governance rhythm inside real operational services.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-20">
              {PILOT_TIMELINE.map((item) => (
                <Card key={item.phase} className="p-6 dark:border-slate-800 dark:bg-slate-900 flex flex-col">
                  <p className="text-sm font-black uppercase tracking-wider text-[#1E7D4F] dark:text-[#3DAB72] mb-2">{item.phase}</p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-semibold">{item.label}</p>
                </Card>
              ))}
            </div>

            {/* Pricing */}
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                Early Adopter Pilot Pricing
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Founder pricing for the first cohort of providers. Limited to the first 10 providers.
              </p>
            </div>

            {/* Domiciliary & Community Care pricing */}
            <p className="text-sm font-black uppercase tracking-wider text-[#1A3D28] dark:text-white mb-5">
              Domiciliary &amp; Community Care Services
            </p>
            <div className="grid gap-6 lg:grid-cols-3 mb-14">
              {PILOT_PRICING_DOM.map((plan, idx) => (
                <Card
                  key={plan.tier}
                  className={`p-7 flex flex-col dark:bg-slate-900 ${idx === 1 ? "border-2 border-[#1E7D4F] dark:border-emerald-600 shadow-lg" : "dark:border-slate-800"}`}
                >
                  {idx === 1 && (
                    <span className="self-start mb-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-[#1A3D28] dark:text-white">{plan.tier}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{plan.scope}</p>
                  <p className="mb-5">
                    <span className="text-4xl font-extrabold text-[#1A3D28] dark:text-white">{plan.price}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400"> / month</span>
                  </p>
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <CheckBadgeIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setIsPilotModalOpen(true)}
                    className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition shadow-sm ${idx === 1 ? "bg-[#1E7D4F] hover:bg-[#1A3D28] text-white" : "border border-[#B0D4C0] dark:border-slate-700 text-[#1A3D28] dark:text-white hover:bg-[#E2F0EA]/40 dark:hover:bg-slate-800"}`}
                  >
                    Apply for Pilot Access →
                  </button>
                </Card>
              ))}
            </div>

            {/* Supported Living pricing */}
            <p className="text-sm font-black uppercase tracking-wider text-[#1A3D28] dark:text-white mb-5">
              Supported Living Services
            </p>
            <Card className="overflow-hidden dark:border-slate-800 dark:bg-slate-900 mb-16">
              <div className="grid grid-cols-2 bg-[#E2F0EA] dark:bg-slate-800 px-6 py-3 text-sm font-bold text-[#1A3D28] dark:text-white">
                <span>Services / Houses</span>
                <span className="text-right">Monthly Cost</span>
              </div>
              {PILOT_PRICING_SL.map((row) => (
                <div key={row.scope} className="grid grid-cols-2 px-6 py-3.5 border-t border-[#B0D4C0]/30 dark:border-slate-800 text-sm">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{row.scope}</span>
                  <span className="text-right font-bold text-[#1A3D28] dark:text-white">{row.price}</span>
                </div>
              ))}
            </Card>

            {/* Included / Guarantee / Expectations */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white mb-4">Included in Every Pilot</h3>
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
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white mb-4">Pilot Guarantee</h3>
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
                <h3 className="text-sm font-black text-[#1A3D28] dark:text-white mb-4">Pilot Expectations</h3>
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

        {/* ── FAQ ── */}
        <section className="py-20 bg-[#F0F7F3] dark:bg-slate-900 border-t border-[#B0D4C0]/35 dark:border-slate-800" id="faq">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1A3D28] dark:text-white sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <Card key={item.q} className="p-6 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="text-base font-bold text-[#1A3D28] dark:text-white mb-2">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white text-slate-700 border-t border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-900" id="footer">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5 mb-14">
            {/* Brand */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Ordin Core" className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-800" />
                <div className="leading-none">
                  <p className="text-sm font-black uppercase tracking-widest text-white">ordin</p>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">core</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-slate-500">
                Structured operational governance and assurance loops for supported living, community, and care services.
              </p>
              <div className="space-y-1.5 pt-2 text-sm">
                <a href="mailto:hello@ordincore.co.uk" className="block text-slate-400 hover:text-white transition-colors font-medium">
                  hello@ordincore.co.uk
                </a>
                <a href="mailto:pilot@ordincore.com" className="block text-slate-400 hover:text-white transition-colors font-medium">
                  pilot@ordincore.com — Pilot enquiries
                </a>
              </div>
            </div>

            {FOOTER_LINKS.map((section) => (
              <div key={section.title} className="space-y-4">
                <p className="text-sm font-black uppercase tracking-widest text-slate-200">{section.title}</p>
                <div className="space-y-2">
                  {section.links.map((link) => (
                    <a
                      key={link}
                      href={link === "Pilot Programme" ? "https://work.ordincore.co.uk" : "#"}
                      className="block text-sm text-slate-500 transition-colors hover:text-white font-medium"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 font-medium">
            <p>© 2026 Ordin Core Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-400">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400">Data Security</a>
              <a href="#" className="hover:text-slate-400">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── BOOK A DEMO MODAL ── */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#B0D4C0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-8 space-y-6">
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1A3D28] dark:text-white">
                Book an Ordin Core Demo
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-450">
                Experience how Ordin Core can transform cross-house operational oversight for your care services.
              </p>
            </div>

            {demoSubmitStatus === "success" ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckBadgeIcon className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-950 dark:text-white">Request Submitted!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-450">
                  Thank you for your interest. A member of our team will contact you shortly to schedule your demo.
                </p>
                <Button onClick={() => { setIsDemoModalOpen(false); setDemoSubmitStatus("idle"); }} className="w-full">
                  Close Window
                </Button>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Jane Smith"
                    value={demoFormName}
                    onChange={(e) => setDemoFormName(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="you@company.com"
                      value={demoFormEmail}
                      onChange={(e) => setDemoFormEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. +44 7123 456789"
                      value={demoFormPhone}
                      onChange={(e) => setDemoFormPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Organisation Name
                  </label>
                  <input
                    type="text"
                    name="organisation"
                    required
                    placeholder="Your organisation"
                    value={demoFormOrg}
                    onChange={(e) => setDemoFormOrg(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Role
                    </label>
                    <input
                      type="text"
                      name="role"
                      required
                      placeholder="e.g. Registered Manager"
                      value={demoFormRole}
                      onChange={(e) => setDemoFormRole(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Number of Services / Sites
                    </label>
                    <input
                      type="text"
                      name="number_of_services_sites"
                      required
                      placeholder="e.g. 5"
                      value={demoFormServices}
                      onChange={(e) => setDemoFormServices(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Type of Service
                    </label>
                    <select
                      name="type_of_service"
                      required
                      value={demoFormServiceType}
                      onChange={(e) => setDemoFormServiceType(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    >
                      <option value="">Select…</option>
                      <option value="Supported Living">Supported Living</option>
                      <option value="Mental Health Services">Mental Health Services</option>
                      <option value="Domiciliary & Community Care">Domiciliary &amp; Community Care</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Preferred Contact Method
                    </label>
                    <select
                      name="preferred_contact_method"
                      required
                      value={demoFormContactMethod}
                      onChange={(e) => setDemoFormContactMethod(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    >
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Message
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={demoFormMessage}
                    onChange={(e) => setDemoFormMessage(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                {demoSubmitStatus === "error" && (
                  <p className="text-xs text-red-500 font-semibold">{demoSubmitError || "Failed to submit. Please try again."}</p>
                )}

                <Button
                  type="submit"
                  disabled={demoSubmitStatus === "submitting"}
                  className="w-full rounded-xl bg-[#1E7D4F] hover:bg-[#1A3D28] text-white flex items-center justify-center gap-2 py-3 shadow"
                >
                  {demoSubmitStatus === "submitting" ? "Sending Request..." : "Request a Demo"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── JOIN PILOT PROGRAMME MODAL ── */}
      {isPilotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#B0D4C0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-8 space-y-6">
            <button
              onClick={() => setIsPilotModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1A3D28] dark:text-white">
                Join the Ordin Core Pilot Programme
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-450">
                Tell us about your service and the governance challenges you'd like Ordin Core to help with.
              </p>
            </div>

            {pilotSubmitStatus === "success" ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckBadgeIcon className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-950 dark:text-white">Application Submitted!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-450">
                  Thank you for your interest in the pilot programme. A member of our team will be in touch shortly.
                </p>
                <Button onClick={() => { setIsPilotModalOpen(false); setPilotSubmitStatus("idle"); }} className="w-full">
                  Close Window
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePilotSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Jane Smith"
                    value={pilotFormName}
                    onChange={(e) => setPilotFormName(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="you@company.com"
                      value={pilotFormEmail}
                      onChange={(e) => setPilotFormEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. +44 7123 456789"
                      value={pilotFormPhone}
                      onChange={(e) => setPilotFormPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Organisation Name
                  </label>
                  <input
                    type="text"
                    name="organisation"
                    required
                    placeholder="Your organisation"
                    value={pilotFormOrg}
                    onChange={(e) => setPilotFormOrg(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Role
                    </label>
                    <input
                      type="text"
                      name="role"
                      required
                      placeholder="e.g. Registered Manager"
                      value={pilotFormRole}
                      onChange={(e) => setPilotFormRole(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Number of Services / Sites
                    </label>
                    <input
                      type="text"
                      name="number_of_services_sites"
                      required
                      placeholder="e.g. 5"
                      value={pilotFormServices}
                      onChange={(e) => setPilotFormServices(e.target.value)}
                      className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Type of Service
                  </label>
                  <select
                    name="type_of_service"
                    required
                    value={pilotFormServiceType}
                    onChange={(e) => setPilotFormServiceType(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  >
                    <option value="">Select…</option>
                    <option value="Supported Living">Supported Living</option>
                    <option value="Mental Health Services">Mental Health Services</option>
                    <option value="Domiciliary & Community Care">Domiciliary &amp; Community Care</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Current Governance Challenge
                  </label>
                  <textarea
                    name="current_governance_challenge"
                    required
                    rows={3}
                    placeholder="What governance challenge are you currently facing?"
                    value={pilotFormChallenge}
                    onChange={(e) => setPilotFormChallenge(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    What would you like Ordin Core to help with?
                  </label>
                  <textarea
                    name="what_ordin_core_can_help_with"
                    required
                    rows={3}
                    placeholder="Tell us what you'd like to achieve."
                    value={pilotFormHelp}
                    onChange={(e) => setPilotFormHelp(e.target.value)}
                    className="w-full rounded-xl border border-[#B0D4C0] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm focus:border-[#1E7D4F] focus:outline-none dark:text-white"
                  />
                </div>

                <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name="consent_to_be_contacted"
                    required
                    checked={pilotFormConsent}
                    onChange={(e) => setPilotFormConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#B0D4C0] text-[#1E7D4F] focus:ring-[#1E7D4F]"
                  />
                  I consent to be contacted by Ordin Core about the pilot programme.
                </label>

                {pilotSubmitStatus === "error" && (
                  <p className="text-xs text-red-500 font-semibold">{pilotSubmitError || "Failed to submit. Please try again."}</p>
                )}

                <Button
                  type="submit"
                  disabled={pilotSubmitStatus === "submitting"}
                  className="w-full rounded-xl bg-[#1E7D4F] hover:bg-[#1A3D28] text-white flex items-center justify-center gap-2 py-3 shadow"
                >
                  {pilotSubmitStatus === "submitting" ? "Submitting Application..." : "Apply for Pilot Access"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── GOVERNANCE OUTPUTS LIGHTBOX ── */}
      {activeOutputDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-850 bg-slate-900 shadow-2xl p-6 flex flex-col space-y-4">
            <button
              onClick={() => setActiveOutputDetail(null)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition"
              aria-label="Close preview"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                {activeOutputDetail.label}
              </h3>
              <p className="text-xs text-slate-400">
                {activeOutputDetail.desc} — Captured live from Ordin Core operational dashboards.
              </p>
            </div>

            <div className="relative flex-1 overflow-auto rounded-xl border border-slate-850 bg-slate-950 flex items-center justify-center max-h-[70vh] min-h-[300px]">
              <img
                src={activeOutputDetail.image}
                alt={activeOutputDetail.label}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
              <p>Click Close or click outside to return</p>
              <Button onClick={() => setActiveOutputDetail(null)} className="py-1 px-4 text-xs h-8 bg-slate-850 border border-slate-750 text-white hover:bg-slate-750">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}