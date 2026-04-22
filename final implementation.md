<!-- FILE: 01_project_overview.md -->

## Status: Complete

## Project Overview

### 1. Project Name & Purpose
**OrdinCore** is a multi‑tenant Governance, Risk, and Compliance (GRC) SaaS platform purpose‑built for regulated adult social care services in the UK. It transforms front‑line observations into defensible governance records that withstand Care Quality Commission (CQC) inspection.

### 2. Core Doctrine
> **Signal → Pattern → Risk**  
> *The system proposes; the Registered Manager decides. Risks are never created automatically.*

All governance activity flows through a four‑layer stack:
| Layer | Name | Role |
|-------|------|------|
| 1 | Signal Capture | Raw, always‑open observation entry (12‑field structured form) |
| 2 | Pattern Detection | Automated threshold engine that groups signals into clusters |
| 3 | Governance Decision | Human (Registered Manager) review, cluster promotion, risk creation/update |
| 4 | Oversight & Reporting | Cross‑service dashboards, weekly governance narrative, inspection evidence packs |

### 3. Key Stakeholders & User Personas

| Role | Abbreviation | Primary Goal |
|------|--------------|--------------|
| Team Leader | TL | Capture daily observations accurately and timely |
| Registered Manager | RM | Maintain site safety, oversee risk register, complete daily & weekly governance |
| Director | — | Identify failing services, systemic issues, and ensure organisational control |
| Responsible Individual / Nominated Individual | RI / NI | Validate governance systems, produce defensible narratives for regulators |
| Company Admin | Admin | Configure tenants, users, templates, and site settings |

### 4. Project Scope

#### 4.1 In Scope (Phase 1 + Phase 2 – Full Build)
- Multi‑tenant architecture with company‑level data isolation.
- Authentication (JWT + refresh tokens) and role‑based access control.
- Always‑open **Daily Pulse Signal Capture** (12‑field sequential form).
- **Pattern Detection Engine** with 10 threshold rules (frequency, severity, recurrence, cross‑service).
- **Signal Clusters** and **Risk‑Signal Traceability** layer.
- **Risk Register** with trajectory tracking, source cluster gating, and recurrence watch.
- **Daily RM Oversight Board** (10‑minute triage) with absence fallback.
- **Weekly Governance Review** (13‑step structured wizard) with auto‑population.
- **Action Tracker** with effectiveness rating and trajectory pipeline.
- **Director Intelligence Dashboard** (cross‑site control failure flags, domain weakness).
- **Incident Reconstruction** template with signal timeline and control failure analysis.
- Real‑time notifications (in‑app, push, email, SMS for critical events).
- Reporting (PDF/Excel) and inspection evidence packs.

#### 4.2 Out of Scope
- Direct integration with care planning systems (export/import only).
- Native mobile applications (responsive web app is sufficient).
- Clinical decision support (the system records governance, not clinical advice).

### 5. Success Criteria (Measurable)
| Criterion | Target |
|-----------|--------|
| RM can complete Daily Oversight Board in ≤10 minutes | Yes |
| 100% of formal risks have a traceable source cluster of ≥3 signals (or critical exception) | Yes |
| Weekly Review auto‑populates ≥5 sections without manual data entry | Yes |
| Director dashboard surfaces control failure flags within 1 hour of detection | Yes |
| All governance records (pulses, clusters, risks, reviews) are immutable after final status | Yes |
| System passes simulated CQC inspection audit trail verification | Yes |

### 6. Regulatory Context
The platform is designed to meet **CQC (Care Quality Commission)** expectations under the **Safe** and **Well‑Led** domains, specifically:
- Proactive risk identification.
- Clear escalation pathways with time‑bound response.
- Continuity of oversight (no gaps in governance rhythm).
- Documented leadership reflection and decision rationale.
- Full traceability from observation to action.

### 7. Document Map (This Specification Set)
| File | Purpose |
|------|---------|
| `01_project_overview.md` | Goals, scope, stakeholders |
| `02_requirements.md` | Functional/non‑functional requirements, user stories |
| `03_system_architecture.md` | Tech stack, component diagram, data flow |
| `04_data_models.md` | PostgreSQL schema, tables, relationships |
| `05_api_contracts.md` | REST endpoints, request/response examples |
| `06_ui_ux_spec.md` | Screens, user flows, component inventory |
| `07_business_logic.md` | Threshold rules, trajectory calculations, workflows |
| `08_integrations.md` | Email, SMS, file storage, notification providers |
| `09_infrastructure.md` | Deployment, environment variables, scaling |
| `10_testing_spec.md` | Test cases for key governance flows |
| `11_build_sequence.md` | Ordered development phases with dependencies |
| `12_open_questions.md` | Unresolved items requiring human decision |

---

<!-- FILE: 02_requirements.md -->

## Status: Complete

## Functional & Non‑Functional Requirements

### 1. Functional Requirements

#### FR1: Multi‑Tenancy & Authentication
| ID | Requirement | Priority |
|----|-------------|----------|
| FR1.1 | System must support multiple companies with complete data isolation (company_id scoping). | P0 |
| FR1.2 | Users authenticate via email/password; receive JWT access token (expiry 15 min) and refresh token (7 days). | P0 |
| FR1.3 | Role‑based access control (SUPER_ADMIN, ADMIN, DIRECTOR, RI, REGISTERED_MANAGER, TEAM_LEADER) enforced at API layer. | P0 |
| FR1.4 | Users can only see data for houses assigned to them. | P0 |

#### FR2: Signal Capture (Daily Pulse)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR2.1 | Team Leaders can submit a signal observation **any time** (no scheduling required). | P0 |
| FR2.2 | Signal entry must follow a strict 12‑field sequence (date/time → house → signal_type → risk_domain[] → description → immediate_action → severity → has_happened_before → pattern_concern → escalation_required → evidence_url). | P0 |
| FR2.3 | `pattern_concern` values: `None`, `Possible`, `Clear`, `Escalating`. | P0 |
| FR2.4 | `escalation_required` values: `None`, `Manager Review`, `Urgent Review`, `Immediate Escalation`. | P0 |
| FR2.5 | Signal submission triggers asynchronous pattern detection job (BullMQ). | P0 |

#### FR3: Pattern Detection Engine
| ID | Requirement | Priority |
|----|-------------|----------|
| FR3.1 | System automatically groups signals into **Signal Clusters** based on same house + same risk_domain + frequency threshold. | P0 |
| FR3.2 | Implement **10 threshold rules** (Rules 1–10) as defined in `07_business_logic.md`. | P0 |
| FR3.3 | Each rule produces one of three output types: `Signal Flag`, `Risk Proposal`, `Mandatory Review`. | P0 |
| FR3.4 | All rule firings logged in `threshold_events` table. | P0 |
| FR3.5 | Cross‑service pattern detection: same issue in ≥2 houses within 7 days → "System‑Level Risk" flag. | P1 |

#### FR4: Risk Governance
| ID | Requirement | Priority |
|----|-------------|----------|
| FR4.1 | Risk creation **requires** a valid `source_cluster_id` (cluster with ≥3 signals, or 1 Critical signal). | P0 |
| FR4.2 | Risks have a `trajectory` field: `Improving`, `Stable`, `Deteriorating`, `Critical`. | P0 |
| FR4.3 | Every signal linked to a risk is recorded in `risk_signal_links` (traceability). | P0 |
| FR4.4 | Closing a risk requires a non‑empty `closure_reason`. | P0 |
| FR4.5 | After closure, system monitors for 14 days for similar signals; if detected, fires Rule 5 (Control Failure) and reopens risk. | P0 |

#### FR5: Daily RM Workflow
| ID | Requirement | Priority |
|----|-------------|----------|
| FR5.1 | RM has a **Daily Oversight Board** with 4 sections: High Priority Signals, Pattern Signals, Risk Touchpoint, Actions Panel. | P0 |
| FR5.2 | Board auto‑filters to RM's houses and last 48 hours. | P0 |
| FR5.3 | RM can triage signals: update severity, escalation, review_status; link to cluster/risk. | P0 |
| FR5.4 | System logs daily review completion in `daily_governance_log`. | P0 |
| FR5.5 | If RM does not complete review within 48h, system auto‑assigns to `deputy_rm_id` and notifies. If 72h, notifies Director. | P0 |

#### FR6: Weekly Governance Review
| ID | Requirement | Priority |
|----|-------------|----------|
| FR6.1 | RM initiates a **13‑step weekly review wizard**. Steps cannot be skipped. | P0 |
| FR6.2 | Sections 2–5 auto‑populate from signal/cluster data within the review period. | P0 |
| FR6.3 | RM must provide `leadership_interpretation` and `overall_position` (Stable/Watch/Concern/Escalating/Serious Concern). | P0 |
| FR6.4 | Completed review is locked and cannot be edited. | P0 |
| FR6.5 | System generates a governance narrative from the review data for inspection use. | P1 |

#### FR7: Action Effectiveness
| ID | Requirement | Priority |
|----|-------------|----------|
| FR7.1 | Actions have an `effectiveness` rating: `Effective`, `Neutral`, `Ineffective`. | P0 |
| FR7.2 | 48‑72 hours after due date, action appears in RM's effectiveness review queue. | P0 |
| FR7.3 | Two consecutive Ineffective actions on same risk → flag Deteriorating trajectory. | P0 |
| FR7.4 | Director dashboard shows aggregated effectiveness counts by house and domain. | P1 |

#### FR8: Director Intelligence
| ID | Requirement | Priority |
|----|-------------|----------|
| FR8.1 | Director dashboard includes: Org‑wide effectiveness summary, Service comparison table, 7‑day trend, Control failure flags, Domain weakness analysis. | P0 |
| FR8.2 | System‑Level Risk flag appears when same issue detected in ≥2 houses within 7 days. | P0 |

#### FR9: Incident Reconstruction
| ID | Requirement | Priority |
|----|-------------|----------|
| FR9.1 | Users can create an Incident Reconstruction record linking to Daily Pulse entries, risks, and actions. | P1 |
| FR9.2 | Reconstruction includes a pre‑incident signal timeline, trajectory assessment, control failure analysis, and governance narrative. | P1 |

#### FR10: Notifications
| ID | Requirement | Priority |
|----|-------------|----------|
| FR10.1 | Real‑time in‑app notifications via Socket.io. | P0 |
| FR10.2 | Push and email notifications for High/Critical events (see `08_integrations.md`). | P0 |
| FR10.3 | SMS for safeguarding signals during RM absence. | P1 |

### 2. Non‑Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR1 | Performance | Daily Oversight Board must load within 2 seconds. Pattern detection job completes within 30 seconds of signal submission. |
| NFR2 | Scalability | Support up to 10,000 daily pulse entries per company without degradation. |
| NFR3 | Security | All data encrypted in transit (TLS 1.3). Passwords hashed with bcrypt. JWT secrets rotated. |
| NFR4 | Auditability | No hard deletion of governance records. All status changes logged with actor and timestamp. |
| NFR5 | Availability | Target 99.5% uptime during business hours. |
| NFR6 | Compliance | System must retain audit trails for minimum 6 years (UK care sector requirement). |

### 3. User Stories (Summary)

| Role | Story |
|------|-------|
| TL | "As a Team Leader, I want to quickly record an observation about a resident's behavior so that the manager is aware." |
| RM | "As a Registered Manager, I want to see emerging patterns across my house so I can act before an incident occurs." |
| Director | "As a Director, I want to know which services are failing to control risks so I can intervene." |
| RI | "As a Responsible Individual, I want a clear narrative of what happened and what we did, so I can answer CQC inspectors." |

> ⚠️ ASSUMPTION: User stories are high‑level; detailed acceptance criteria are in `10_testing_spec.md`.

---

<!-- FILE: 03_system_architecture.md -->

## Status: Complete

## System Architecture

### 1. High‑Level Architecture Diagram (Logical)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  React 18 + Vite + Tailwind CSS + Material UI                               │
│  - Team Leader Dashboard   - RM Daily Oversight Board   - Director Dashboard │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTPS / WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│  Express.js (Node.js + TypeScript)                                           │
│  - JWT Authentication Middleware  - RBAC Guard  - Tenant Isolation           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  REST Services  │        │  WebSocket      │        │  BullMQ Workers │
│  - Auth         │        │  (Socket.io)    │        │  - Pattern      │
│  - Pulse        │        │  - Real‑time    │        │    Engine       │
│  - Cluster      │        │    notifications│        │  - Daily Checks │
│  - Risk         │        │                 │        │  - Reports      │
│  - Action       │        │                 │        │  - Effectiveness│
│  - Weekly Review│        │                 │        └─────────────────┘
│  - Director     │        │                 │                 │
└─────────────────┘        └─────────────────┘                 │
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA & INFRASTRUCTURE                              │
│  - PostgreSQL (primary DB)                                                   │
│  - Redis (BullMQ queue store + Socket.io adapter + cache)                    │
│  - S3‑compatible object storage (evidence files, generated reports)          │
│  - External: Email (SendGrid/Postmark), SMS (Twilio), Push (Firebase/APNs)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Technology Stack Details

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Frontend Framework | React | 18.x | UI components |
| Build Tool | Vite | 6.x | Fast development & bundling |
| Styling | Tailwind CSS + Material UI | 4.x / latest | Utility‑first CSS + accessible components |
| Backend Runtime | Node.js | 20.x | Server environment |
| Web Framework | Express.js | 4.x | REST API routing |
| Language | TypeScript | 5.x | Type safety across stack |
| Database | PostgreSQL | 16+ | Primary datastore |
| Queue & Cache | Redis | 7.x | BullMQ backing store, Socket.io adapter |
| Job Queue | BullMQ | latest | Background processing |
| Real‑time | Socket.io | 4.x | Bidirectional events |
| Auth | JWT + refresh tokens | — | Stateless authentication |
| File Storage | AWS S3 / MinIO | — | Evidence uploads, report storage |
| Email | SendGrid / Postmark | — | Transactional email |
| SMS | Twilio | — | Critical alerts |
| Push Notifications | Firebase Cloud Messaging / APNs | — | Mobile push (future) |

### 3. Four‑Layer Governance Stack (Logical)

| Layer | Name | Implemented In | Data Flow |
|-------|------|----------------|-----------|
| 1 | Signal Capture | `governance_pulses` table, POST /pulses | TL → DB |
| 2 | Pattern Processing | `signal_clusters`, `threshold_events`, BullMQ worker | DB → Worker → DB |
| 3 | Governance Decision | RM Daily Oversight Board, Weekly Review Wizard | DB → UI → RM action → DB |
| 4 | Oversight & Reporting | Director Dashboard, Incident Reconstruction | DB → UI → Export |

### 4. Request Lifecycle

```
React Client
    │
    ▼
Express Router
    │
    ▼
JWT Middleware (validates token, extracts user_id, role, company_id)
    │
    ▼
requireTenant Middleware (verifies company_id exists, scopes all queries)
    │
    ▼
RBAC Guard (compares role against route minimum)
    │
    ▼
Controller (validates input shape)
    │
    ▼
Service (business logic, governance rules, emits events)
    │
    ├──► Repository (raw SQL queries scoped to company_id)
    │         │
    │         ▼
    │    PostgreSQL
    │
    ├──► EventBus (triggers notifications)
    │         │
    │         ▼
    │    Socket.io / Email / SMS
    │
    └──► BullMQ Queue (enqueues background job)
              │
              ▼
         Worker Process
```

### 5. Component Descriptions

| Component | Responsibility |
|-----------|----------------|
| **Auth Service** | Login, token refresh, password management. On login, auto‑generates missing governance pulse records for the user's assigned house. |
| **Pulse Service** | Validates 12‑field sequence, saves signals, triggers `pattern:check` job. |
| **Pattern Detection Service** (Worker) | Evaluates 10 threshold rules, creates/updates `signal_clusters`, logs `threshold_events`. Read‑only to `risk_register`. |
| **Cluster Service** | Manages clusters: promote to risk, dismiss, link signals. |
| **Risk Service** | Enforces `source_cluster_id` requirement, manages trajectory, closure/reopening with recurrence watch. |
| **Action Service** | Tracks action completion and effectiveness rating. |
| **Weekly Review Service** | Creates reviews, auto‑populates sections, enforces 13‑step sequence, locks on completion. |
| **Daily Governance Log Service** | Tracks daily RM reviews, handles absence fallback. |
| **Director Intelligence Service** | Aggregates cross‑site effectiveness, control failures, system‑level risks. |
| **Notification Service** | Dispatches real‑time, email, push, SMS notifications via event bus. |
| **Report Service** | Generates PDF/Excel reports via BullMQ worker. |

### 6. Data Flow: Signal → Risk

```
Team Leader submits signal (POST /pulses)
    │
    ▼
Pulse saved with review_status='New'
    │
    ▼
BullMQ job 'pattern:check' queued
    │
    ▼
Worker evaluates Rules 1‑10
    │
    ├─► If Rule 1 fires: create/update cluster (status='Emerging')
    ├─► If Rule 2 fires: cluster status='Escalated', notify RM
    ├─► If Rule 3 fires: create 'Mandatory Review' threshold_event
    │
    ▼
RM views Daily Oversight Board (GET /pulse/dashboard)
    │
    ▼
RM triages signal (PATCH /pulses/:id/review)
    │
    ├─► May link to existing cluster or create manual cluster
    │
    ▼
RM promotes cluster to risk (POST /clusters/:id/promote)
    │
    ▼
RM completes risk creation form (POST /risks) with source_cluster_id
    │
    ▼
Risk created; risk_signal_links populated for all cluster signals
```

### 7. Deployment Architecture

| Environment | Components |
|-------------|------------|
| **Production** | 2+ Node.js API instances behind load balancer, 2+ BullMQ worker instances, PostgreSQL primary + replica, Redis Sentinel/cluster, S3 bucket, CDN for static assets. |
| **Staging** | Single instance each, separate DB/Redis. |
| **Development** | Local Docker Compose (PostgreSQL, Redis, MinIO). |

---

<!-- FILE: 04_data_models.md -->

## Status: Complete

## Data Models (PostgreSQL Schema)

### 1. Entity‑Relationship Overview

```
companies ──┬── users ──┬── houses ──┬── governance_pulses
            │           │            ├── incidents
            │           │            ├── risks ──┬── risk_actions
            │           │            │           └── risk_signal_links
            │           │            ├── weekly_reviews
            │           │            ├── daily_governance_log
            │           │            └── signal_clusters ──┬── threshold_events
            │           │                                 └── governance_pulses (via links)
            │           └── (assigned houses)
            └── (company members)
```

> ⚠️ ASSUMPTION: All tables include `created_at` and `updated_at` timestamps with defaults. Omitted for brevity.

### 2. Table Definitions

#### 2.1 `companies`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| name | TEXT | NOT NULL | Legal entity name |
| domain | TEXT | | Primary email domain |
| status | ENUM | NOT NULL | 'active', 'inactive', 'suspended', 'archived' |
| plan | TEXT | | Subscription tier |

#### 2.2 `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| company_id | UUID | FOREIGN KEY (companies) NOT NULL | Tenant |
| email | TEXT | UNIQUE NOT NULL | Login |
| password_hash | TEXT | NOT NULL | bcrypt |
| role | TEXT | NOT NULL | 'SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'REGISTERED_MANAGER', 'TEAM_LEADER' |
| first_name | TEXT | | |
| last_name | TEXT | | |
| is_active | BOOLEAN | DEFAULT true | |
| pulse_days | JSONB | | e.g., ["Monday","Wednesday"] |
| deputy_rm_id | UUID | FOREIGN KEY (users) | Fallback RM |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

#### 2.3 `houses`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| company_id | UUID | FOREIGN KEY (companies) NOT NULL | |
| name | TEXT | NOT NULL | Site name |
| type | TEXT | | 'Residential', 'Supported Living', 'Domiciliary' |
| primary_rm_id | UUID | FOREIGN KEY (users) | Registered Manager |
| deputy_rm_id | UUID | FOREIGN KEY (users) | Fallback |
| status | TEXT | | 'active','inactive' |

#### 2.4 `governance_pulses` (Daily Pulse Entries)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| house_id | UUID | FOREIGN KEY (houses) NOT NULL | |
| created_by | UUID | FOREIGN KEY (users) NOT NULL | TL who captured |
| entry_date | DATE | NOT NULL | Date of observation |
| entry_time | TIME | NOT NULL | Time of observation |
| related_person | VARCHAR(200) | | Anonymized service user ref |
| signal_type | ENUM | NOT NULL | 'Incident','Concern','Observation','Safeguarding','Medication','Staffing','Environment','Positive' |
| risk_domain | TEXT[] | NOT NULL | Array from: 'Behaviour','Medication','Staffing','Physical','Mental','Safeguarding','Environment','Governance' |
| description | TEXT | NOT NULL | Factual description only |
| immediate_action | TEXT | | Action taken at time |
| severity | ENUM | NOT NULL | 'Low','Moderate','High','Critical' |
| has_happened_before | ENUM | NOT NULL | 'Yes','No','Unsure' |
| pattern_concern | ENUM | NOT NULL | 'None','Possible','Clear','Escalating' |
| escalation_required | ENUM | NOT NULL | 'None','Manager Review','Urgent Review','Immediate Escalation' |
| evidence_url | TEXT | | S3 object key |
| review_status | ENUM | DEFAULT 'New' | 'New','Reviewed','Closed','Monitoring','Linked' |
| reviewed_by | UUID | FOREIGN KEY (users) | RM who triaged |
| reviewed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

#### 2.5 `signal_clusters`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| company_id | UUID | FOREIGN KEY (companies) NOT NULL | Denormalized for performance |
| house_id | UUID | FOREIGN KEY (houses) NOT NULL | |
| risk_domain | TEXT | NOT NULL | Primary domain |
| cluster_label | VARCHAR(300) | NOT NULL | Auto‑generated e.g., "Medication Errors – Rose House (3 in 7 days)" |
| cluster_status | ENUM | NOT NULL | 'Emerging','Confirmed','Resolved','Escalated' |
| signal_count | INT | DEFAULT 0 | |
| first_signal_date | DATE | NOT NULL | |
| last_signal_date | DATE | NOT NULL | |
| trajectory | ENUM | NOT NULL | 'Improving','Stable','Deteriorating','Critical' |
| linked_risk_id | UUID | FOREIGN KEY (risks) | Set when promoted |
| created_by_system | BOOLEAN | DEFAULT TRUE | FALSE = manual RM cluster |
| dismissed_by | UUID | FOREIGN KEY (users) | |
| dismiss_reason | TEXT | | Required if dismissed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

#### 2.6 `threshold_events`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| house_id | UUID | FOREIGN KEY (houses) NOT NULL | |
| rule_number | INT | NOT NULL | 1–10 |
| rule_name | TEXT | NOT NULL | e.g., "Repetition Trigger" |
| cluster_id | UUID | FOREIGN KEY (signal_clusters) | |
| output_type | ENUM | NOT NULL | 'Signal Flag','Risk Proposal','Mandatory Review' |
| fired_at | TIMESTAMPTZ | DEFAULT NOW() | |
| acknowledged_by | UUID | FOREIGN KEY (users) | |
| acknowledged_at | TIMESTAMPTZ | | |
| dismissed | BOOLEAN | DEFAULT FALSE | |
| dismiss_reason | TEXT | | |

#### 2.7 `risks`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| house_id | UUID | FOREIGN KEY (houses) NOT NULL | |
| source_cluster_id | UUID | FOREIGN KEY (signal_clusters) NOT NULL | **Mandatory** creation gate |
| risk_title | VARCHAR(400) | NOT NULL | |
| risk_domain | TEXT | NOT NULL | |
| status | ENUM | NOT NULL | 'Active','Monitoring','Closed','Escalated' |
| trajectory | ENUM | NOT NULL | 'Improving','Stable','Deteriorating','Critical' |
| severity | ENUM | NOT NULL | 'Low','Moderate','High','Critical' |
| signal_count | INT | DEFAULT 0 | Cached count |
| control_measures | TEXT | | |
| control_effectiveness | ENUM | | 'Effective','Neutral','Ineffective' (aggregated) |
| owner_id | UUID | FOREIGN KEY (users) NOT NULL | |
| created_by | UUID | FOREIGN KEY (users) NOT NULL | |
| next_review_date | DATE | NOT NULL | |
| last_reviewed_at | TIMESTAMPTZ | | |
| closure_reason | TEXT | | Required when status='Closed' |
| closed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

#### 2.8 `risk_signal_links`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| risk_id | UUID | FOREIGN KEY (risks) NOT NULL | |
| pulse_entry_id | UUID | FOREIGN KEY (governance_pulses) NOT NULL | |
| linked_by | UUID | FOREIGN KEY (users) NOT NULL | |
| linked_at | TIMESTAMPTZ | DEFAULT NOW() | |
| link_note | TEXT | | |
| UNIQUE(risk_id, pulse_entry_id) | | | |

#### 2.9 `risk_actions`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| title | VARCHAR(400) | NOT NULL | |
| linked_risk_id | UUID | FOREIGN KEY (risks) | |
| linked_pulse_id | UUID | FOREIGN KEY (governance_pulses) | |
| linked_review_id | UUID | FOREIGN KEY (weekly_reviews) | Weekly review that agreed this action |
| owner_id | UUID | FOREIGN KEY (users) NOT NULL | |
| assigned_by | UUID | FOREIGN KEY (users) NOT NULL | |
| due_date | DATE | NOT NULL | |
| status | ENUM | NOT NULL | 'Pending','In Progress','Complete','Overdue' |
| effectiveness | ENUM | | 'Effective','Neutral','Ineffective' |
| effectiveness_reviewed_at | TIMESTAMPTZ | | |
| completion_note | TEXT | | |
| completed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

#### 2.10 `weekly_reviews` (Structured 13‑Step Version)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| house_id | UUID | FOREIGN KEY (houses) NOT NULL | |
| review_period_start | DATE | NOT NULL | |
| review_period_end | DATE | NOT NULL | |
| pulse_entries_reviewed | INT | NOT NULL | Auto‑count |
| repeating_signals | JSONB | | Array of cluster summaries |
| escalating_signals | JSONB | | Array of clusters with trajectory='Deteriorating' |
| protective_signals | JSONB | | RM‑confirmed improvements |
| leadership_interpretation | TEXT | | RM qualitative assessment |
| risks_updated | UUID[] | | Array of risk IDs |
| control_failures | TEXT | | Narrative |
| decisions_required | TEXT | | |
| overall_position | ENUM | NOT NULL | 'Stable','Watch','Concern','Escalating','Serious Concern' |
| narrative_summary | TEXT | | Final inspection narrative |
| step_reached | INT | DEFAULT 1 | 1–13, enforces sequence |
| completed_by | UUID | FOREIGN KEY (users) | |
| completed_at | TIMESTAMPTZ | | Locked after set |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

#### 2.11 `daily_governance_log`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| house_id | UUID | FOREIGN KEY (houses) NOT NULL | |
| review_date | DATE | NOT NULL | |
| completed | BOOLEAN | DEFAULT FALSE | |
| reviewed_by | UUID | FOREIGN KEY (users) | |
| review_type | ENUM | DEFAULT 'Primary' | 'Primary','Deputy Cover','Director Override' |
| daily_note | TEXT | | |
| completed_at | TIMESTAMPTZ | | |
| escalation_sent | BOOLEAN | DEFAULT FALSE | True when 48h alert fired |

#### 2.12 `incidents` (Existing, minimally modified)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| house_id | UUID | FOREIGN KEY |
| title | TEXT | |
| description | TEXT | |
| severity | TEXT | 'Low','Medium','High','Critical' |
| status | TEXT | 'Open','In Progress','Resolved','Closed' |
| persons_involved | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| resolved_at | TIMESTAMPTZ | |
| resolution_note | TEXT | |

> ⚠️ ASSUMPTION: The existing `incidents` table is sufficient; we will add a `linked_reconstruction_id` in Phase 2 for incident reconstruction feature.

### 3. Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| governance_pulses | (house_id, entry_date) | Daily Oversight Board filtering |
| governance_pulses | (review_status, created_at) | Triage queue |
| signal_clusters | (house_id, cluster_status) | RM dashboard |
| threshold_events | (house_id, fired_at) | Audit |
| risks | (house_id, status) | Risk register |
| daily_governance_log | (house_id, review_date) | Coverage checks |

### 4. Sample Data (JSON Representation)

```json
// Example signal_cluster record
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "house_id": "123e4567-e89b-12d3-a456-426614174000",
  "risk_domain": "Behaviour",
  "cluster_label": "Repeated Agitation – Rose House (3 in 7 days)",
  "cluster_status": "Emerging",
  "signal_count": 3,
  "first_signal_date": "2026-04-01",
  "last_signal_date": "2026-04-07",
  "trajectory": "Stable",
  "linked_risk_id": null
}
```

---

<!-- FILE: 05_api_contracts.md -->

## Status: Complete

## API Contracts (REST)

All endpoints prefixed with `/api/v1`. Authentication via `Authorization: Bearer <JWT>` header.

### 1. Authentication Endpoints

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| POST | `/auth/login` | `{ email, password }` | `{ access_token, refresh_token, user }` | Authenticate |
| POST | `/auth/refresh` | `{ refresh_token }` | `{ access_token, refresh_token }` | Refresh tokens |
| POST | `/auth/logout` | — | `{ success: true }` | Invalidate session |
| GET | `/auth/me` | — | `{ id, email, role, company_id, houses[] }` | Current user |
| POST | `/auth/change-password` | `{ current_password, new_password }` | `{ success: true }` | |

### 2. Signal Capture (Daily Pulse)

| Method | Endpoint | Auth | Request Body | Response | Description |
|--------|----------|------|--------------|----------|-------------|
| POST | `/pulses` | TL+ | See 12‑field schema below | `{ id, ... }` | Submit signal; triggers pattern engine |
| GET | `/pulses` | RM+ | Query: `house_id`, `start_date`, `end_date`, `review_status`, `severity` | `{ data: Pulse[], total }` | List signals |
| GET | `/pulses/dashboard` | RM | Query: `house_id` (default assigned) | `{ high_priority, pattern_signals, risk_candidates, actions }` | Daily Oversight Board feed |
| GET | `/pulses/:id` | RM+ | — | `Pulse` with linked cluster/risk | |
| PATCH | `/pulses/:id/review` | RM | `{ severity?, escalation_required?, review_status? }` | Updated Pulse | RM triage |
| POST | `/pulses/:id/link-risk` | RM | `{ risk_id, link_note? }` | `{ link_id }` | Create risk_signal_link |

**12‑Field Pulse Request Example:**
```json
{
  "house_id": "uuid",
  "entry_date": "2026-04-20",
  "entry_time": "14:30",
  "related_person": "Resident A",
  "signal_type": "Concern",
  "risk_domain": ["Behaviour"],
  "description": "Resident A was agitated during morning routine, shouting at staff.",
  "immediate_action": "Staff used de‑escalation techniques.",
  "severity": "Moderate",
  "has_happened_before": "Yes",
  "pattern_concern": "Possible",
  "escalation_required": "Manager Review",
  "evidence_url": null
}
```

### 3. Clusters & Pattern Detection

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/clusters` | RM+ | List clusters (filter: `house_id`, `status`, `trajectory`, `domain`) |
| GET | `/clusters/flags` | RM | Active threshold flags grouped by type |
| GET | `/clusters/:id` | RM+ | Full cluster with linked signals |
| PATCH | `/clusters/:id` | RM | Update `cluster_label`, `status`, `trajectory` |
| POST | `/clusters/:id/promote` | RM | Promote to risk → returns draft `risk_id` |
| POST | `/clusters/:id/dismiss` | RM | Dismiss with `{ dismiss_reason }` |

### 4. Risk Register

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/risks` | RM+ | List risks (filter: `house_id`, `status`, `trajectory`, `severity`) |
| GET | `/risks/candidates` | RM | Clusters with ≥3 signals awaiting decision |
| POST | `/risks` | RM | **Requires** `source_cluster_id`. Returns 400 if missing or insufficient signals. |
| GET | `/risks/:id` | RM+ | Full risk detail |
| PATCH | `/risks/:id` | RM | Update trajectory, severity, control_measures, next_review_date |
| POST | `/risks/:id/close` | RM | Body: `{ closure_reason }` → starts 14‑day watch |
| POST | `/risks/:id/reopen` | RM | Body: `{ reopen_reason }` (only if Rule 5 active) |
| GET | `/risks/:id/signals` | RM+ | Array of `risk_signal_links` with pulse details |
| GET | `/risks/:id/timeline` | RM+ | Chronological events (status changes, threshold events) |

**POST /risks Request Example:**
```json
{
  "source_cluster_id": "uuid",
  "risk_title": "Escalating Behavioural Risk – Resident A",
  "risk_domain": "Behaviour",
  "severity": "High",
  "trajectory": "Deteriorating",
  "control_measures": "PRN protocol, increased supervision",
  "owner_id": "uuid",
  "next_review_date": "2026-05-01"
}
```

### 5. Actions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/actions` | TL+ | List actions (TL sees own; RM sees all for house) |
| GET | `/actions/overdue` | RM+ | All overdue actions for house |
| POST | `/actions` | RM | Create action with `{ title, owner_id, due_date, linked_risk_id?, linked_pulse_id? }` |
| PATCH | `/actions/:id/complete` | TL/RM | Mark complete with `{ completion_note }` |
| PATCH | `/actions/:id/effectiveness` | RM | Rate `{ effectiveness }` |
| GET | `/actions/pending-effectiveness` | RM | Actions awaiting rating |

### 6. Weekly Governance Review

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/weekly-reviews` | RM | Open new review for house + period. Auto‑populates sections 2–5. |
| GET | `/weekly-reviews/:id` | RM+ | Full review data |
| PATCH | `/weekly-reviews/:id` | RM | Update fields; backend enforces step sequence |
| POST | `/weekly-reviews/:id/complete` | RM | Finalize, lock, generate narrative |
| GET | `/weekly-reviews` | Director+ | All reviews across houses (filter: `house_id`, `completed`) |

### 7. Daily Governance Log

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/governance-log/open` | RM+ | Start daily session for house |
| PATCH | `/governance-log/:id/complete` | RM+ | Mark complete with optional `daily_note` |
| GET | `/governance-log/coverage` | Director | All houses: last review date, status |
| GET | `/governance-log/missed` | RM+ | Houses with missed reviews >48h |

### 8. Director Intelligence

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/director/summary` | Director+ | Org‑wide effectiveness counts, overall position per house |
| GET | `/director/services` | Director+ | Service comparison table (Effective/Neutral/Ineffective) |
| GET | `/director/action-effectiveness` | Director+ | 7‑day trend by day |
| GET | `/director/control-failures` | Director+ | Houses with ≥2 ineffective actions same domain |
| GET | `/director/system-risks` | Director+ | Risks flagged as appearing in ≥2 houses |
| GET | `/director/missed-reviews` | Director+ | Houses with daily review missed >48h |

### 9. Incident Reconstruction (Phase 2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/incident-reconstructions` | RM+ | Create reconstruction from template |
| GET | `/incident-reconstructions/:id` | RM+ | Full reconstruction with timeline |
| PATCH | `/incident-reconstructions/:id` | RM+ | Update fields |
| POST | `/incident-reconstructions/:id/complete` | RM+ | Finalize |

### 10. Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reports/request` | RM+ | Queue report generation (PDF/Excel) |
| GET | `/reports/:id/download` | RM+ | Download completed report |

### 11. Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "source_cluster_id is required for risk creation",
    "details": { ... }
  }
}
```

### 12. Role Requirements per Endpoint (Summary)

| Role | Permitted Endpoints |
|------|---------------------|
| TeamLeader | GET /pulses (own), POST /pulses, GET /actions (own), PATCH /actions/:id/complete |
| RegisteredManager | All above + triage, cluster management, risk CRUD, weekly reviews, daily governance, Director read‑only |
| Director | All RM read endpoints + Director intelligence endpoints |
| RI | Same as Director + incident reconstruction full access |
| Admin | /users, /houses, /companies (management) |

---

<!-- FILE: 06_ui_ux_spec.md -->

## Status: Complete

## UI/UX Specification

### 1. Design System

| Element | Specification |
|---------|---------------|
| Framework | React 18 + Vite |
| Component Library | Material UI (MUI) v5 for core components (inputs, tables, dialogs) |
| Styling | Tailwind CSS for custom layouts and utilities |
| Icons | Lucide‑React |
| Notifications | Sonner (toast) |
| Charts | Recharts |
| Animations | Framer Motion (optional) |

### 2. Color Palette (Governance‑Specific)

| Color | Hex | Usage |
|-------|-----|-------|
| Critical Red | `#DC2626` | Critical severity, Deteriorating trajectory, Immediate escalation |
| Warning Amber | `#F59E0B` | High severity, Escalating pattern, Concern position |
| Neutral Blue | `#3B82F6` | Stable, Moderate severity |
| Success Green | `#10B981` | Improving trajectory, Low severity, Effective action |
| Gray | `#6B7280` | Neutral actions, Closed risks |

### 3. Screen Inventory & User Flows

#### 3.1 Team Leader Screens

| Screen | Route | Components | User Actions |
|--------|-------|------------|--------------|
| **Signal Capture** | `/pulse/new` | 12‑field sequential form (each field unlocks after previous), evidence upload | Submit observation |
| **My Actions** | `/my-actions` | Table: title, due date, status, overdue badge; complete action button | Mark complete, add note |

#### 3.2 Registered Manager Screens

| Screen | Route | Key Sections | Actions |
|--------|-------|--------------|---------|
| **Daily Oversight Board** | `/dashboard/oversight` | 1. High Priority Signals (severity=High/Critical or escalation≠None, last 48h) 2. Pattern Signals (pattern_concern≠None, last 7d, grouped by domain) 3. Risk Touchpoint (clusters with ≥3 signals) 4. Actions Panel (due today/overdue/new) | Triage signals (update severity/escalation, mark reviewed), Link to cluster, Create/update risk, Assign actions |
| **Signal Triage** | `/signals/triage` | Filterable table of signals with review_status='New' | Batch update, link to cluster/risk |
| **Clusters** | `/clusters` | Card list or table; filter by status/domain/trajectory | View details, Promote to risk, Dismiss |
| **Risk Register** | `/risks` | Table with trajectory badges; "Create Risk" button disabled unless cluster selected | Create (from cluster), Update, Close |
| **Weekly Review Wizard** | `/weekly-review/new` | 13‑step stepper; locked steps; auto‑populated sections with confirm/edit | Complete each step, finalize |
| **Governance Log** | `/governance-log` | Calendar view of daily completions | Start daily review |

#### 3.3 Director / RI Screens

| Screen | Route | Panels | Actions |
|--------|-------|--------|---------|
| **Director Dashboard** | `/director` | 1. Org Effectiveness Summary (7‑day counts) 2. Service Comparison Table 3. 7‑Day Trend Chart 4. Control Failure Flags 5. Domain Weakness Analysis | Drill down to house, Export evidence pack |
| **Coverage Dashboard** | `/governance/coverage` | Table: House, Last Review, Status, Days Missed | Acknowledge missed reviews |

### 4. Component Inventory (Reusable)

| Component | Props | Behavior |
|-----------|-------|----------|
| `TrajectoryBadge` | `trajectory` | Colored badge with icon (↑ Improving, = Stable, ↓ Deteriorating, ⚠ Critical) |
| `SeverityBadge` | `severity` | Color‑coded |
| `PatternConcernSelector` | `value, onChange` | Dropdown: None, Possible, Clear, Escalating |
| `EscalationSelector` | `value, onChange` | Dropdown: None, Manager Review, Urgent Review, Immediate Escalation |
| `ClusterCard` | `cluster` | Displays label, signal count, trajectory, status; actions: Promote, Dismiss |
| `WeeklyReviewStepNav` | `currentStep, completedSteps, onStepClick` | 13‑step progress with lock icons |
| `GovernancePositionSelector` | `value, onChange` | Dropdown: Stable, Watch, Concern, Escalating, Serious Concern |
| `EffectivenessRatingModal` | `actionId, onSubmit` | Modal with 3 buttons (Effective/Neutral/Ineffective) |
| `ServiceComparisonTable` | `data` | Columns: House, Effective, Neutral, Ineffective, Open Risks, Position, RM Coverage |

### 5. Key Interaction Rules

| Rule | Description |
|------|-------------|
| Max 3 Clicks | On Daily Oversight Board, any decision (e.g., mark reviewed, update severity) must not exceed 3 clicks. |
| Auto‑Filter | Boards default to user's assigned houses and last 48 hours (or 7 days for patterns). |
| Sequence Locking | Weekly review steps are disabled until previous step is marked complete. Backend validates. |
| No Free‑Text Unless Necessary | Use dropdowns, selects, and auto‑populated fields wherever possible. |
| Immutable After Lock | Completed weekly reviews, closed risks, and resolved incidents are read‑only. |

### 6. Responsive Behavior

- Desktop‑first design (minimum width 1280px).
- Tablets: scrollable tables and stacked cards.
- Mobile: not a primary target; basic read‑only access may be provided.

### 7. Accessibility

- WCAG 2.1 AA compliance.
- All interactive elements have focus indicators.
- Color is not the only means of conveying information (icons + text).

### 8. UI Mockup Descriptions (Textual)

**Daily Oversight Board Layout:**
```
[Alert Bar: 3 High Priority | 2 Patterns | 1 Immediate]
+-------------------+-------------------+
| Section A         | Section B         |
| High Priority     | Pattern Signals   |
| (list of 5 items) | (grouped by domain)|
+-------------------+-------------------+
| Section C         | Section D         |
| Risk Touchpoint   | Actions Panel     |
| (clusters ready)  | (due/overdue list)|
+-------------------+-------------------+
```

**Weekly Review Wizard:**
```
Step 1 of 13: Scope
[Service] Rose House
[Period Start] 2026-04-13
[Period End]   2026-04-19
[Continue →]

(Step 2 auto‑populates pulse count)
...
Step 13: Narrative
[Textarea with draft narrative]
[Complete Review]
```

---

<!-- FILE: 07_business_logic.md -->

## Status: Complete

## Business Logic & Rules

### 1. Pattern Detection Engine – 10 Threshold Rules

The engine runs as a BullMQ worker on every new signal and every 15 minutes sweep. It evaluates rules in order; a single signal may trigger multiple rules.

#### 1.1 Global Rules

| Rule | Name | Condition | Output | Notification |
|------|------|-----------|--------|--------------|
| 1 | Repetition | ≥3 same‑domain signals in same house within 7 days | Cluster created/updated with status=`Emerging` | In‑app |
| 2 | Escalation | ≥5 same‑domain signals in 10 days OR ≥2 entries with `pattern_concern='Escalating'` | Cluster status=`Escalated`; `Risk Review Required` flag | Push + Email to RM |
| 3 | Immediate Risk | 1 Critical signal OR 2 High‑severity signals within 48h | `Mandatory Review` output; RM must act within 1 hour | Urgent Push + Email |
| 4 | Trajectory Deterioration | Signal severity progression Low→Moderate→High within 7 days | Cluster trajectory=`Deteriorating` | Push + Email |
| 5 | Control Failure | Similar signals reappear within 14 days of a risk being closed | Flag `Control Failure`; auto‑reopen risk (RM confirms) | Push + Email to RM + Director |

#### 1.2 Domain‑Specific Rules

| Rule | Domain | Pattern Threshold | Risk Review Threshold | Immediate Trigger |
|------|--------|------------------|----------------------|-------------------|
| 6 | Behaviour | ≥3 agitation/aggression in 7d | ≥2 intimidation events | ≥1 physical aggression |
| 7 | Medication | ≥2 errors in 7d | ≥3 errors in 7d | ≥1 serious error |
| 8 | Staffing | ≥3 understaffed shifts in 7d | ≥5 in 10d | Staffing issue + incident same day |
| 9 | Environment | ≥3 hazards in 7d | ≥1 hazard unresolved >48h | — |
| 10 | Governance | ≥2 missed reviews/audits | ≥3 missed | — |

#### 1.3 Cross‑Service Rules

| Condition | Output | Notification |
|-----------|--------|--------------|
| Same issue appears in ≥2 houses within 7 days | System‑Level Risk flag | Director |
| Same issue in ≥3 houses | Escalate to Director‑level Risk (Mandatory Review) | Director + RI + all RMs |

### 2. Cluster Promotion Logic

- **Eligibility:** Cluster must have `signal_count ≥ 3` OR contain at least one Critical/Immediate signal.
- **Promotion Flow:** RM clicks "Promote" → System creates draft risk record linked to cluster → RM completes risk form (title, owner, next review date) → Risk created; all cluster signals linked via `risk_signal_links`.
- **Dismissal:** RM can dismiss a cluster flag **with mandatory reason**. Dismissed clusters do not trigger further alerts but remain in history.

### 3. Risk Trajectory Calculation

Trajectory is updated by RM or automatically based on action effectiveness:

| Condition | Suggested Trajectory |
|-----------|----------------------|
| 2 consecutive Effective actions on same risk | Improving |
| 2 consecutive Ineffective actions on same risk | Deteriorating |
| 0 new signals for 10 days + no open actions | Prompt RM to review |
| Risk reopened via Rule 5 | Deteriorating (escalated severity) |

### 4. Risk Closure & Recurrence Watch

- **Closure:** Requires non‑empty `closure_reason`. Status → `Closed`, `closed_at` set.
- **14‑Day Watch:** A background job monitors for new signals in same house + domain. If any appear, Rule 5 fires.
- **Reopening:** Only allowed if active Rule 5 flag exists. RM must provide `reopen_reason`.

### 5. Daily RM Absence Fallback

| Trigger | System Action | Escalation |
|---------|---------------|------------|
| Daily review not completed by end of day | Logged as incomplete | None |
| Missed for 48 hours | Auto‑assign to `deputy_rm_id` (if set); send notification | Deputy must complete |
| Missed for 72 hours | Notify Director; flag house in coverage dashboard | Director must acknowledge |
| Safeguarding signal during any absence | "Enhanced Oversight Required" flag; notify Deputy, Director, on‑call | Director must acknowledge within 4h |

### 6. Weekly Review Auto‑Population

When a weekly review is created (`POST /weekly-reviews`), the system queries:

| Section | Data Source |
|---------|-------------|
| `pulse_entries_reviewed` | `COUNT(*) FROM governance_pulses WHERE house_id=X AND entry_date BETWEEN start AND end` |
| `repeating_signals` | Clusters with status IN ('Emerging','Escalated') AND last_signal_date within period |
| `escalating_signals` | Clusters with trajectory='Deteriorating' within period |
| `protective_signals` | Clusters with trajectory='Improving' or status='Resolved' (RM confirms) |
| `control_failures` | Actions with effectiveness='Ineffective' grouped by domain |

### 7. Action Effectiveness Pipeline

- **Flagging:** 48 hours after `due_date`, if action status is `Complete` but `effectiveness` is null, it appears in RM's effectiveness review queue.
- **Rating Impact:** See trajectory calculation above.
- **Director Aggregation:** Ineffective actions count toward control failure flags (≥2 in same house+domain).

### 8. Incident Reconstruction (Simplified)

| Step | Description |
|------|-------------|
| 1 | User creates reconstruction, links incident (if any) and selects relevant pulse entries. |
| 2 | System generates pre‑incident signal timeline from linked pulses. |
| 3 | RM completes trajectory assessment, contributing factors, control failure analysis. |
| 4 | Governance narrative is drafted from structured data. |
| 5 | Final reconstruction is locked and can be exported for CQC. |

### 9. Governance Integrity Rules (Non‑Negotiable)

| Rule | Enforcement |
|------|-------------|
| Risks are never auto‑created | Pattern engine writes only to `signal_clusters` and `threshold_events`; `POST /risks` requires explicit RM action with `source_cluster_id`. |
| No cluster = no risk | API returns 400 if `source_cluster_id` missing or cluster has <3 signals (except Critical). |
| No hard deletion | Governance tables have no `DELETE` endpoints; records transition to terminal status. |
| Locked means locked | Closed risks, completed weekly reviews, resolved incidents reject further modifications. |
| Closure requires evidence | `POST /risks/:id/close` requires non‑empty `closure_reason`. |
| Weekly review sequence | PATCH requests validate step dependencies; if Step N fields provided but Step N‑1 incomplete, return 400. |

### 10. Threshold Output Types (RM Experience)

| Output | Meaning | Can Dismiss? |
|--------|---------|--------------|
| Signal Flag | "Watch this" — appears in Pattern Signals section | Yes, with reason |
| Risk Proposal | System suggests risk creation | Yes, with reason (or Accept) |
| Mandatory Review | Must act within defined SLA (1h for Critical) | No |

---

<!-- FILE: 08_integrations.md -->

## Status: Complete

## Third‑Party Integrations

### 1. Email Service

| Provider | Purpose | Configuration |
|----------|---------|---------------|
| SendGrid (primary) or Postmark | Transactional emails (notifications, reports) | API key, from email address |

**Email Templates Required:**
- `immediate_risk_flag` (Rule 3)
- `risk_review_required` (Rule 2)
- `control_failure` (Rule 5)
- `rm_review_missed_48h`
- `rm_review_missed_72h`
- `action_overdue`
- `weekly_review_completed` (to Director)

> ⚠️ ASSUMPTION: Email templates will be stored in the database (`email_templates` table) to allow admin customization; otherwise hardcoded in code.

### 2. SMS Provider

| Provider | Purpose | Configuration |
|----------|---------|---------------|
| Twilio | Critical alerts (safeguarding during RM absence) | Account SID, Auth Token, From phone number |

**SMS Trigger:**
- `SAFEGUARDING_DURING_ABSENCE` event.

### 3. Push Notifications

| Provider | Purpose | Configuration |
|----------|---------|---------------|
| Firebase Cloud Messaging (FCM) for Android/Web | Push notifications to browser/mobile | Server key, VAPID keys |
| Apple Push Notification Service (APNs) for iOS | Future mobile app | Certificate |

> ⚠️ ASSUMPTION: Push notifications are optional for MVP; in‑app Socket.io is primary.

### 4. File Storage (Evidence & Reports)

| Provider | Purpose | Configuration |
|----------|---------|---------------|
| AWS S3 or S3‑compatible (e.g., MinIO) | Store `evidence_url` uploads, generated PDF/Excel reports | Bucket name, region, access key, secret key |

**Pre‑signed URLs:** For direct client uploads, backend generates pre‑signed POST URLs.

### 5. Real‑time Communication

| Technology | Usage |
|------------|-------|
| Socket.io | Real‑time notifications (in‑app) and dashboard live updates |
| Redis Adapter | Required when running multiple Node instances to broadcast messages across all clients |

### 6. Background Jobs

| Technology | Usage |
|------------|-------|
| BullMQ | Queue for pattern detection, daily checks, report generation, effectiveness prompts |
| Redis | Backing store for BullMQ |

### 7. External Dependencies Summary

| Service | Required? | Notes |
|---------|-----------|-------|
| PostgreSQL | Yes | Self‑hosted or cloud (e.g., AWS RDS, Neon) |
| Redis | Yes | Self‑hosted or cloud (ElastiCache, Upstash) |
| S3 Storage | Yes | For file uploads; can use MinIO in dev |
| Email Provider | Yes | SendGrid free tier sufficient for dev |
| SMS Provider | Optional | Can be disabled; fallback to email only |
| Push Notifications | Optional | In‑app Socket.io covers core needs |

### 8. Webhook Specifications (Outgoing)

*None currently required; future integration with care planning systems may use webhooks.*

### 9. API Keys & Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | AWS region |
| `S3_ACCESS_KEY` | |
| `S3_SECRET_KEY` | |
| `SENDGRID_API_KEY` | |
| `TWILIO_ACCOUNT_SID` | |
| `TWILIO_AUTH_TOKEN` | |
| `TWILIO_PHONE_NUMBER` | |

> ❓ UNCLEAR: Should email/SMS providers be configurable per tenant? Likely no — single org‑wide config is sufficient for MVP.

---

<!-- FILE: 09_infrastructure.md -->

## Status: Complete

## Infrastructure & Deployment

### 1. Hosting Environment

| Component | Recommendation | Justification |
|-----------|----------------|---------------|
| Node.js API | AWS ECS Fargate / DigitalOcean App Platform / Render | Scalable, managed containers |
| PostgreSQL | AWS RDS / Neon / DigitalOcean Managed DB | Managed backups, high availability |
| Redis | AWS ElastiCache / Upstash | Managed Redis with persistence |
| Static Frontend | AWS S3 + CloudFront / Vercel / Netlify | CDN distribution |
| File Storage | AWS S3 | Reliable object storage |

### 2. Environment Configuration

All configuration via environment variables (see `08_integrations.md`). No hardcoded secrets.

**Development:** Docker Compose file provided:
```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: devpass
  redis:
    image: redis:7-alpine
  minio:
    image: minio/minio
```

### 3. Build Process

**Backend:**
```bash
npm install
npm run build  # tsc
npm run migrate  # run DB migrations
npm start
```

**Frontend:**
```bash
npm install
npm run build  # vite build → dist/
```

### 4. Deployment Steps (Production)

1. Push code to main branch.
2. CI/CD pipeline (GitHub Actions / GitLab CI) runs tests and builds.
3. Backend: Build Docker image, push to registry, deploy to ECS/Fargate.
4. Frontend: Upload `dist/` to S3, invalidate CloudFront cache.
5. Run database migrations (automated as part of deployment).
6. Run health checks.

### 5. Scaling Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| API Servers | Horizontal scaling behind load balancer; stateless. |
| BullMQ Workers | Separate process, can scale horizontally (concurrency per worker). |
| PostgreSQL | Read replicas for analytics queries; connection pooling (PgBouncer). |
| Redis | Sentinel or Cluster for high availability. |
| Socket.io | Use Redis adapter to broadcast across instances. |

### 6. Monitoring & Logging

| Tool | Purpose |
|------|---------|
| Winston / Pino | Structured logging (JSON) |
| Sentry | Error tracking |
| Prometheus + Grafana | Metrics (optional) |
| Bull Board | BullMQ queue monitoring UI |

### 7. Backup & Disaster Recovery

- PostgreSQL: Daily automated backups with point‑in‑time recovery (RDS).
- Redis: AOF persistence enabled; backups to S3.
- S3: Versioning enabled on evidence bucket.
- Retention: Governance data must be retained for minimum 6 years; implement archival policy.

### 8. Security Hardening

- TLS 1.3 for all endpoints.
- Helmet.js for security headers.
- Rate limiting on auth endpoints.
- JWT secrets stored in secrets manager.
- Regular dependency scanning.

---

<!-- FILE: 10_testing_spec.md -->

## Status: Complete

## Testing Specification

### 1. Unit Tests (Backend)

| Module | Test Cases |
|--------|------------|
| Pattern Detection | Verify each of 10 rules fires correctly given signal inputs; test edge cases (exactly 3 signals, 14‑day recurrence). |
| Cluster Promotion | Validate promotion fails if signal_count <3 and no Critical signal. |
| Risk Creation | Ensure 400 when source_cluster_id missing. |
| Trajectory Calculation | Test 2 Effective → Improving; 2 Ineffective → Deteriorating. |
| Weekly Review Sequence | Ensure PATCH rejects out‑of‑order updates. |

### 2. Integration Tests (API)

| Flow | Test Steps | Expected Result |
|------|------------|-----------------|
| Signal → Cluster → Risk | 1. Submit 3 similar signals in 7 days. 2. Verify cluster created (status=Emerging). 3. RM promotes cluster. 4. Create risk. | Risk created; risk_signal_links contain all 3 signals. |
| Rule 5 Control Failure | 1. Close risk. 2. Submit similar signal within 14 days. | Rule 5 event fired; risk auto‑reopened. |
| RM Absence Fallback | 1. RM misses review for 48h. | Deputy assigned; notification sent. |
| Weekly Review Auto‑Pop | 1. Create review with period having 5 signals and 2 clusters. | pulse_entries_reviewed=5; repeating_signals populated. |

### 3. End‑to‑End Tests (Playwright/Cypress)

| User Journey | Steps |
|--------------|-------|
| Team Leader submits observation | Navigate to /pulse/new, fill 12‑field form, submit → success toast. |
| RM Daily Oversight | Open /dashboard/oversight, see sections populated, triage a signal (update severity, mark reviewed). |
| RM Weekly Review | Start review, verify auto‑populated data, complete steps, finalize → locked view. |
| Director Dashboard | Open /director, see service comparison table, drill down to house. |

### 4. Performance Tests

| Scenario | Load | Acceptable Response Time |
|----------|------|--------------------------|
| GET /pulses/dashboard | 50 concurrent RMs | <2s |
| Pattern detection worker | 100 signals queued | <30s to process all |
| POST /risks | 20 concurrent | <1s |

### 5. Security Tests

- JWT expiration and refresh flow.
- RBAC: attempt to access RM‑only endpoint as Team Leader → 403.
- Tenant isolation: user from Company A cannot see Company B data.
- SQL injection via parameters (should be prevented by parameterized queries).

### 6. Acceptance Criteria (for Key Features)

| Feature | Acceptance Criteria |
|---------|---------------------|
| Signal Capture | Form enforces field sequence; all 12 fields saved correctly. |
| Pattern Detection | 3 same‑domain signals within 7 days produce a cluster. |
| Risk Creation Gate | "Create Risk" button disabled unless valid cluster selected. |
| Daily RM Board | RM can triage a signal in ≤3 clicks. |
| Weekly Review | Steps lock; completion produces PDF narrative. |
| Director Control Failure | Service with 2 ineffective actions on Behaviour flagged. |

### 7. Test Data Setup

Use seed script to create:
- Company A with 2 houses (Rose House, Oak Lodge)
- Users: TL1, RM1, Director1
- Pre‑loaded signals for pattern detection verification.

---

<!-- FILE: 11_build_sequence.md -->

## Status: Complete

## Build Sequence (Ordered Development Plan)

This sequence is optimized for an AI agent to build the system incrementally, with each phase producing a testable increment.

### Phase 0: Foundation Setup (Week 1)
1. Initialize project repository with Node.js/Express + TypeScript backend and React/Vite frontend.
2. Configure PostgreSQL and Redis (Docker Compose for dev).
3. Implement multi‑tenancy middleware (`requireTenant`).
4. Implement JWT authentication + RBAC guards.
5. Set up BullMQ queue infrastructure.
6. Set up Socket.io server with Redis adapter.
7. **Deliverable:** Authentication works; tenant isolation verified.

### Phase 1: Signal Capture & Pattern Engine (Weeks 2‑5)
1. Extend `governance_pulses` table with 12‑field schema (migration).
2. Build POST /pulses endpoint with validation.
3. Build 12‑field sequential form in frontend.
4. **Remove** auto‑risk creation logic from existing code.
5. Create `signal_clusters`, `threshold_events`, `risk_signal_links` tables.
6. Implement Pattern Detection Engine as BullMQ worker (Rules 1‑10).
7. Build cluster API endpoints (GET, PATCH, promote, dismiss).
8. Build RM Daily Oversight Board frontend (4 sections).
9. **Deliverable:** Signals can be submitted; clusters appear in RM dashboard.

### Phase 2: Risk Governance Enhancements (Weeks 6‑8)
1. Add `source_cluster_id`, `trajectory`, `closure_reason` to `risks` table.
2. Modify POST /risks to require cluster; add validation.
3. Implement risk closure with 14‑day recurrence watch (Rule 5 worker).
4. Build risk‑signal linkage UI (Signals tab).
5. Add trajectory badge and timeline to Risk Detail.
6. **Deliverable:** Risks are evidence‑based; closure/reopening works.

### Phase 3: Action Effectiveness (Weeks 9‑10)
1. Add `effectiveness`, `linked_review_id` to `risk_actions`.
2. Build effectiveness rating modal and API endpoint.
3. Implement worker to flag actions for review 48‑72h post‑due.
4. Connect effectiveness to risk trajectory pipeline.
5. **Deliverable:** Actions can be rated; trajectory updates accordingly.

### Phase 4: Daily Governance Log & Absence Fallback (Weeks 11‑12)
1. Create `daily_governance_log` table.
2. Build API endpoints for starting/completing daily review.
3. Implement BullMQ worker for daily checks (08:00) to detect missed reviews.
4. Add deputy assignment logic and notifications.
5. Build Coverage Dashboard for Director.
6. **Deliverable:** RM daily oversight is tracked; absences escalate.

### Phase 5: Weekly Governance Review (Weeks 13‑16)
1. Replace `weekly_reviews` table with structured 13‑step schema.
2. Build auto‑population queries for sections 2‑5.
3. Build Weekly Review Wizard frontend with step locking.
4. Implement 13‑step sequence enforcement in API.
5. Generate narrative draft and PDF report on completion.
6. **Deliverable:** RMs can complete full weekly governance cycle.

### Phase 6: Director Intelligence Dashboard (Weeks 17‑19)
1. Build Director API endpoints (summary, services, trend, control‑failures, system‑risks).
2. Build 5‑panel Director Dashboard frontend.
3. Implement System‑Level Risk detection (cross‑service rule).
4. **Deliverable:** Director sees organizational control at a glance.

### Phase 7: Incident Reconstruction & Polish (Weeks 20‑22)
1. Build incident reconstruction template and linking to signals/risks.
2. Implement full notification matrix (12 event types).
3. End‑to‑end testing, performance tuning.
4. Documentation and deployment scripts.
5. **Deliverable:** Production‑ready system.

> ⚠️ ASSUMPTION: Development is done by a small team with parallel frontend/backend streams; estimates are in weeks of effort, not calendar time.

---

<!-- FILE: 12_open_questions.md -->

## Status: Requires human input

## Open Questions & Decisions Needed

The following items were not fully resolved from the provided documentation and require human clarification before build.

### 1. Existing Data Migration
> ❓ UNCLEAR: What is the strategy for migrating existing `governance_pulses` (template‑based) to the new 12‑field signal schema? Should old pulses be backfilled with default values or left as legacy data with a different table?
- **Suggested:** Keep old pulses in separate table or mark as `legacy_type`; new system only applies to new entries.

### 2. Compliance Checklist vs. Signal Capture
> ❓ UNCLEAR: The original system had "Governance Pulses" as scheduled compliance questionnaires. The doctrine requires always‑open signal capture. Should the old compliance checklist feature be retained as a separate module, or completely replaced?
- **Suggested:** Retain compliance templates as a separate "Audit Checklist" feature, distinct from Daily Pulse signal capture.

### 3. Notification Provider Selection
> ❓ UNCLEAR: Which specific email provider will be used in production? SendGrid or Postmark? Is SMS (Twilio) required for MVP or can be deferred?
- **Decision needed:** Specify provider and obtain API keys.

### 4. Data Retention Policy
> ❓ UNCLEAR: The system must retain audit trails for 6 years. Is there a requirement to automatically archive/delete old data after that period? What is the archival mechanism (cold storage, separate DB)?
- **Suggested:** Implement a background job to move records older than 6 years to an `_archive` table or S3 backup.

### 5. Cross‑Service Pattern Detection Scope
> ❓ UNCLEAR: Should System‑Level Risk detection look across **all houses** in the company, or only houses under the same Director/Region? The current spec says "≥2 services within 7 days" – is that any two houses?
- **Assumption:** All houses in the company; if region‑based grouping is needed, it can be added later via `region_id`.

### 6. Incident Reconstruction Scope
> ❓ UNCLEAR: Is the incident reconstruction feature required for MVP (Phase 1) or can it be a Phase 2 add‑on? The gap analysis lists it as missing but priority P1.
- **Decision:** Clarify if incident reconstruction must be included in initial build.

### 7. Mobile Responsiveness Priority
> ❓ UNCLEAR: The spec states desktop‑first, mobile not primary target. Is any mobile support required (e.g., for Team Leaders on shift)?
- **Suggested:** Ensure basic responsiveness for tablet; mobile can be deferred.

### 8. Multi‑Language Support
> ❓ UNCLEAR: Will the platform need to support multiple languages (e.g., Welsh for care services in Wales)?
- **Decision:** If required, i18n framework should be added early.

### 9. Offline Support
> ❓ UNCLEAR: Do Team Leaders need to capture signals while offline (e.g., in areas with poor connectivity)?
- **Decision:** If yes, a PWA or local storage sync mechanism is needed.

### 10. Custom Branding per Tenant
> ❓ UNCLEAR: Should the UI support per‑tenant branding (logo, primary color)? The `companies` table has no branding fields.
- **Decision:** Add `logo_url` and `primary_color` columns if needed.

### 11. Audit Trail Granularity
> ❓ UNCLEAR: The existing system has an `Audit Logs` entity. Should field‑level change tracking (e.g., "trajectory changed from Stable to Deteriorating") be implemented, or is status change logging sufficient?
- **Suggested:** For MVP, log status changes and key field updates (trajectory, severity) via `threshold_events` and risk timeline.

### 12. Reporting Formats
> ❓ UNCLEAR: Which specific PDF/Excel report templates are required for inspection evidence packs? Should they be customizable by the end user?
- **Suggested:** Start with a fixed "Governance Evidence Pack" PDF containing weekly review narrative, risk register, and signal timeline; customization can be Phase 2.

---

*End of Specification Set*