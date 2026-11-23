import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from "react";
import "./redesign.css";
import { PilotStructureSection, PricingTableSection } from "./PricingSection";

import logoImg from "./assets/logo-wordmark.png";
import logoDarkImg from "./assets/logo-wordmark-dark.png";

// Role-based screenshots (hero)
import roleTeamLeaderImg from "./assets/role_team_leader.png";
import roleRegisteredManagerImg from "./assets/role_registered_manager.png";
import roleResponsibleIndividualImg from "./assets/role_responsible_individual.png";
import roleDirectorImg from "./assets/role_director.png";

// Governance output screenshots (How It Works)
import outputPulseReviewImg from "./assets/output_pulse_review.png";
import outputRiskTrajectoryImg from "./assets/output_risk_trajectory.png";
import outputEscalationTrackingImg from "./assets/output_escalation_tracking.png";
import outputRhythmCompletionImg from "./assets/output_rhythm_completion.png";
import outputOversightNarrativeImg from "./assets/output_oversight_narrative.png";

// Website enquiries POST here; the Ordin Core backend emails them via the org's own SMTP.
const CONTACT_API = "https://work.ordincore.co.uk/api/v1/contact";
const LOGIN_URL = "https://work.ordincore.co.uk";

/* ─── Content (copy is exactly as on the current site) ─────────────────── */

const NAV_LINKS = [
  { label: "Why Ordin Core", href: "#why" },
  { label: "How It Works", href: "#workflow" },
  { label: "For Who", href: "#audience" },
  { label: "FAQ", href: "#faq" },
];

const HERO_TABS = [
  { key: "team leader", label: "Team Leader", image: roleTeamLeaderImg, alt: "team_leader screenshot" },
  { key: "registered manager", label: "Registered Manager", image: roleRegisteredManagerImg, alt: "registered_manager screenshot" },
  { key: "RI / nominated", label: "RI / Nominated", image: roleResponsibleIndividualImg, alt: "responsible_individual screenshot" },
  { key: "director", label: "Director", image: roleDirectorImg, alt: "director screenshot" },
];

const HERO_POINTS = [
  "See what is getting worse earlier across services",
  "Track escalations cleanly with assigned leadership actions",
  "Evidence robust governance to regulators dynamically",
];

const STATS = [
  { to: 3, prefix: "", suffix: " min", sr: "3 minutes", label: "Rapid 3-minute inputs" },
  { to: 2, prefix: "<", suffix: " weeks", sr: "Less than 2 weeks", label: "Typically less than two weeks to implement" },
  { to: 5, prefix: "", suffix: "", sr: "5", label: "Step governance loop" },
  { to: 4, prefix: "", suffix: "", sr: "4", label: "Dedicated role views" },
];

const FOUR_QUESTIONS = [
  { q: "What is getting worse?", a: "Identify recurring concerns and emerging operational pressures." },
  { q: "What needs our attention?", a: "Focus leadership time where it matters most." },
  { q: "Are we following through?", a: "Maintain visibility of actions, reviews and outcomes." },
  { q: "Can we demonstrate oversight over time?", a: "Maintain a structured, reconstructable record of governance activity." },
];

const PROBLEMS = [
  { title: "Repeated Concerns Across Shifts", description: "Small issues repeated over time can indicate larger operational pressure." },
  { title: "Escalations Losing Visibility", description: "Important concerns can become unclear once shifts change or teams rotate." },
  { title: "Risks Increasing Across Houses", description: "Leadership teams need clearer visibility of worsening patterns across services." },
  { title: "Actions Not Being Followed Through", description: "Operational actions should remain visible until completed and reviewed." },
  { title: "Over-Reliance on Memory & Messaging", description: "Critical oversight should not rely on WhatsApp messages, verbal updates or memory." },
  { title: "Difficulty Demonstrating Oversight", description: "Services often struggle to evidence operational governance during inspections." },
];

const FRAGMENTED = [
  "Different shifts and team rotations",
  "Multiple services, locations and branches",
  "Verbal updates and WhatsApp streams",
  "Siloed databases and custom spreadsheets",
  "Varying levels of management experience",
  "Inspection stress due to poor audit trails",
];

const WORKFLOW_STEPS = [
  { title: "Daily Governance Signal", description: "Operational concerns or pressures are identified and recorded.", example: "Examples: medication concern, repeated safeguarding themes, staffing instability, deterioration in service culture, repeated incidents.", output: "Governance Pulse Review", image: outputPulseReviewImg },
  { title: "Trajectory Awareness", description: "Repeated patterns and worsening concerns become visible over time.", example: "Patterns are analysed across services, shifts and teams.", output: "Cross-House Risk Trajectory", image: outputRiskTrajectoryImg },
  { title: "Escalation & Leadership Decisions", description: "Managers review concerns, assign actions and track operational follow-up.", example: "Decisions are recorded with ownership and timescales.", output: "Escalation Tracking View", image: outputEscalationTrackingImg },
  { title: "Weekly Governance Review", description: "Leadership teams conduct structured operational governance review across services.", example: "Risks, actions and progress are reviewed.", output: "Governance Rhythm Completion", image: outputRhythmCompletionImg },
  { title: "Oversight Narrative", description: "Governance visibility and leadership decisions remain reconstructable over time.", example: "Clear continuity of oversight is maintained.", output: "Monthly Oversight Narrative", image: outputOversightNarrativeImg },
];

const AUDIENCE = [
  { title: "Directors", description: "Cross-service governance visibility and operational oversight across multiple houses and teams." },
  { title: "Responsible Individuals / Nominated Individuals", description: "Structured assurance and clearer visibility of operational governance over time." },
  { title: "Registered Managers", description: "Daily operational review, escalation visibility and governance follow-up support." },
  { title: "Supported Living Providers", description: "Improved visibility across houses, staffing pressures and service-level concerns." },
  { title: "Mental Health & Community Services", description: "Supports governance review within complex and high-risk operational environments." },
];

const MOST_PLATFORMS = ["Daily care logs & charts", "Medication (eMAR) logs", "Staff shift rostering", "Basic incident capture", "Folders for static policies"];
const ORDIN_FOCUS = ["Governance visibility", "Worsening risk trajectories", "Active escalation tracking", "Assurance & rhythm oversight", "Regulatory inspection readiness"];
const OUR_WORKFLOW = ["Rapid 3-minute inputs", "Visual traffic-light summaries", "Action and ownership logs", "Clean role delegation", "Structured reviews"];
const AVOIDS = ["Duplicate log entries", "Lengthy essay formats", "Over-complicated software", "Administrative bloat"];
const OVERSIGHT = ["A continuous audit trail of decisions", "Reconstructable evidence for inspections", "Clean delegation and task handovers", "Immediate visibility of neglected houses", "Structured support for new managers"];
const SUPPORTS = ["Structured governance review", "Operational assurance", "Leadership continuity", "Internal oversight", "Inspection preparation"];

const PILOT_BENEFITS = ["Onboarding support", "Governance workflow guidance", "Structured review sessions", "Early platform access", "Direct feedback opportunities"];
const MORE_THAN_COMPLIANCE = [
  "Catching repeated shift concerns before they compound",
  "Logging worsening risk trajectories across separate houses",
  "Ensuring escalations always have clear ownership & actions",
  "Validating whether corrective measures are actually working over time",
];

const FAQS = [
  { q: "Is Ordin Core a care management system?", a: "No. Ordin Core is a governance oversight layer — it does not replace your care management system." },
  { q: "Does it replace care notes?", a: "No. Ordin Core sits alongside your care notes and existing records." },
  { q: "Does it replace incident systems?", a: "No. It brings governance concerns into a structured oversight process rather than replacing incident reporting." },
  { q: "How long does implementation take?", a: "Typically less than two weeks." },
  { q: "Is staff training provided?", a: "Yes. Onboarding and staff training are included." },
];

const FOOTER_COLUMNS = [
  { title: "Platform", links: [["Why Ordin Core", "#why"], ["How It Works", "#workflow"], ["For Who", "#audience"], ["Blog", "#"], ["Pilot Programme", "#pilot"]] },
  { title: "Resources", links: [["Governance Philosophy", "#"], ["Example Outputs", "#workflow"], ["Care Sector Insights", "#"]] },
  { title: "Company", links: [["About Us", "#"], ["Contact Us", "mailto:support@ordincore.co.uk"], ["Pilot Enquiries", "#apply"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy/"], ["Data Security", "/data-security.html"], ["Terms & Conditions", "/terms-of-service.html"]] },
];

/* ─── Small helpers ─────────────────────────────────────────────────────── */

// Moves the soft blue spotlight on .spot cards to follow the cursor.
const spot = (e: MouseEvent<HTMLElement>) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
};

const Check = ({ size = 18, color = "var(--accent)", width = 2.4 }: { size?: number; color?: string; width?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Field = ({ id, label, error, children }: { id: string; label: string; error?: string | false; children: ReactNode }) => (
  <div className="fld">
    <label htmlFor={id}>{label}</label>
    {children}
    {error ? <span className="ferr" id={`${id}-err`}>{error}</span> : null}
  </div>
);

type PilotForm = {
  name: string; email: string; phone: string; organisation: string; role: string;
  sites: string; serviceType: string; challenge: string; help: string; consent: boolean;
};
const EMPTY_FORM: PilotForm = { name: "", email: "", phone: "", organisation: "", role: "", sites: "", serviceType: "", challenge: "", help: "", consent: false };

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  const isDark = theme === "dark";

  const [heroTab, setHeroTab] = useState(0);
  const [step, setStep] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  // Pilot application form (inline — no modal, no email redirect)
  const [form, setForm] = useState<PilotForm>(EMPTY_FORM);
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const set = <K extends keyof PilotForm>(key: K, value: PilotForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const problems = {
    name: !form.name.trim() && "Enter your full name",
    email: !emailOk && "Enter a valid email address",
    phone: !form.phone.trim() && "Enter your phone number",
    organisation: !form.organisation.trim() && "Enter your organisation name",
    role: !form.role.trim() && "Enter your role",
    sites: !form.sites.trim() && "Enter the number of services or sites",
    serviceType: !form.serviceType && "Select a type of service",
    challenge: !form.challenge.trim() && "Tell us your current governance challenge",
    help: !form.help.trim() && "Tell us what you'd like to achieve",
    consent: !form.consent && "Please tick to give consent",
  };
  const err = (k: keyof typeof problems) => (tried ? problems[k] : false);
  const isValid = Object.values(problems).every((v) => !v);

  const handlePilotSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) { setTried(true); return; }
    setStatus("submitting");
    setSubmitError("");
    try {
      const response = await fetch(CONTACT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pilot",
          name: form.name,
          email: form.email,
          phone: form.phone,
          organisation: form.organisation,
          role: form.role,
          number_of_services_sites: form.sites,
          type_of_service: form.serviceType,
          current_governance_challenge: form.challenge,
          what_ordin_core_can_help_with: form.help,
          consent_to_be_contacted: form.consent ? "Yes" : "No",
        }),
      });
      const data = await response.json();
      if (data.success) {
        setStatus("success");
        setForm(EMPTY_FORM);
        setTried(false);
      } else {
        setStatus("error");
        setSubmitError(data.message || "Failed to submit pilot application.");
      }
    } catch (error) {
      setStatus("error");
      setSubmitError(error instanceof Error ? error.message : "An unexpected network error occurred.");
    }
  };

  const current = WORKFLOW_STEPS[step];

  return (
    <div className="oc">
      {/* ── NAVBAR (turns to frosted glass and shrinks on scroll) ── */}
      <header className="glass">
        <div className="wrap navin">
          <a href="#top" aria-label="Ordin Core" className="flex items-center">
            <img className="logo" src={isDark ? logoDarkImg : logoImg} alt="Ordin Core" />
          </a>
          <nav aria-label="Main" className="nav">
            {NAV_LINKS.map((l) => <a key={l.href} className="navlink" href={l.href}>{l.label}</a>)}
          </nav>
          <div className="flex items-center gap-2.5">
            <button type="button" className="icon-btn" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme">
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
            </button>
            <a className="navlink px-2 py-2.5 text-[15px] font-medium" href={LOGIN_URL}>Login</a>
            <a className="btn-p btn-sm" href="#apply">Book a Pilot</a>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section id="top" className="wrap hero">
          <div className="hero-grid stg">
            <div className="flex flex-col gap-6">
              <span className="chip eyebrow">Governance Oversight for Care Services</span>
              <h1 className="h1">Governance, Oversight and Assurance for Care Providers</h1>
              <p className="text-[19px] leading-relaxed text-[color:var(--text-2)] max-w-[560px]">Built for supported living, home care and community mental health services.</p>
            </div>
            <div className="flex flex-col gap-[22px]">
              <ul className="hero-points flex flex-col gap-3.5">
                <li><span className="chip ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg></span>{HERO_POINTS[0]}</li>
                <li><span className="chip ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg></span>{HERO_POINTS[1]}</li>
                <li><span className="chip ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg></span>{HERO_POINTS[2]}</li>
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                <a className="btn-p btn-lg" href="#apply">Book a Pilot</a>
                <a className="btn-s btn-lg" href="#workflow">View Governance Workflow</a>
                <a href="#apply" className="px-1 py-2.5 text-[15px] font-semibold no-underline">Join Pilot Programme <span className="nudge">→</span></a>
              </div>
            </div>
          </div>

          <div className="mt-14">
            <div className="seg rv" role="tablist" aria-label="Role views">
              <span className="pill" style={{ transform: `translateX(${heroTab * 100}%)` }} aria-hidden="true" />
              {HERO_TABS.map((t, i) => (
                <button key={t.key} type="button" role="tab" aria-selected={i === heroTab} className={i === heroTab ? "on" : ""} onClick={() => setHeroTab(i)}>{t.label}</button>
              ))}
            </div>
            <div className="relative">
              <div className="glow" aria-hidden="true" />
              <figure className="frame tilt" style={{ transformOrigin: "center top" }}>
                <div className="frame-bar">
                  <div className="flex items-center gap-3.5">
                    <div className="dots" aria-hidden="true"><span /><span /><span /></div>
                    <span className="text-[13px] font-semibold text-[color:var(--text-2)]">Role View: {HERO_TABS[heroTab].key}</span>
                  </div>
                  <span className="chip flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-current" />Live Session</span>
                </div>
                <div className="stack">
                  {HERO_TABS.map((t, i) => <img key={t.key} className={`shot ${i === heroTab ? "on" : ""}`} src={t.image} alt={t.alt} />)}
                </div>
                <figcaption className="flex flex-wrap justify-between gap-4 border-t border-[color:var(--line)] px-[18px] py-3.5 text-sm">
                  <span className="font-semibold">Interactive Screenshot View</span>
                  <span className="text-[color:var(--muted)]">Select tabs above to inspect actual platform dashboards</span>
                </figcaption>
              </figure>
            </div>
            <p className="rv mt-[18px] flex max-w-[760px] items-start gap-2.5 text-sm leading-relaxed text-[color:var(--muted)]">
              <Check color="var(--accent)" width={2.2} />
              Designed around real operational workflows and statutory duties within supported living, mental health, and community care environments.
            </p>
          </div>
        </section>

        {/* ── AT A GLANCE (count-up stats) ── */}
        <section aria-label="Ordin Core at a glance" className="wrap pt-[88px]">
          <div className="stg grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {STATS.map((s) => (
              <div key={s.label} className="spot card p-6" onMouseMove={spot}>
                <div className="stat-num">
                  {s.prefix && <span className="text-[30px]" aria-hidden="true">{s.prefix}</span>}
                  <span className="count" style={{ "--to": s.to } as CSSProperties} aria-hidden="true" />
                  {s.suffix && <span className="text-2xl" aria-hidden="true">{s.suffix}</span>}
                  <span className="sr">{s.sr}</span>
                </div>
                <div className="mt-2.5 text-[15px] text-[color:var(--text-2)]">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── THE FOUR QUESTIONS (line draws across on scroll) ── */}
        <section id="why" className="wrap pt-28">
          <h2 className="rv max-w-[640px] text-[clamp(28px,3vw,38px)] font-bold leading-[1.15]">The Four Questions Every Leadership Team Needs Answered</h2>
          <div className="qwrap">
            <div className="qline" aria-hidden="true"><span /></div>
            <ol className="stg grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              {FOUR_QUESTIONS.map((item, i) => (
                <li key={item.q} className="flex flex-col gap-3 pr-4">
                  <span className="qdot">{i + 1}</span>
                  <h3 className="mt-2 text-xl font-semibold leading-snug">{item.q}</h3>
                  <p className="text-[15px] leading-relaxed text-[color:var(--text-2)]">{item.a}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── GOVERNANCE PROBLEMS (bento) ── */}
        <section className="wrap sec">
          <div className="rv sec-head">
            <h2 className="h2">Governance Problems Build Quietly</h2>
            <p className="lead">Most operational failures do not occur overnight. They are the cumulative result of subtle, compounding challenges that develop over weeks and months.</p>
          </div>
          <div className="bento stg mt-12">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="spot flex flex-col gap-2.5 rounded-[18px] border border-[color:var(--line)] p-[26px]" onMouseMove={spot}>
                {i === 0 && (
                  <div className="grow mb-[18px] flex h-[150px] items-end gap-2.5 border-b border-[color:var(--line)] px-0.5" aria-hidden="true">
                    {[18, 26, 34, 48, 66, 92].map((h, j) => (
                      <span key={h} style={{ height: `${h}%`, background: j === 5 ? "var(--brand)" : j === 4 ? "color-mix(in srgb, var(--brand) 55%, var(--line-strong))" : "var(--line-strong)" }} />
                    ))}
                  </div>
                )}
                <h3 className={`${i === 0 ? "text-[26px]" : "text-lg"} font-semibold leading-tight`}>{p.title}</h3>
                <p className="text-[15px] leading-relaxed text-[color:var(--text-2)]">{p.description}</p>
                <span className="mt-auto pt-2 text-[13px] font-semibold text-[color:var(--accent-ink)]">Addressed by Ordin Core</span>
              </div>
            ))}
          </div>
          <div className="rv mt-4 flex flex-col gap-[18px] rounded-[18px] bg-[color:var(--accent-soft)] p-7">
            <h3 className="text-lg font-bold text-[color:var(--accent-ink)]">Fragmented Visibility Disrupts Oversight</h3>
            <ul className="pill-list stg flex flex-wrap gap-2.5">
              {FRAGMENTED.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="text-base font-semibold">Ordin Core establishes a clean, unified workflow across your services.</p>
          </div>
        </section>

        {/* ── HOW IT WORKS (autoplaying steps + matching screenshot) ── */}
        <section id="workflow" className="band">
          <div className="wrap sec">
            <div className="rv sec-head">
              <h2 className="h2">How Ordin Core Works</h2>
              <p className="lead">A structured, routine-driven governance loop designed to enforce operational transparency and continuous oversight.</p>
            </div>
            <div className="mt-14 flex flex-wrap items-start gap-10">
              <div className="steps flex min-w-0 flex-[1_1_320px] flex-col gap-2">
                <div role="tablist" aria-label="Governance loop steps" className="stg flex flex-col gap-2">
                  {WORKFLOW_STEPS.map((s, i) => (
                    <button key={s.title} type="button" role="tab" aria-selected={i === step} className={`step ${i === step ? "on" : ""}`}
                      onClick={() => { setStep(i); setAutoplay(false); }}>
                      <span className="num">{i + 1}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="text-[17px] font-semibold">{s.title}</span>
                        <span className="sbody text-[15px] leading-normal text-[color:var(--band-text-2)]">{s.description}</span>
                        <span className="sbody text-sm leading-normal text-[color:var(--band-accent)]">{s.example}</span>
                        {autoplay && i === step && (
                          <span className="prog" aria-hidden="true">
                            {/* key restarts the 6s bar for each step; the next step starts when it finishes */}
                            <span key={step} onAnimationEnd={(e) => { if (e.animationName === "oc-prog") setStep((p) => (p + 1) % WORKFLOW_STEPS.length); }} />
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <button type="button" className="auto-btn" onClick={() => setAutoplay((a) => !a)}>
                  {autoplay
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>}
                  {autoplay ? "Pause autoplay" : "Play autoplay"}
                </button>
              </div>

              <figure className="rv sticky-fig flex min-w-0 flex-[999_1_600px] flex-col gap-[18px]">
                <div className="overflow-hidden rounded-2xl border border-[color:var(--band-line)] bg-[color:var(--surface)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line)] bg-[color:var(--surface-2)] px-[18px] py-3 text-[color:var(--text)]">
                    <span className="text-sm font-semibold">{current.output}</span>
                    <span className="text-xs text-[color:var(--muted)]">{step + 1} / {WORKFLOW_STEPS.length}</span>
                  </div>
                  <div className="stack">
                    {WORKFLOW_STEPS.map((s, i) => <img key={s.output} className={`shot ${i === step ? "on" : ""}`} src={s.image} alt={s.output} />)}
                  </div>
                </div>
                <figcaption className="flex items-start gap-4 pt-1">
                  <span className="display text-[40px] font-bold leading-[0.9] text-[color:var(--band-accent)]" aria-hidden="true">“</span>
                  <span className="flex flex-col gap-2">
                    <span className="text-[17px] font-medium leading-normal">Ordin Core aligns daily activities to weekly reviews, ensuring that critical data is captured and reconstructable.</span>
                    <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[color:var(--band-accent)]">Assurance</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ── BUILT FOR ── */}
        <section id="audience" className="wrap sec">
          <div className="rv sec-head">
            <h2 className="h2">Built for Operational &amp; Governance Leadership</h2>
            <p className="lead">Ordin Core supports every layer of care governance with tailored views, escalations, and insights.</p>
          </div>
          <div className="stg mt-10 overflow-hidden rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface)]">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="row">
                <h3 className="flex-[1_1_260px] text-lg font-semibold leading-snug">{a.title}</h3>
                <p className="flex-[2_1_380px] text-[15px] leading-relaxed text-[color:var(--text-2)]">{a.description}</p>
                <a href="#top" className="flex-none text-sm font-semibold no-underline">Dedicated View <span className="nudge">→</span></a>
              </div>
            ))}
          </div>
        </section>

        {/* ── NOT ANOTHER CARE MANAGEMENT SYSTEM ── */}
        <section className="border-y border-[color:var(--line)] bg-[color:var(--surface-2)]">
          <div className="wrap sec flex flex-col gap-14">
            <div className="flex flex-col gap-7">
              <h2 className="rv h2">Not Another Care Management System</h2>
              <div className="stg grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
                <div className="spot flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] p-7" onMouseMove={spot}>
                  <span className="text-[15px] font-bold text-[color:var(--muted)]">Most platforms focus on:</span>
                  <ul className="flex flex-col gap-3 text-base text-[color:var(--text-2)]">{MOST_PLATFORMS.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div className="spot flex flex-col gap-4 rounded-2xl border-2 border-[color:var(--brand)] p-7" onMouseMove={spot}>
                  <span className="text-[15px] font-bold text-[color:var(--accent-ink)]">Ordin Core focuses on:</span>
                  <ul className="flex flex-col gap-3 text-base font-semibold">{ORDIN_FOCUS.map((x) => <li key={x} className="flex items-center gap-2.5"><Check width={2.6} />{x}</li>)}</ul>
                </div>
              </div>
            </div>
            <div className="stg grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
              <div className="spot flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] p-7" onMouseMove={spot}>
                <h3 className="text-[22px] font-bold">Designed for Operational Use</h3>
                <p className="text-base leading-relaxed text-[color:var(--text-2)]">We empower leadership teams to enforce compliance and oversight without overwhelming staff with paperwork.</p>
                <div className="mt-1 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                  <div className="flex flex-col gap-2.5"><span className="text-sm font-bold">Our Workflow:</span>{OUR_WORKFLOW.map((x) => <span key={x} className="text-[15px] text-[color:var(--text-2)]">✓ {x}</span>)}</div>
                  <div className="flex flex-col gap-2.5"><span className="text-sm font-bold">Avoids:</span>{AVOIDS.map((x) => <span key={x} className="text-[15px] text-[color:var(--muted)]">✕ {x}</span>)}</div>
                </div>
              </div>
              <div className="spot flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] p-7" onMouseMove={spot}>
                <h3 className="text-[22px] font-bold">Uncompromised Oversight &amp; Assurance</h3>
                <p className="text-base leading-relaxed text-[color:var(--text-2)]">Never worry about gaps in your governance audits during an inspection.</p>
                <div className="mt-1 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                  <div className="flex flex-col gap-2.5">{OVERSIGHT.map((x) => <span key={x} className="text-[15px] text-[color:var(--text-2)]">✓ {x}</span>)}</div>
                  <div className="flex flex-col gap-2.5"><span className="text-sm font-bold">This supports:</span>{SUPPORTS.map((x) => <span key={x} className="text-[15px] text-[color:var(--text-2)]">{x}</span>)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PILOT PROGRAMME + INLINE APPLICATION FORM ── */}
        <section id="pilot" className="wrap sec grid items-start gap-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
          <div className="flex flex-col gap-6">
            <div className="rv flex flex-col gap-6">
              <h2 className="h2">Join the Ordin Core Pilot Programme</h2>
              <p className="lead">We are selecting a limited cohort of supported living, mental health, and care providers in the UK to implement and refine governance structures inside real operational services.</p>
              <span className="text-[15px] font-bold">Participating providers receive:</span>
              <ul className="stg grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                {PILOT_BENEFITS.map((b) => (
                  <li key={b} className="spot flex items-center gap-2.5 rounded-xl border border-[color:var(--line)] px-4 py-3.5 text-[15px] font-medium" onMouseMove={spot}><Check />{b}</li>
                ))}
              </ul>
            </div>
            <div className="rv band flex flex-col gap-[18px] rounded-[20px] p-8">
              <h3 className="text-[22px] font-bold leading-tight">Governance is More Than Compliance Auditing</h3>
              <p className="text-base leading-relaxed text-[color:var(--band-text-2)]">True governance lies in maintaining immediate cross-branch awareness of trends, and tracking leadership decisions properly from signal to closure:</p>
              <ul className="flex flex-col gap-3">
                {MORE_THAN_COMPLIANCE.map((x) => (
                  <li key={x} className="flex gap-3 text-[15px] leading-normal"><span className="mt-[7px] h-2 w-2 flex-none rounded-full bg-[color:var(--band-accent)]" />{x}</li>
                ))}
              </ul>
              <p className="border-t border-[color:var(--band-line)] pt-[18px] text-[15px] leading-relaxed text-[color:var(--band-text-2)]">Ordin Core is engineered as an active, daily discipline that brings team leaders, managers, and directors into a robust, synchronized assurance loop.</p>
            </div>
          </div>

          <div id="apply" className="rv sticky top-24 rounded-[20px] border border-[color:var(--line)] bg-[color:var(--surface)] p-8">
            {status === "success" ? (
              <div role="status" className="flex flex-col items-center gap-3.5 px-2 py-10 text-center">
                <span className="chip pop-in flex h-16 w-16 items-center justify-center rounded-full">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
                </span>
                <h3 className="text-2xl font-bold">Application Submitted!</h3>
                <p className="max-w-[380px] text-base leading-relaxed text-[color:var(--text-2)]">Thank you for your interest in the pilot programme. A member of our team will be in touch shortly.</p>
                <button type="button" className="mt-2 min-h-[44px] bg-transparent text-sm font-semibold text-[color:var(--link)]" onClick={() => setStatus("idle")}>Submit another application</button>
              </div>
            ) : (
              <form onSubmit={handlePilotSubmit} noValidate className="flex flex-col gap-[18px]">
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-bold leading-tight">Apply for Pilot Access</h3>
                  <p className="text-[15px] leading-normal text-[color:var(--text-2)]">Tell us about your service and the governance challenges you'd like Ordin Core to help with.</p>
                </div>
                <Field id="pf-name" label="Full Name" error={err("name")}>
                  <input id="pf-name" type="text" name="name" autoComplete="name" placeholder="Jane Smith" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!err("name")} />
                </Field>
                <div className="grid-2">
                  <Field id="pf-email" label="Email Address" error={err("email")}>
                    <input id="pf-email" type="email" name="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!err("email")} />
                  </Field>
                  <Field id="pf-phone" label="Phone Number" error={err("phone")}>
                    <input id="pf-phone" type="tel" name="phone" autoComplete="tel" placeholder="e.g. +44 7123 456789" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!err("phone")} />
                  </Field>
                </div>
                <Field id="pf-org" label="Organisation Name" error={err("organisation")}>
                  <input id="pf-org" type="text" name="organisation" autoComplete="organization" placeholder="Your organisation" value={form.organisation} onChange={(e) => set("organisation", e.target.value)} aria-invalid={!!err("organisation")} />
                </Field>
                <div className="grid-2">
                  <Field id="pf-role" label="Role" error={err("role")}>
                    <input id="pf-role" type="text" name="role" autoComplete="organization-title" placeholder="e.g. Registered Manager" value={form.role} onChange={(e) => set("role", e.target.value)} aria-invalid={!!err("role")} />
                  </Field>
                  <Field id="pf-sites" label="Number of Services / Sites" error={err("sites")}>
                    <input id="pf-sites" type="text" inputMode="numeric" name="number_of_services_sites" placeholder="e.g. 5" value={form.sites} onChange={(e) => set("sites", e.target.value)} aria-invalid={!!err("sites")} />
                  </Field>
                </div>
                <Field id="pf-type" label="Type of Service" error={err("serviceType")}>
                  <select id="pf-type" name="type_of_service" value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)} aria-invalid={!!err("serviceType")}>
                    <option value="">Select…</option>
                    <option value="Supported Living">Supported Living</option>
                    <option value="Mental Health Services">Mental Health Services</option>
                    <option value="Domiciliary & Community Care">Domiciliary &amp; Community Care</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field id="pf-challenge" label="Current Governance Challenge" error={err("challenge")}>
                  <textarea id="pf-challenge" name="current_governance_challenge" rows={3} placeholder="What governance challenge are you currently facing?" value={form.challenge} onChange={(e) => set("challenge", e.target.value)} aria-invalid={!!err("challenge")} />
                </Field>
                <Field id="pf-help" label="What would you like Ordin Core to help with?" error={err("help")}>
                  <textarea id="pf-help" name="what_ordin_core_can_help_with" rows={3} placeholder="Tell us what you'd like to achieve." value={form.help} onChange={(e) => set("help", e.target.value)} aria-invalid={!!err("help")} />
                </Field>
                <div className="fld">
                  <label htmlFor="pf-consent" className="flex cursor-pointer items-start gap-3 text-sm font-medium leading-normal text-[color:var(--text-2)]">
                    <input id="pf-consent" type="checkbox" name="consent_to_be_contacted" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
                    I consent to be contacted by Ordin Core about the pilot programme.
                  </label>
                  {err("consent") ? <span className="ferr">{err("consent")}</span> : null}
                </div>
                {status === "error" && <p className="ferr" role="alert">{submitError || "Failed to submit. Please try again."}</p>}
                <button type="submit" className="btn-p btn-lg w-full" disabled={status === "submitting"}>
                  {status === "submitting" ? "Submitting Application..." : "Apply for Pilot Access"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* ── PILOT STRUCTURE & PRICING ──
             Hidden from the public site until commercial terms are ready to go live. Kept in the
             code (PricingSection.tsx) so it isn't lost by the 23 Nov 2026 redesign -- re-enable by
             changing `{false && (` back to `{(`. */}
        {false && (
          <>
            <PilotStructureSection />
            <PricingTableSection />
          </>
        )}

        {/* ── FAQ ── */}
        <section id="faq" className="wrap max-w-[820px] pb-28 pt-4">
          <h2 className="rv text-center text-[clamp(28px,3vw,38px)] font-bold leading-[1.12]">Frequently Asked Questions</h2>
          <div className="stg mt-10 border-t border-[color:var(--line)]">
            {FAQS.map((f, i) => (
              <div key={f.q} className="border-b border-[color:var(--line)]">
                <button type="button" className="faq-q" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  <span className="text-lg font-semibold">{f.q}</span>
                  <svg className={`chev ${openFaq === i ? "open" : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {openFaq === i && <p className="max-w-[680px] px-1 pb-6 text-base leading-relaxed text-[color:var(--text-2)]">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="band">
        <div className="wrap flex flex-col gap-12 pb-9 pt-[72px]">
          <div className="grid gap-8 text-[15px] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            <div className="col-span-2 flex flex-col gap-3.5">
              <img src={logoDarkImg} alt="Ordin Core" className="h-9 w-auto self-start" />
              <p className="max-w-[340px] leading-relaxed text-[color:var(--band-text-2)]">Structured operational governance and assurance loops for supported living, community, and care services.</p>
              <a href="mailto:support@ordincore.co.uk" className="flink">support@ordincore.co.uk</a>
              <a href="mailto:support@ordincore.co.uk" className="flink">support@ordincore.co.uk — Pilot enquiries</a>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-2.5">
                <span className="font-bold">{col.title}</span>
                {col.links.map(([label, href]) => <a key={label} href={href} className="flink">{label}</a>)}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-[color:var(--band-line)] pt-6 text-[13px] text-[color:var(--band-text-2)]">
            <span>© 2026 Ordin Core Inc. All rights reserved.</span>
            <span className="flex gap-5">
              <a href="/privacy/" className="flink">Privacy Policy</a>
              <a href="/data-security.html" className="flink">Data Security</a>
              <a href="/terms-of-service.html" className="flink">Terms of Service</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
