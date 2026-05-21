import React, { useEffect } from "react";

/* ─── Redirection Link ─────────────────────────────────── */
const APP_LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "https://work.ordincore.co.uk/login";

const handleRedirect = () => {
  window.location.href = APP_LOGIN_URL;
};

/* ─── Shared Layout & Sidebar ──────────────────────────── */
interface SubpageLayoutProps {
  category: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

const SubpageLayout: React.FC<SubpageLayoutProps> = ({ category, title, subtitle, children, sidebar }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="oc-section" style={{ minHeight: "80vh", paddingTop: "52px" }}>
      <div className="oc-hero-tag" style={{ marginBottom: "16px" }}>{category}</div>
      <h1 className="oc-section-h2" style={{ fontSize: "36px", marginBottom: "12px", textAlign: "left", lineHeight: 1.2 }}>
        {title}
      </h1>
      <p className="oc-section-sub" style={{ margin: "0 0 40px 0", textAlign: "left", maxWidth: "800px", fontSize: "16px" }}>
        {subtitle}
      </p>

      <div className="oc-grid-2" style={{ gridTemplateColumns: "1.25fr 0.75fr", gap: "48px", marginTop: 0, alignItems: "start" }}>
        {/* Main Content Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", textAlign: "left" }}>
          {children}

          {/* CTA Component */}
          <div className="oc-card" style={{ marginTop: "40px", border: "1.5px solid var(--oc-sky)", background: "rgba(91, 159, 212, 0.04)" }}>
            <h3 className="oc-card-title" style={{ fontSize: "18px", marginBottom: "8px" }}>Ready to Implement Defensible Care Governance?</h3>
            <p style={{ fontSize: "13px", color: "var(--oc-muted)", lineHeight: 1.6, marginBottom: "20px" }}>
              Join the Ordin Core Pilot Programme or book a detailed walk-through session to see how continuous, evidence-based oversight transforms operational assurance.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button className="oc-btn-primary" onClick={handleRedirect}>Join Pilot Programme</button>
              <button className="oc-btn-outline" onClick={handleRedirect}>Book a Demo</button>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div>
          {sidebar || (
            <div className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ borderBottom: "1px solid var(--oc-border)", paddingBottom: "12px" }}>
                <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--oc-heading)" }}>ORDIN CORE DOCTRINE</h4>
                <p style={{ fontSize: "11px", color: "var(--oc-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>The Evidence Advantage</p>
              </div>

              {[
                { title: "Continuous Evidence Chain", desc: "Every risk entry is built directly from daily observation signals—no manual creation or undocumented changes." },
                { title: "Registered Manager Decision", desc: "We believe in human-in-the-loop oversight. The system proposes pattern candidates; the manager decides." },
                { title: "Immutable Audit Trail", desc: "Oversight decisions, resolution notes, and weekly reviews remain completely tamper-proof." }
              ].map(item => (
                <div key={item.title}>
                  <h5 style={{ fontSize: "13px", fontWeight: 600, color: "var(--oc-heading)", marginBottom: "4px" }}>{item.title}</h5>
                  <p style={{ fontSize: "12px", color: "var(--oc-muted)", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── PLATFORM PAGES ───────────────────────────────────── */

export const PlatformOverview: React.FC = () => (
  <SubpageLayout
    category="Platform // Overview"
    title="Governance Intelligence for Regulated Care"
    subtitle="Continuous, evidence-based, and inspection-ready. Learn how Ordin Core drives operational assurance."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Ordin Core is a <strong>governance intelligence platform</strong> built specifically for regulated care environments. Unlike traditional compliance tools that serve as static document repositories, Ordin Core bridges the gap between daily operations and executive oversight.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      The Signal → Pattern → Risk Pathway
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      At the heart of the platform is a strict <strong>Signal → Pattern → Risk</strong> workflow.
      No formal risk is ever auto-created by an algorithm. Instead, the platform aggregates factual, frontline observations as <em>signals</em>, groups them into recurring <em>patterns</em> using multi-site correlation, and presents them as risk candidates. Registered Managers maintain complete human-in-the-loop control, promoting patterns to formal risks only when clinical or operational judgment warrants.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Why This Matters for Directors
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Without this structure, corporate risk registers fill with unsubstantiated entries, operational concerns remain isolated, and leadership teams find themselves blind to systemic failures until an incident occurs. Ordin Core turns daily observation into a defensible oversight record, making your organization continuously inspection-ready.
    </p>
  </SubpageLayout>
);

export const PlatformSignals: React.FC = () => (
  <SubpageLayout
    category="Platform // Governance Signals"
    title="The 12-Field Structured Governance Pulse"
    subtitle="Factual frontline observations recorded in real time. Structuring data at the source."
    sidebar={
      <div className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--oc-heading)", borderBottom: "1px solid var(--oc-border)", paddingBottom: "10px" }}>THE 12 PULSE FIELDS</h4>
        <ol style={{ paddingLeft: "16px", fontSize: "12px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li>Observation Date & Time</li>
          <li>Service / House Selector</li>
          <li>Related Person (Anonymised)</li>
          <li>Signal Type (Medication, Staffing...)</li>
          <li>Risk Domains (Multi-Select)</li>
          <li>Facts-Only Description</li>
          <li>Immediate Action Taken</li>
          <li>Severity Rating (Low - Critical)</li>
          <li>Prior Recurrence Check</li>
          <li>Pattern Concern Indicator</li>
          <li>Required Escalation Pathway</li>
          <li>Optional File Evidence</li>
        </ol>
      </div>
    }
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      The <strong>Governance Pulse</strong> is a highly structured, always-open signal capture form designed for Team Leaders and frontline staff. By forcing context first (date, service, risk domains) and factual descriptions second, it eliminates biased opinions and captures raw, structured operational data.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Facts-Only Capture
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Standard care logs are often written as qualitative narratives that are difficult to analyze. The Governance Pulse solves this by separating factual observations (what happened) from assessment (how severe and recurring). The multi-select <strong>Risk Domain</strong> mapping allows the pattern engine to detect cross-site trends—such as staffing issues in House A correlating with medication errors in House B.
    </p>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Every single signal submitted is securely timestamped, attributed to the logged-in user, and mapped to a specific house, creating an immutable audit trail.
    </p>
  </SubpageLayout>
);

export const PlatformRiskTrajectory: React.FC = () => (
  <SubpageLayout
    category="Platform // Risk Trajectory"
    title="Risk Trajectory & Directional Trends"
    subtitle="Tracking the movement of risk over time. Proving action effectiveness."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Risks in regulated care are never static. They shift daily depending on staffing, clinical conditions, and environment. Ordin Core moves beyond flat spreadsheets by introducing <strong>Risk Trajectory</strong>.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Directional Movements
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Each active risk carries a trajectory value: <code style={{ color: "var(--oc-sky)", fontWeight: "bold" }}>Improving</code>, <code style={{ color: "#4CAF81", fontWeight: "bold" }}>Stable</code>, <code style={{ color: "#EF5350", fontWeight: "bold" }}>Deteriorating</code>, or <code style={{ color: "#EF5350", fontWeight: "bold" }}>Critical</code>. The trajectory is updated:
    </p>
    <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
      <li><strong>Automatically</strong> based on action effectiveness ratings (e.g., consecutive effective responses shift a risk to <em>Improving</em>).</li>
      <li><strong>Manually</strong> by the Registered Manager during weekly reviews based on clinical progress.</li>
      <li><strong>By the Pattern Engine</strong> when incoming frontline signals show severity progression within a specific risk domain.</li>
    </ul>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)" }}>
      Cross-House Risk Trajectory Dashboard
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Directors and Responsible Individuals can access a 6-week rolling trajectory trend line across all homes. A climbing trend indicates active deterioration—allowing you to allocate resources and intervene before an incident occurs.
    </p>
  </SubpageLayout>
);

export const PlatformEscalations: React.FC = () => (
  <SubpageLayout
    category="Platform // Escalations"
    title="Threshold-Based Escalations & Closed-Loop Actions"
    subtitle="Eliminating guesswork. Defending care quality with immutable workflows."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Governance failures often stem from slow responses to repeating concerns. Ordin Core solves this by replacing guesswork with <strong>strict escalation rules</strong> that trigger automatically based on signal thresholds.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Automated Threshold Rules
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      The platform enforces standardized operational rules:
    </p>
    <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
      <li><strong>Rule 2</strong>: If 5 or more same-domain signals are recorded in 10 days, or if 2 signals are marked <em>Escalating</em>, a mandatory "Risk Review" is flagged.</li>
      <li><strong>Rule 3</strong>: A single <em>Critical</em> or 2 <em>High</em> severity signals within 48 hours automatically triggers an "Immediate Risk Consideration" workflow.</li>
    </ul>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)" }}>
      Closed-Loop Actions & SLA
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Once logged, escalations are <strong>immutable</strong>—only resolutions can be appended. When an action is completed, the staff member must record the outcome (e.g., <em>Risk reduced</em>) and a clear clinical rationale. Registered Managers must validate this impact, directly closing the loop and rating action effectiveness.
    </p>
  </SubpageLayout>
);

export const PlatformWeeklyReview: React.FC = () => (
  <SubpageLayout
    category="Platform // Weekly Review"
    title="The 15-Step Weekly Governance Review"
    subtitle="Operational closure and oversight validation. A strict sequence for defensible management."
    sidebar={
      <div className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--oc-heading)", borderBottom: "1px solid var(--oc-border)", paddingBottom: "10px" }}>15 REVIEW STEPS</h4>
        <ul style={{ paddingLeft: "16px", fontSize: "11px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>1. Define Scope & Services</li>
          <li>2. Pull Pulse Count & Raw Signals</li>
          <li>3. Identify Repeating Signals</li>
          <li>4. Review Escalated Concerns</li>
          <li>5. Highlight Protective Signals</li>
          <li>6. Record Leadership Interpretation</li>
          <li>7. Map to Risk Register Entries</li>
          <li>8. Update Trajectory Proposals</li>
          <li>9. Confirm Control Failures</li>
          <li>10. Decisions Required</li>
          <li>11. Log Agreed Actions</li>
          <li>12. Set Overall Service Position</li>
          <li>13. Lock Governance Narrative</li>
          <li>14. Finalise Review (RM)</li>
          <li>15. Validate Review (RI)</li>
        </ul>
      </div>
    }
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      The weekly review is the core governance rhythm of the platform. Instead of a freeform email or meeting log, Registered Managers follow a strict, mandatory <strong>15-step sequence</strong> to review raw signals, map them to patterns, and document control effectiveness.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Service Position & Joint Validation
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      At the end of the review, the RM assigns an <strong>Overall Service Position</strong> (<code style={{ color: "#4CAF81" }}>Stable</code>, <code style={{ color: "var(--oc-sky)" }}>Watch</code>, <code style={{ color: "#EF5350" }}>Concern</code>, <code style={{ color: "#EF5350" }}>Escalating</code>, or <code style={{ color: "#EF5350" }}>Serious Concern</code>) and locks a final governance narrative.
    </p>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      This review requires <strong>two-stage joint validation</strong>: operational closure by the Registered Manager, followed by oversight approval by the Responsible Individual (RI). This process ensures that leadership cannot claim ignorance of service-level trends.
    </p>
  </SubpageLayout>
);

export const PlatformReports: React.FC = () => (
  <SubpageLayout
    category="Platform // Reporting"
    title="Inspection-Ready Governance Analytics"
    subtitle="Exportable board reports, safeguarding trend analyses, and CQC evidence packs."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Ordin Core structures your daily operational activity into pre-built, boardroom-ready reports. Directors can generate analytical insights across multiple services with one click, without manual spreadsheet collation.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Key Available Reports
    </h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "14px" }}>
      {[
        { name: "Risk Register Summary", desc: "A comprehensive register showing risk trajectory, ownership, and direct evidence lineage back to the raw signals." },
        { name: "CQC Evidence Pack", desc: "A complete, end-to-end chain of Signal → Pattern → Risk → Action, exportable as an audit-ready PDF." },
        { name: "Monthly Board Report", desc: "An auto-generated operational report detailing overall service positions, action effectiveness, and the Director's forward plan." },
        { name: "Safeguarding Activity Report", desc: "Immutable logs tracking safeguarding observations, statutory notification status, and organizational learning." }
      ].map(r => (
        <div key={r.name} style={{ borderLeft: "3.5px solid var(--oc-sky)", paddingLeft: "12px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--oc-heading)", marginBottom: "2px" }}>{r.name}</h4>
          <p style={{ fontSize: "12px", color: "var(--oc-muted)", lineHeight: 1.5 }}>{r.desc}</p>
        </div>
      ))}
    </div>
  </SubpageLayout>
);

export const PlatformSecurity: React.FC = () => (
  <SubpageLayout
    category="Platform // Security"
    title="Enterprise Security & CQC Compliance Alignment"
    subtitle="Row-level security, encryption, and immutable audit logs built for clinical environments."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Ordin Core operates at the highest standards of data security, recognizing the extreme sensitivity of clinical and behavioral records.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Security Infrastructure
    </h3>
    <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
      <li><strong>Multi-Tenancy Isolation</strong>: PostgreSQL row-level security isolates each provider organization's data at the database layer.</li>
      <li><strong>Tamper-Proof Audit Logs</strong>: Critical actions (such as finalizing weekly reviews, completing actions, or promoting risks) are permanently logged and timestamped.</li>
      <li><strong>GDPR Compliance by Design</strong>: Anonymized patient identifiers are mapped via a secure pseudonymised format (e.g. <em>initial + surname</em>), separating identities from cross-site analytical dashboards.</li>
      <li><strong>Encryption</strong>: All data is protected using TLS 1.3 in transit and AES-256 at rest.</li>
    </ul>
  </SubpageLayout>
);

/* ─── WHY ORDIN CORE ───────────────────────────────────── */

export const WhyOrdinCore: React.FC = () => (
  <SubpageLayout
    category="Doctrine"
    title="Why Ordin Core: Beyond 'Compliance First'"
    subtitle="Why traditional systems fail, and how our structured governance infrastructure makes a difference."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Traditional compliance platforms focus on static scoring, annual audits, and isolated incident forms. They treat risk as a one-off document to show an inspector—not as a live, operational tool. This creates "compliance drift" where a service appears compliant on paper but is actively deteriorating in practice.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      The Four Pitfalls of Risk Registers
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Without continuous oversight, risk registers fail in four ways:
    </p>
    <ol style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
      <li><strong>Unsubstantiated Entries</strong>: Risks are added based on isolated incidents without a clear signal lineage.</li>
      <li><strong>Task Completion Focus</strong>: Management checks that actions were "completed" (e.g., training was done) but never rates their effectiveness (did risk actually decrease?).</li>
      <li><strong>Lagging Visibility</strong>: Directors only discover concerns after an incident occurs, unable to prove proactive steps.</li>
      <li><strong>Audit Scrambling</strong>: Organizations waste hundreds of hours manual-collating folders before an inspection.</li>
    </ol>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)" }}>
      The Evidence Supply Chain
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Ordin Core treats governance as a continuous <strong>evidence supply chain</strong>. Every risk is backed by a full lineage of raw signals, escalation rules, manager validations, and action outcomes. When CQC inspectors ask, <em>"What did you know, when did you know it, and what did you do about it?"</em>, Ordin Core gives you the complete, immutable timeline.
    </p>
  </SubpageLayout>
);

/* ─── PROVIDER PAGES ───────────────────────────────────── */

export const ProviderSupportedLiving: React.FC = () => (
  <SubpageLayout
    category="Providers // Supported Living"
    title="Oversight Across Multi-Site Tenancies"
    subtitle="Managing thin operational margins, high staff turnover, and cross-site trends."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Supported living operations are inherently distributed. With staff working across multiple individual houses and tenancies, maintaining consistent governance is a significant challenge for Registered Managers and Directors.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Operational Pressures Handled
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Ordin Core provides instant cross-house visibility. The <strong>house selector</strong> on the Governance Pulse ensures that Team Leaders submit observations to the correct service, even when working across different tenancies. The weekly review aggregates these signals, allowing Registered Managers to identify staffing, environmental, or medication trends early.
    </p>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Instead of relying on word-of-mouth operational meetings, Directors can view the rolling 6-week <strong>Risk Trajectory Chart</strong> to see exactly which services are improving, stabilizing, or requiring immediate clinical support.
    </p>
  </SubpageLayout>
);

export const ProviderMentalHealth: React.FC = () => (
  <SubpageLayout
    category="Providers // Mental Health"
    title="Clinical Risk Governance & Behavioral Tracking"
    subtitle="Supports structured clinical oversight within complex and changing care environments."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Mental health and complex community care services require highly responsive clinical governance. Behavioral issues, medication adjustments, and safeguarding concerns can escalate rapidly if they are treated as isolated events.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Person-Centred Pattern Detection
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Ordin Core supports <strong>person-specific clustering</strong> using the optional, anonymized <em>related_person</em> identifier. This allows the pattern engine to flag recurring behavioral or medical concerns for a specific individual across different shifts, without exposing full names in high-level analytics.
    </p>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      In the event of a regulatory review, the platform's serious incident reconstruction allows clinical leads to trace historical signals and governance decisions in under 10 minutes.
    </p>
  </SubpageLayout>
);

export const ProviderResidentialCare: React.FC = () => (
  <SubpageLayout
    category="Providers // Residential"
    title="Nursing & Residential Care Home Governance"
    subtitle="Tracking clinical risks alongside operational and environmental pressures."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      For nursing and residential care homes, Ordin Core provides a unified operational dashboard. Clinical risks (such as medication errors, falls, and pressure sores) are tracked alongside daily operational pressures (such as staffing ratios and environmental issues).
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Defensible Oversight Record
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      The 15-step weekly review enables residential managers to continuously evaluate their control measures. When a fall occurs, the system links the event directly to prior falls, proving to CQC inspectors that you have an active, ongoing risk evaluation cycle. Action-effectiveness metrics track whether post-fall interventions (e.g., sensory mats, medication reviews) are actively reducing risk intensity.
    </p>
  </SubpageLayout>
);

export const ProviderDomiciliaryCare: React.FC = () => (
  <SubpageLayout
    category="Providers // Domiciliary"
    title="Oversight for Home Care & Domiciliary Agencies"
    subtitle="Managing governance across scattered community tenancies and remote workers."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Domiciliary care agencies run highly dispersed operations, with care staff spending most of their time traveling between independent homes. Without a structured platform, managers are blind to concerns until they escalate into serious incidents or complaints.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Remote Frontline Signals
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Ordin Core provides a simple, mobile-optimized Governance Pulse that staff can fill out from the community. If a support worker observes a deterioration in a client's environment or physical health, they log it instantly. The platform's automated rules flag these signals, generating escalations that flow straight to the Registered Manager's dashboard.
    </p>
  </SubpageLayout>
);

export const ProviderCaseStudies: React.FC = () => (
  <SubpageLayout
    category="Providers // Case Studies"
    title="Ordin Core in Practice"
    subtitle="Real-world operational metrics from multi-site care providers."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      We partner with proactive care providers to prove the clinical and operational value of continuous governance infrastructure.
    </p>
    <div className="oc-card" style={{ marginTop: "24px" }}>
      <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--oc-heading)", marginBottom: "8px" }}>CASE STUDY PREVIEW: Gella Care Services</h4>
      <p style={{ fontSize: "13px", color: "var(--oc-muted)", lineHeight: 1.6 }}>
        By implementing Ordin Core's 12-field pulse observations and structured weekly review cycle, Gella Care Services achieved a 42% reduction in escalation response times across 8 supported living services within the first 60 days.
      </p>
    </div>
  </SubpageLayout>
);

/* ─── RESOURCE PAGES ───────────────────────────────────── */

export const ResourceBlog: React.FC = () => (
  <SubpageLayout
    category="Resources // Blog"
    title="Governance Insights & Regulatory Updates"
    subtitle="Practical, doctrine-aligned guidance on care governance and CQC inspections."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Explore our articles written by experienced care directors, regulatory consultants, and governance engineers.
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px" }}>
      {[
        { date: "May 18, 2026", title: "How to Read the Cross-House Risk Trajectory Chart", desc: "A practical guide for Directors on interpreting rolling risk intensity lines and identifying service deterioration." },
        { date: "May 10, 2026", title: "The Four Pitfalls of Risk Register Drift", desc: "Why risk registers become stale clinical compliance logs, and how the Signal-Pattern-Risk model restores integrity." },
        { date: "Apr 28, 2026", title: "CQC Inspection Readiness: Transforming Daily Care Records into Evidence", desc: "How continuous daily pulses create an inspection-ready evidence supply chain that satisfies key lines of enquiry." }
      ].map(post => (
        <div key={post.title} className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--oc-sky)", fontWeight: 600 }}>{post.date}</span>
          <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--oc-heading)" }}>{post.title}</h4>
          <p style={{ fontSize: "13px", color: "var(--oc-muted)", lineHeight: 1.5 }}>{post.desc}</p>
        </div>
      ))}
    </div>
  </SubpageLayout>
);

export const ResourceGuides: React.FC = () => (
  <SubpageLayout
    category="Resources // Guides"
    title="Governance Blueprints & Handbooks"
    subtitle="Downloadable blueprints and checklists to level-up your organization's oversight."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Access our library of structured guides and handbooks designed to support clinical managers and executive boards.
    </p>
    <div className="oc-grid-2" style={{ gap: "20px", marginTop: "24px" }}>
      {[
        { title: "The Governance Rhythm Handbook", desc: "The step-by-step breakdown of the daily 10-minute manager review and the 15-step weekly review." },
        { title: "CQC Inspection-Ready Evidence Blueprint", desc: "A detailed workflow guide demonstrating how Ordin Core matches the CQC Single Assessment Framework." },
        { title: "Person-Centred Pattern Detection Guide", desc: "How to set up and monitor anonymized client behavioral clusters to detect emerging clinical trends." }
      ].map(g => (
        <div key={g.title} className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--oc-heading)" }}>{g.title}</h4>
          <p style={{ fontSize: "12px", color: "var(--oc-muted)", lineHeight: 1.5 }}>{g.desc}</p>
          <button className="oc-btn-outline" style={{ width: "fit-content", padding: "4px 12px", fontSize: "11px", marginTop: "12px" }} onClick={handleRedirect}>Download PDF</button>
        </div>
      ))}
    </div>
  </SubpageLayout>
);

export const ResourceWebinars: React.FC = () => (
  <SubpageLayout
    category="Resources // Webinars"
    title="Governance Masterclasses & Webinars"
    subtitle="Recorded sessions and masterclasses covering modern care governance."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Watch our webinars detailing operational workflows and clinical risk governance structures in practice.
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
      {[
        { duration: "45 mins", title: "Registered Manager Masterclass: The Daily 10-Minute Oversight Rhythm", speaker: "Led by Clinical Operations Team" },
        { duration: "32 mins", title: "Responsible Individuals: Validating Weekly Review Records", speaker: "Oversight Assurance Masterclass" },
        { duration: "50 mins", title: "Incident Reconstruction: Proving What You Knew and When", speaker: "Regulatory Defence and Learning Masterclass" }
      ].map(w => (
        <div key={w.title} className="oc-card" style={{ display: "flex", alignItems: "center", gap: "20px", textAlign: "left" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(47, 108, 181, 0.09)", border: "1px solid rgba(47, 108, 181, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>▶</div>
          <div>
            <span style={{ fontSize: "10px", color: "var(--oc-sky)", fontWeight: 600 }}>{w.duration} • {w.speaker}</span>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--oc-heading)" }}>{w.title}</h4>
          </div>
        </div>
      ))}
    </div>
  </SubpageLayout>
);

export const ResourceHelp: React.FC = () => (
  <SubpageLayout
    category="Resources // Help Center"
    title="FAQs & System Documentation"
    subtitle="Everything you need to set up, operate, and master Ordin Core."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Find quick answers and technical articles explaining signal captures, Weekly Reviews, and organizational mapping.
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
      {[
        { q: "How are Team Leaders mapped to multi-site services?", a: "Registered Managers assign staff members to specific houses. The Governance Pulse automatically scoped to show only mapped sites." },
        { q: "What is the 3-week signal memory logic?", a: "The pattern engine retains signals for a rolling 21-day period. Repeating occurrences within this window trigger threshold warning alerts." },
        { q: "What is the difference between finalising and validating reviews?", a: "The Weekly Review is finalized by the Registered Manager (operational validation). It is then locked and validated by the Responsible Individual (oversight validation) to create a dual-signature assurance record." }
      ].map(faq => (
        <div key={faq.q} style={{ borderBottom: "1px solid var(--oc-border)", paddingBottom: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--oc-heading)", marginBottom: "4px" }}>Q: {faq.q}</h4>
          <p style={{ fontSize: "13px", color: "var(--oc-muted)", lineHeight: 1.5 }}>A: {faq.a}</p>
        </div>
      ))}
    </div>
  </SubpageLayout>
);

export const ResourceApiDocs: React.FC = () => (
  <SubpageLayout
    category="Resources // Developers"
    title="Ordin Core Developer API & REST Endpoints"
    subtitle="Documentation, endpoints, and Swagger schemas for enterprise integrations."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      The platform is built as an open, modern API-first infrastructure. You can securely import signals or export reports using standard REST APIs.
    </p>
    <div className="oc-card" style={{ marginTop: "24px", fontFamily: "monospace", fontSize: "12px", background: "var(--oc-card-alt)" }}>
      <div style={{ borderBottom: "1px solid var(--oc-border)", paddingBottom: "8px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
        <span>POST /api/v1/signals</span>
        <span style={{ color: "#4CAF81" }}>HTTP 201 Created</span>
      </div>
      <pre style={{ overflowX: "auto", textAlign: "left" }}>{`{
  "service_id": "house-102",
  "signal_type": "medication",
  "risk_domains": ["medication", "governance"],
  "description": "Factual details of missed morning medication...",
  "severity": "moderate",
  "immediate_action": "Administered immediately, RM notified",
  "prior_recurrence": "no"
}`}</pre>
    </div>
  </SubpageLayout>
);

/* ─── ABOUT PAGES ──────────────────────────────────────── */

export const AboutMission: React.FC = () => (
  <SubpageLayout
    category="About // Mission"
    title="Our Mission & Governance Philosophy"
    subtitle="Continuous, evidence-based, and defensible care oversight."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      At Ordin Core, we believe that the current clinical audit paradigm is broken. Compliance should never be a retrospective check-box exercise that happens once a year.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Continuous Governance Philosophy
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      We believe that operational risk should be captured incrementally. Care workers are continuously observing risk in real time—but their insights are often lost in qualitative paper files. By structuring frontline signals at the source, we enable clinical managers and company directors to identify deterioration early.
    </p>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Our mission is to establish continuous, evidence-based, and completely defensible care governance, creating a clear operational timeline that keeps every care provider audit-ready.
    </p>
  </SubpageLayout>
);

export const AboutContact: React.FC = () => (
  <SubpageLayout
    category="About // Contact"
    title="Connect with Ordin Core"
    subtitle="Get in touch to learn more or schedule a corporate governance briefing."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      We work closely with care provider directors, clinical operations leads, and responsible individuals across the UK.
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "24px" }}>
      <div className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--oc-heading)" }}>General Enquiries</h4>
        <a href="mailto:hello@ordincore.co.uk" className="oc-footer-link" style={{ fontSize: "14px" }}>hello@ordincore.co.uk</a>
      </div>
      <div className="oc-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--oc-heading)" }}>Technical Integration</h4>
        <a href="mailto:integrations@ordincore.co.uk" className="oc-footer-link" style={{ fontSize: "14px" }}>support@ordincore.co.uk</a>
      </div>
    </div>
  </SubpageLayout>
);

export const AboutPilot: React.FC = () => (
  <SubpageLayout
    category="About // Pilot"
    title="Ordin Core Limited Access Pilot Programme"
    subtitle="Partnering with top providers to shape the future of clinical governance."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      We are actively onboarding a limited cohort of supported living, mental health, and residential care providers to our <strong>Pilot Programme</strong>.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Pilot Partner Benefits
    </h3>
    <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--oc-muted)", display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
      <li><strong>Guided Onboarding</strong>: Custom digital mapping of your organizational hierarchy and site houses.</li>
      <li><strong>Setup Consultation</strong>: Free system customization to map your existing operational risk domains and thresholds.</li>
      <li><strong>RI Review Sessions</strong>: Structured review sessions mapping your dashboard output directly to the CQC inspection frameworks.</li>
      <li><strong>Priority Roadmap Influence</strong>: Shape upcoming feature developments and clinical pattern analytics pipelines.</li>
    </ul>
  </SubpageLayout>
);

export const AboutTeam: React.FC = () => (
  <SubpageLayout
    category="About // Leadership Team"
    title="Our Leadership & Expertise"
    subtitle="A team of care specialists, clinical safety experts, and software engineers dedicated to redefining governance."
  >
    <p style={{ fontSize: "15px", lineHeight: 1.7 }}>
      Ordin Core was founded by a coalition of registered care providers, clinical safety professionals, and enterprise software architects who saw firsthand the dangers of fragmented and reactive compliance systems.
    </p>
    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--oc-heading)", marginTop: "16px" }}>
      Driven by Clinical and Operational Excellence
    </h3>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--oc-muted)" }}>
      Our team brings together decades of experience in clinical governance, CQC compliance frameworks, and high-integrity data engineering. We design systems that protect care recipients, support frontline caregivers, and provide executive directors with clear, continuous operational assurance.
    </p>
  </SubpageLayout>
);
