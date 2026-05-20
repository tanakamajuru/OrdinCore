import React, { useState } from "react";

/* ─── Redirection Configuration ────────────────────────── */
const APP_LOGIN_URL = import.meta.env.VITE_LOGIN_URL || "https://work.ordincore.co.uk/login";

/* ─── SVG icons ────────────────────────────────────────── */
interface IconProps {
  name: string;
}

const Icon: React.FC<IconProps> = ({ name }) => {
  const paths: Record<string, React.ReactNode> = {
    eye:     <><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></>,
    clock:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    arrows:  <><path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/></>,
    doc:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    users:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    bell:    <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    cal:     <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    shield:  <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    check:   <><polyline points="20 6 9 17 4 12"/></>,
    arrow:   <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    grid:    <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    globe:   <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    star:    <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    map:     <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    linkedin:<><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></>,
    mail:    <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  };

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
};

/* ─── Mini sparkline ───────────────────────────────────── */
interface SparklineProps {
  color?: string;
}

const Sparkline: React.FC<SparklineProps> = ({ color = "var(--oc-sky)" }) => {
  const pts = "0,28 8,22 16,24 24,16 32,18 40,10 48,14 56,8 64,12 72,6 80,10 88,4 96,8";
  const id = color.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className="oc-sparkline" viewBox="0 0 96 36" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M${pts} L96,36 L0,36 Z`} fill={`url(#sg-${id})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
};

/* ─── Dashboard mockup ─────────────────────────────────── */
const DashboardMockup: React.FC = () => (
  <div className="oc-dashboard">
    <div className="oc-db-header">
      <div className="oc-db-logo">ORDIN<br/>CORE</div>
      <div style={{flex:1}}/>
      <div className="oc-db-tab oc-db-tab-active">Overview</div>
      <div className="oc-db-tab">All Services ▾</div>
      <div className="oc-db-tab">12–18 May 2026</div>
    </div>
    <div className="oc-db-body">
      <div className="oc-db-sidebar">
        {["Overview","Governance Signals","Risk Trajectory","Escalations","Actions","Reviews","Reports","Settings"].map((l,i)=>(
          <div key={l} className={`oc-db-slink${i===0?" active":""}`}>
            <span style={{marginRight: 6}}>{["⊞","◉","↗","⚡","✓","📋","📊","⚙"][i]}</span>
            {l}
          </div>
        ))}
      </div>
      <div className="oc-db-main">
        <div className="oc-db-stats">
          {[
            ["Governance Signals","128","↑18% vs last week"],
            ["Escalations","23","5 vs last week"],
            ["Overdue Actions","7","Requires attention"],
            ["Review Rate","92%","↑8% vs last month"]
          ].map(([l,v,d])=>(
            <div key={l} className="oc-db-stat">
              <div className="oc-db-stat-label">{l}</div>
              <div className="oc-db-stat-val">{v}</div>
              <div className="oc-db-stat-delta">{d}</div>
            </div>
          ))}
        </div>
        <div className="oc-db-charts">
          <div className="oc-db-chart">
            <div className="oc-db-chart-title">Risk Trajectory Overview</div>
            <Sparkline color="var(--oc-sky)"/>
          </div>
          <div className="oc-db-chart">
            <div className="oc-db-chart-title">Top Risk Areas</div>
            {[
              ["Staffing & Supervision","high"],
              ["Medication Mgmt","stable"],
              ["Safeguarding","high"],
              ["Environment","imp"]
            ].map(([label,type])=>(
              <div key={label} className="oc-risk-row">
                <span style={{flex:1,fontSize:9}}>{label}</span>
                <span className={`oc-risk-badge risk-${type}`}>{type==="imp"?"Improving":type==="stable"?"Stable":"Rising"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Static Data ──────────────────────────────────────── */
const PAIN_POINTS = [
  { icon:"eye",  title:"Limited Cross-Site Visibility",         desc:"Leadership teams often struggle to see recurring concerns developing across multiple services at the same time." },
  { icon:"clock",title:"Reactive Oversight",                    desc:"Concerns are sometimes recognised only after incidents, escalation, or service instability has already occurred." },
  { icon:"arrows",title:"Inconsistent Escalation Tracking",    desc:"Important concerns may be discussed operationally but not always tracked clearly through to review and outcome." },
  { icon:"doc",  title:"Difficulty Evidencing Oversight",       desc:"Providers may find it difficult to clearly demonstrate what was known, reviewed, discussed, and actioned over time." },
];

const RHYTHM = [
  { icon:"◉", title:"Daily Signals",            desc:"Frontline and management concerns are recorded through structured governance signals." },
  { icon:"↗", title:"Trajectory Review",        desc:"The platform helps identify whether concerns are improving, repeating, stabilising, or escalating over time." },
  { icon:"👥",title:"Management Decision",      desc:"Managers review concerns, assign actions, and maintain oversight records." },
  { icon:"📋",title:"Governance Reconstruction",desc:"Leadership review activity and governance decisions remain visible and explainable later if required." },
];

const FEATURES = [
  { icon:"grid",  title:"Cross-Service Oversight",                  desc:"Maintain visibility across multiple houses, teams, and operational environments from one central view." },
  { icon:"chart", title:"Risk Trajectory Monitoring",               desc:"Observe patterns, recurrence, and directional change rather than isolated incidents alone." },
  { icon:"bell",  title:"Escalation Visibility",                    desc:"Track concerns, assigned actions, review decisions, and escalation timelines in one structured process." },
  { icon:"cal",   title:"Governance Rhythm Tracking",               desc:"Support consistent governance reviews through structured daily, weekly, and monthly oversight activity." },
  { icon:"users", title:"Leadership Review Records",                 desc:"Maintain structured evidence of leadership review, oversight discussion, and governance activity." },
  { icon:"shield",title:"Serious Incident Reconstruction Support",  desc:"Support clearer retrospective understanding of governance visibility and operational response pathways." },
];

const USERS = [
  { icon:"🏛", title:"Directors",                        desc:"Cross-site governance visibility and operational assurance across services." },
  { icon:"👤", title:"Responsible Individuals",          desc:"Structured oversight evidence and governance continuity across regulated environments." },
  { icon:"📋", title:"Registered Managers",              desc:"Daily operational review, escalation management, and action oversight support." },
  { icon:"🏠", title:"Supported Living Providers",       desc:"Improved visibility across houses, staffing pressures, incidents, and operational concerns." },
  { icon:"🧠", title:"Mental Health & Community Services",desc:"Supports structured governance approaches within complex and changing care environments." },
];

const CHECKLIST = [
  "Cross-service governance visibility",
  "Escalation and action tracking",
  "Governance review monitoring",
  "Risk trajectory awareness",
  "Leadership oversight records",
  "Structured governance summaries",
];

const PILOT_ITEMS = [
  { icon:"🚀", label:"Guided onboarding" },
  { icon:"⚙️", label:"Governance setup support" },
  { icon:"📋", label:"Structured review sessions" },
  { icon:"🔔", label:"Early feature access" },
  { icon:"🗺", label:"Shape the future roadmap" },
];

const FOOTER_COLS = {
  "Platform":       ["Overview","Features","Security"],
  "Why Ordin Core": ["Our Approach","Governance Model","For Providers"],
  "Resources":      ["Blog","Guides","Events"],
  "Company":        ["About","Contact"],
};

/* ─── App Component ────────────────────────────────────── */
export default function App() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const handleRedirect = () => {
    window.location.href = APP_LOGIN_URL;
  };

  return (
    <div className="oc-page">

      {/* ── NAV ── */}
      <nav className="oc-nav">
        <div className="oc-nav-inner">
          <a className="oc-logo" onClick={handleRedirect}>
            <div className="oc-logo-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="oc-logo-text">ORDIN CORE</div>
              <div className="oc-logo-sub">Governance Platform</div>
            </div>
          </a>
          <div className="oc-nav-links">
            {["Platform","Why Ordin Core","For Providers","Resources","About"].map(l=>(
              <button key={l} className="oc-nav-link" onClick={handleRedirect}>
                {l}{["Platform","Resources"].includes(l)?" ▾":""}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button className="oc-btn-outline" onClick={handleRedirect}>Book a Demo</button>
            <button className="oc-btn-primary" onClick={handleRedirect}>Join Pilot Programme</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="oc-hero">
        <div>
          <div className="oc-hero-tag">Structured Governance Oversight Platform</div>
          <h1 className="oc-hero-h1">
            Structured Governance<br/>Oversight for<br/>
            <span className="oc-hero-accent">Care Providers</span>
          </h1>
          <p className="oc-hero-body">
            Ordin Core helps Directors, Responsible Individuals, and Registered Managers maintain clearer oversight across supported living and care services through structured governance reviews, escalation visibility, and risk trajectory monitoring.
          </p>
          <div className="oc-hero-btns">
            <button className="oc-btn-primary-lg" onClick={handleRedirect}>Book a Demo</button>
            <button className="oc-btn-outline-lg" onClick={handleRedirect}>Join Pilot Programme</button>
          </div>
          <div className="oc-hero-note">
            <span className="oc-hero-check">✓</span>
            Built for supported living, mental health, and multi-site care environments.
          </div>
        </div>
        <DashboardMockup/>
      </div>

      {/* ── BADGE STRIP ── */}
      <div className="oc-badge-strip">
        <div className="oc-badge-strip-inner">
          {[
            {icon:"shield", title:"Designed for Governance", sub:"Not just compliance"},
            {icon:"check",  title:"Inspection-Aware",        sub:"Evidence what matters"},
            {icon:"users",  title:"Operationally Grounded",  sub:"Built with provider input"},
            {icon:"doc",    title:"Secure & Private",        sub:"Enterprise-grade security"},
          ].map(b=>(
            <div key={b.title} className="oc-badge-item">
              <div className="oc-badge-icon" style={{color:"var(--oc-sky)"}}><Icon name={b.icon}/></div>
              <div>
                <div className="oc-badge-title">{b.title}</div>
                <div className="oc-badge-sub">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <div className="oc-section oc-center">
        <h2 className="oc-section-h2">Governance Becomes Difficult When<br/>Information Is Scattered</h2>
        <p className="oc-section-sub">As services grow, maintaining consistent oversight becomes harder.</p>
        <div className="oc-grid-4">
          {PAIN_POINTS.map(p=>(
            <div key={p.title} className="oc-card">
              <div className="oc-card-icon" style={{color:"var(--oc-sky)"}}><Icon name={p.icon}/></div>
              <div className="oc-card-title">{p.title}</div>
              <div className="oc-card-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="oc-divider"/>

      {/* ── RHYTHM ── */}
      <div className="oc-section oc-center">
        <h2 className="oc-section-h2">A Structured Governance Rhythm<br/>For Operational Oversight</h2>
        <p className="oc-section-sub">Ordin Core helps you build a repeatable governance rhythm across your organisation.</p>
        <div className="oc-rhythm">
          {RHYTHM.map((step, i) => (
            <React.Fragment key={step.title}>
              <div className="oc-rhythm-step">
                <div style={{display:"flex",justifyContent:"center"}}>
                  <div className="oc-rhythm-circle">{step.icon}</div>
                </div>
                <div className="oc-rhythm-tag">{i+1}.</div>
                <div className="oc-rhythm-title">{step.title}</div>
                <div className="oc-rhythm-desc">{step.desc}</div>
              </div>
              {i < RHYTHM.length - 1 && (
                <div style={{width:40,flexShrink:0,display:"flex",alignItems:"flex-start",paddingTop:28}} className="oc-rhythm-arrow">
                  <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                    <line x1="0" y1="8" x2="32" y2="8" stroke="var(--oc-border)" strokeWidth="1.5"/>
                    <polyline points="26,3 33,8 26,13" fill="none" stroke="var(--oc-cobalt)" strokeWidth="1.5"/>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="oc-divider"/>

      {/* ── FEATURES ── */}
      <div className="oc-section oc-center">
        <h2 className="oc-section-h2">Designed For Governance Visibility</h2>
        <div className="oc-grid-6">
          {FEATURES.map(f=>(
            <div key={f.title} className="oc-card" style={{textAlign:"left"}}>
              <div className="oc-card-icon" style={{color:"var(--oc-sky)"}}><Icon name={f.icon}/></div>
              <div className="oc-card-title">{f.title}</div>
              <div className="oc-card-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="oc-divider"/>

      {/* ── BUILT FOR ── */}
      <div className="oc-section">
        <div className="oc-built-grid">
          <div>
            <h2 className="oc-section-h2">Built For Operational and Governance Leadership</h2>
            <div style={{marginTop:28}}>
              {USERS.map(u=>(
                <div key={u.title} className="oc-user-item">
                  <div className="oc-user-icon">{u.icon}</div>
                  <div>
                    <div className="oc-user-title">{u.title}</div>
                    <div className="oc-user-desc">{u.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="oc-section-h2">See Governance Activity More Clearly</h2>
            <p style={{fontSize:14,color:"var(--oc-muted)",marginTop:8,marginBottom:24,textAlign:"left"}}>Dashboards that bring clarity to your oversight.</p>
            <div className="oc-dashboard" style={{marginBottom:20}}>
              <div className="oc-db-header">
                <div className="oc-db-logo">ORDIN<br/>CORE</div>
                <div style={{flex:1}}/>
                <div className="oc-db-tab oc-db-tab-active">Governance Signals</div>
                <div className="oc-db-tab">All Services ▾</div>
              </div>
              <div style={{padding:"14px",background:"#0E2038"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div className="oc-db-chart">
                    <div className="oc-db-chart-title">By Risk Area</div>
                    {[
                      ["Staffing & Supervision","12"],
                      ["Medication Management","24"],
                      ["Safeguarding","8"],
                      ["Quality of Care","16"],
                      ["Environment","6"],
                      ["Other","10"]
                    ].map(([l,v])=>(
                      <div key={l} className="oc-risk-row">
                        <span style={{flex:1,fontSize:9}}>{l}</span>
                        <span style={{fontSize:9,color:"var(--oc-ice)",fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="oc-db-chart" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div className="oc-db-chart-title" style={{alignSelf:"flex-start"}}>By Severity</div>
                    <div style={{width:64,height:64,borderRadius:"50%",background:"conic-gradient(#EF5350 0% 23%, var(--oc-cobalt) 23% 60%, #4CAF81 60% 100%)",margin:"8px auto 6px",boxShadow:"0 0 0 8px var(--oc-card)"}}/>
                    <div style={{fontSize:10,color:"var(--oc-ice)",fontFamily:"'Sora',sans-serif",fontWeight:700}}>128 Total</div>
                    <div style={{display:"flex",gap:8,marginTop:6}}>
                      {[["High","#EF5350","23%"],["Med","var(--oc-cobalt)","37%"],["Low","#4CAF81","40%"]].map(([l,c,p])=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:8}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>
                          <span style={{color:"var(--oc-muted)"}}>{l} {p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ul className="oc-check-list">
              {CHECKLIST.map(item=>(
                <li key={item} className="oc-check-item">
                  <div className="oc-check-dot">✓</div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── BEYOND COMPLIANCE ── */}
      <div className="oc-beyond">
        <div className="oc-beyond-inner">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <path d="M36 4L8 16v20c0 18 12 30 28 32C52 66 64 54 64 36V16L36 4z" fill="rgba(47, 108, 181, 0.14)" stroke="var(--oc-cobalt)" strokeWidth="2"/>
              <path d="M36 18L18 26v14c0 12 8 20 18 22 10-2 18-10 18-22V26L36 18z" fill="rgba(91, 159, 212, 0.09)" stroke="var(--oc-sky)" strokeWidth="1.5"/>
              <path d="M27 36l7 7 11-11" stroke="var(--oc-sky)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.2}}>Governance Visibility Beyond Compliance</div>
            </div>
          </div>
          <div>
            <p style={{fontSize:14,color:"var(--oc-silver)",lineHeight:1.7,marginBottom:16,textAlign:"left"}}>
              Ordin Core is not a care planning platform or compliance scoring system.
            </p>
            <p style={{fontSize:13,color:"var(--oc-muted)",lineHeight:1.7,textAlign:"left"}}>
              It is a governance infrastructure platform designed to support structured oversight, operational visibility, and continuity of governance review across care services.
            </p>
          </div>
          <div>
            <p style={{fontSize:13,color:"var(--oc-muted)",lineHeight:1.7,textAlign:"left"}}>
              The platform is designed to help organisations maintain clearer operational awareness and stronger governance defensibility through structured oversight activity over time.
            </p>
            <div style={{marginTop:20,padding:"12px 16px",background:"rgba(47, 108, 181, 0.07)",borderRadius:8,border:"1px solid rgba(47, 108, 181, 0.2)",display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:"var(--oc-sky)",fontSize:14}}>✓</span>
              <span style={{fontSize:13,color:"var(--oc-silver)",textAlign:"left"}}>Structured oversight. Clearer visibility. Better governance continuity.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PILOT CTA ── */}
      <div className="oc-section oc-pilot">
        <div style={{display:"inline-block",padding:"4px 14px",borderRadius:20,border:"1px solid var(--oc-border)",fontSize:11,color:"var(--oc-sky)",letterSpacing:".8px",textTransform:"uppercase",fontWeight:600,marginBottom:20,background:"rgba(47, 108, 181, 0.05)"}}>Limited Access</div>
        <h2 className="oc-section-h2">Join The Ordin Core Pilot Programme</h2>
        <p className="oc-section-sub" style={{marginTop:10}}>
          We are partnering with a limited number of supported living and care providers to shape the future of governance oversight.
        </p>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:32,flexWrap:"wrap"}}>
          <button className="oc-btn-primary-lg" onClick={handleRedirect}>Join Pilot Programme</button>
          <button className="oc-btn-outline-lg" onClick={handleRedirect}>Book a Demo</button>
        </div>
        <div className="oc-pilot-icons">
          {PILOT_ITEMS.map(p=>(
            <div key={p.label} className="oc-pilot-icon-item">
              <div className="oc-pilot-icon-circle">{p.icon}</div>
              <div className="oc-pilot-icon-label">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="oc-footer">
        <div className="oc-footer-inner">
          <div>
            <a className="oc-logo" style={{marginBottom:16}} onClick={handleRedirect}>
              <div className="oc-logo-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div className="oc-logo-text">ORDIN CORE</div>
                <div className="oc-logo-sub">Governance Platform</div>
              </div>
            </a>
            <p style={{fontSize:12,color:"var(--oc-muted)",marginTop:12,lineHeight:1.5,textAlign:"left"}}>
              Ordin Core is a secure, enterprise-grade governance infrastructure system built specifically for supported living and multi-site care providers.
            </p>
          </div>
          {Object.entries(FOOTER_COLS).map(([title, links])=>(
            <div key={title}>
              <div className="oc-footer-col-title">{title}</div>
              {links.map(l=>(
                <a key={l} className="oc-footer-link" onClick={handleRedirect}>
                  {l}
                </a>
              ))}
            </div>
          ))}
          <div>
            <div className="oc-footer-col-title">Stay Updated</div>
            <p style={{fontSize:12,color:"var(--oc-muted)",lineHeight:1.5,marginBottom:10,textAlign:"left"}}>
              Join our newsletter list for curated regulatory and governance insights.
            </p>
            {subscribed ? (
              <div style={{padding:"8px 12px",background:"rgba(76, 175, 129, 0.14)",border:"1px solid rgba(76, 175, 129, 0.3)",borderRadius:"6px",color:"#4CAF81",fontSize:12,textAlign:"left"}}>
                ✓ Subscription confirmed!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="oc-email-row">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="oc-email-input"
                  required
                />
                <button type="submit" className="oc-email-btn">→</button>
              </form>
            )}
          </div>
        </div>
        <div className="oc-footer-bottom">
          <div className="oc-footer-copy">
            © {new Date().getFullYear()} Ordin Core. All rights reserved.
          </div>
          <div className="oc-footer-policy">
            <a className="oc-footer-link" style={{margin:0}} onClick={handleRedirect}>Privacy Policy</a>
            <a className="oc-footer-link" style={{margin:0}} onClick={handleRedirect}>Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
