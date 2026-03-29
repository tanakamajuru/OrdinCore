# Screen Architecture Specification
# Ordin Core Governance SaaS Platform

## Document Information

| **Document Version** | 1.0 |
|---------------------|------|
| **Date** | March 5, 2026 |
| **Author** | Tanaka Majuru |
| **Approved By** | UX Lead |
| **Status** | Final |

## Table of Contents

1. [Screen Inventory](#1-screen-inventory)
2. [Route Map & Navigation](#2-route-map--navigation)
3. [Role-Based Access Control](#3-role-based-access-control)
4. [Screen Specifications](#4-screen-specifications)
5. [Critical Success Screens](#5-critical-success-screens)
6. [Phase 2 Intelligence Layer](#6-phase-2-intelligence-layer)

---

## 1. Screen Inventory

### Core MVP Screens (Total: 11)

| Screen ID | Screen Name | Route | Primary Role | Priority |
|------------|-------------|-------|--------------|----------|
| S-001 | Login | /login | Public | Critical |
| S-010 | Organisation Setup | /setup | SYSADMIN | Critical |
| S-100 | Home Dashboard | /home | All Roles | Critical |
| S-201 | Governance Pulse | /houses/:houseId/pulses/new | RM | Critical |
| S-300 | Risk Register | /risks | RM/RI/QA | Critical |
| S-302 | Risk Detail | /risks/:riskId | RM/RI/QA | Critical |
| S-400 | Escalations Inbox | /escalations/inbox | RM/RI/DIR/QA | Critical |
| S-401 | Escalation Review | /escalations/:escalationId | Assigned Role | Critical |
| S-501 | Weekly Review Draft | /weekly-reviews/:weekId/draft | RI/QA | Critical |
| S-503 | Weekly Review Detail | /weekly-reviews/:weekId | All Roles | Critical |
| S-700 | Governance Archive | /archive | RI/DIR/QA | High |

### Phase 2 Screens (Total: 4)

| Screen ID | Screen Name | Route | Primary Role | Priority |
|------------|-------------|-------|--------------|----------|
| S-600 | Monthly Report | /monthly-reports/:monthId | DIR/RI | High |
| S-800 | Incident Reconstruction | /incidents/:incidentId | RI/DIR/QA | High |
| S-900 | Trend Dashboard | /insights/trends | RI/DIR/QA | Medium |
| S-901 | Recurrence Map | /insights/recurrence | RI/DIR/QA | Medium |

---

## 2. Route Map & Navigation

### Navigation Structure

```
Primary Navigation (Role-based)
├── Home Dashboard
├── Governance Pulse (RM only)
├── Risk Register
├── Escalations
├── Weekly Reviews
├── Monthly Reports (DIR/RI)
├── Archive
└── Insights (Phase 2)
```

### Route Definitions

#### Authentication Routes
```typescript
// Public routes
/login                    // S-001 Login
/forgot-password          // Password reset (future)

// Authenticated routes
/home                    // S-100 Home Dashboard
/setup                   // S-010 Organisation Setup (admin only)
```

#### Governance Routes
```typescript
// House-level routes (RM primary)
/houses/:houseId/pulses/new           // S-201 New Pulse
/houses/:houseId/pulses               // Pulse History
/houses/:houseId/risks/new            // New Risk (from pulse)

// Risk management routes
/risks                               // S-300 Risk Register
/risks/:riskId                        // S-302 Risk Detail
/risks/:riskId/edit                   // Risk Update

// Escalation routes
/escalations/inbox                    // S-400 Escalations Inbox
/escalations/:escalationId            // S-401 Escalation Review
/escalations                          // Escalation Log (RI/DIR)
```

#### Review Routes
```typescript
// Weekly review routes
/weekly-reviews                       // Weekly Review List
/weekly-reviews/:weekId/draft         // S-501 Weekly Review Draft
/weekly-reviews/:weekId/finalise      // Finalise Review
/weekly-reviews/:weekId               // S-503 Weekly Review Detail

// Monthly report routes
/monthly-reports                      // Monthly Reports List
/monthly-reports/:monthId/draft       // Monthly Report Draft
/monthly-reports/:monthId/finalise    // Finalise Report
/monthly-reports/:monthId             // Monthly Report Detail
```

#### Archive & Insights Routes
```typescript
// Archive routes
/archive                              // S-700 Governance Archive

// Intelligence routes (Phase 2)
/incidents/:incidentId                // S-800 Incident Reconstruction
/incidents/:incidentId/timeline       // Governance Timeline
/insights/trends                      // S-900 Trend Dashboard
/insights/recurrence                  // S-901 Recurrence Map
```

---

## 3. Role-Based Access Control

### User Roles & Permissions

| Role | Description | Scope | Key Screens |
|------|-------------|-------|-------------|
| **RM** | Registered Manager | House-level | Pulse, House Risks, Create Escalations |
| **RI** | Responsible Individual | Cross-site | All Risks, Weekly Reviews, Escalations |
| **DIR** | Director/Owner | Executive | All Screens + Monthly Reports |
| **QA** | Governance/Quality Lead | Oversight | All Screens + Reviews |
| **SYSADMIN** | System Admin | Platform | Setup, User Management, Archive |

### Permission Matrix

| Screen | RM | RI | DIR | QA | SYSADMIN |
|--------|----|----|-----|----|-----------|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ |
| Setup | ✗ | ✗ | ✗ | ✗ | ✓ |
| Home Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Governance Pulse | ✓ | ✓ | R | R | ✓ |
| Risk Register | House | All | All | All | All |
| Risk Detail | House | All | All | All | All |
| Escalations Inbox | Created | Assigned | Assigned | Assigned | All |
| Escalation Review | Created | ✓ | ✓ | ✓ | ✓ |
| Weekly Review Draft | Contribute | ✓ | ✓ | ✓ | ✓ |
| Weekly Review Detail | ✓ | ✓ | ✓ | ✓ | ✓ |
| Monthly Report | R | ✓ | ✓ | ✓ | ✓ |
| Archive | Limited | ✓ | ✓ | ✓ | ✓ |
| Incident Reconstruction | ✗ | ✓ | ✓ | ✓ | ✓ |
| Trend Dashboard | R | ✓ | ✓ | ✓ | ✓ |

**Legend**: ✓ = Full Access, R = Read-only, ✗ = No Access

### Scope Rules

#### House-Level Scope (RM)
- Can only see and edit data for assigned houses
- Can create escalations for own house
- Can read weekly reviews for own house contributions

#### Organization-Level Scope (RI/DIR/QA)
- Can see all houses and cross-house patterns
- Can review escalations assigned to their role
- Can finalize weekly and monthly reviews

#### System-Level Scope (SYSADMIN)
- Full system access for setup and maintenance
- Can manage users, roles, and organizational structure
- Cannot modify locked governance records

---

## 4. Screen Specifications

### S-001: Login Screen

#### Purpose
Authenticate users and establish session context.

#### Key Elements
```
┌─────────────────────────────────────────┐
│              CARESIGNAL                │
│                                         │
│    Email Address                        │
│    [________________________]          │
│                                         │
│    Password                             │
│    [________________________]          │
│                                         │
│    [    Login    ]  [Forgot Password?]  │
│                                         │
│         Don't have an account?         │
│              [Sign Up]                  │
└─────────────────────────────────────────┘
```

#### Technical Requirements
- Form validation with error states
- Remember me functionality
- Password reset flow integration
- Role-based redirect after login
- Session management with JWT tokens

---

### S-100: Home Dashboard

#### Purpose
Role-based task queue and governance rhythm overview.

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Welcome, [User Name]                     [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────┤
│ GOVERNANCE RHYTHM STATUS                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Pulse Due   │ │ Escalations │ │ Reviews Due │ │ Archive     │ │
│ │    2        │ │    1        │ │    1        │ │    Ready    │ │
│ │   Today     │ │  Overdue    │ │   This Week │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ORGANISATION OVERVIEW                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ House A     │ │ House B     │ │ House C     │ │ House D     │ │
│ │ Risk: Stable│ │ Risk: ↑     │ │ Risk: ↑ ⚠️  │ │ Risk: ↓     │ │
│ │ Oversight:  │ │ Oversight:  │ │ Oversight:  │ │ Oversight:  │ │
│ │ Active      │ │ Active      │ │ Weak        │ │ Active      │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ MY TASKS                                                      │
│ • Complete Monday Pulse for House A                           │
│ • Review Escalation: Staffing Shortage - House B              │
│ • Finalise Weekly Review (Week 6)                             │
└─────────────────────────────────────────────────────────────┘
```

#### Role-Based Variations

**Registered Manager (RM)**
- House-specific tasks only
- Pulse completion status for assigned houses
- House-level risk overview

**Responsible Individual (RI)**
- Cross-house oversight tasks
- All house risk trajectories
- Weekly review finalization tasks

**Director (DIR)**
- Executive overview
- Monthly report tasks
- Organization-wide patterns

---

### S-201: Governance Pulse (Critical Success Screen)

#### Purpose
5-minute governance check-in for early warning signals.

#### Design Philosophy
Must feel like a "quick leadership check-in," not paperwork completion.

#### Screen Layout
```
┌─────────────────────────────────────────────────────────────┐
│ CARESIGNAL • Governance Pulse                               │
│ House: Maple House    Date: Monday, March 10, 2026          │
│                                                             │
│ Last Pulse: Wednesday | Next Pulse: Friday                  │

├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Emerging Risk Signals                                     │
│ Have any new risks emerged since the last pulse?             │
│                                                             │
│ ○ No new signals                                            │
│ ● Yes – new risk identified                                  │
│   [Short description field]                                  │
│                                                             │
│ 2. Risk Movement                                             │
│ Are any existing risks increasing or deteriorating?          │
│                                                             │
│ ○ No change                                                  │
│ ● Yes – risk increasing                                      │
│   [Select risk from dropdown]                                │
│                                                             │
│ 3. Safeguarding Signals                                      │
│ Any safeguarding concerns or indicators this week?            │
│                                                             │
│ ○ None                                                      │
│ ● Concern identified                                         │
│   [Short description field]                                  │
│                                                             │
│ 4. Operational Pressure                                      │
│ Any operational pressures affecting service stability?       │
│                                                             │
│ ○ Staffing pressure                                          │
│ ○ Behavioural support challenges                             │
│ ○ Medication concerns                                        │
│ ○ Environmental issue                                        │
│ ● None                                                       │
│                                                             │
│ 5. Escalation Required?                                      │
│ Does anything require leadership attention?                   │
│                                                             │
│ ○ No escalation required                                     │
│ ● Escalation required                                       │
│   [Reason field]                                             │
│                                                             │
│ Additional Observations (Optional)                           │
│ [Multi-line text field]                                      │
│                                                             │
│                                    [Submit Governance Pulse] │
└─────────────────────────────────────────────────────────────┘
```

#### Critical Success Requirements
- **Completion Time**: Under 5 minutes
- **Mobile Optimized**: Works on tablets and phones
- **Auto-Save**: Draft saved every 2 minutes
- **Quick Actions**: One-tap escalation creation
- **Context Awareness**: Shows last pulse and next due date

---

### S-300: Risk Register

#### Purpose
Cross-house risk tracking with dual trajectory visibility.

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Risk Register                                    [Add Risk] [Filter] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Risk trajectory overview:                               │ │
│ │ House A: Stable │ House B: Increasing │ House C: ↑ ⚠️ │ │
│ │ House D: Improving │ Overall: 4 Active Risks          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Active Risks (4)                    [Show Closed Risks] │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Risk │ Category   │ House   │ Severity │ Last Review │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Staffing │ Operational │ House B │ High │ 2 days ago │ │
│ │ Shortage │            │         │      │            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Medication │ Clinical │ House C │ Medium │ 1 week ago │ │
│ │ Refusal │           │         │       │            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Behaviour │ Safeguarding │ House A │ Low │ 3 days ago │ │
│ │ Support │            │         │     │            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Export Risk Register] [Risk Analytics] [Archive View]     │
└─────────────────────────────────────────────────────────────┘
```

#### Key Features
- **Dual Trajectory Display**: Risk vs. oversight activity per house
- **Risk Filtering**: By house, category, severity, status
- **Quick Actions**: Edit risk, create escalation, view timeline
- **Cross-House Patterns**: Highlight similar risks across houses
- **Export Capability**: PDF/Excel export for meetings

---

### S-400: Escalations Inbox

#### Purpose
Role-based escalation review and response tracking.

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Escalations Inbox                    [All Escalations] [Log] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ My Assigned Escalations (2)                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Staffing Shortage - House B                        │ │ │
│ │ │ Created: 2 days ago │ Due: Tomorrow │ Overdue: No │ │ │
│ │ │ Risk: High │ Assigned to: Responsible Individual   │ │ │
│ │ │                                    [Review Now]   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Medication Refusal - House C                        │ │ │
│ │ │ Created: 1 week ago │ Due: 3 days ago │ Overdue: Yes│ │ │
│ │ │ Risk: Medium │ Assigned to: Responsible Individual  │ │ │
│ │ │                                    [Review Now]   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Escalation Response Metrics                              │ │
│ │ Average Response Time: 36 hours │ SLA: 72 hours         │ │
│ │ Overdue Escalations: 1 │ Response Rate: 85%            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Critical Features
- **Role-Based Assignment**: Escalations routed to roles, not individuals
- **SLA Tracking**: Clear due dates and overdue indicators
- **Quick Review**: One-click review interface
- **Response History**: Track escalation resolution patterns

---

### S-501: Weekly Review Draft

#### Purpose
Auto-compiled leadership oversight record with governance insights.

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Weekly Governance Review                    [Preview] [Finalise] │
│ Week Ending: Sunday, March 16, 2026                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GOVERNANCE RHYTHM                                       │ │
│ │ Scheduled Pulses: 3 │ Completed Pulses: 3 │ Missed: 0   │ │
│ │ Rhythm Status: Governance rhythm maintained            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ RISK REGISTER MOVEMENT                                  │ │
│ │ New Risks: 2 │ Risks Closed: 1 │ Severity Increase: 1   │ │
│ │ Houses Affected: House B, House D                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ESCALATION DISCIPLINE                                   │ │
│ │ Escalations Triggered: 2 │ Reviewed: 2 │ Avg Time: 36h  │ │
│ │ Status: All escalations reviewed within SLA            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CROSS-HOUSE RISK TRAJECTORY                              │ │
│ │ House A – Stable │ House B – Increasing risk signals     │ │
│ │ House C – Improving │ House D – Stable                  │ │
│ │                                                             │ │
│ │ Governance Drift Detected: House C                      │ │
│ │ Recommendation: Director review required                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ LEADERSHIP OBSERVATIONS                                  │ │
│ │ What governance concerns emerged this week?              │ │
│ │ [Text field - required]                                  │ │
│ │                                                             │ │
│ │ Are there houses requiring leadership attention?          │ │
│ │ [Text field - required]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ LEADERSHIP ACTIONS                                       │ │
│ │ Record governance actions taken or planned               │ │
│ │ • [Action item 1]                                        │ │
│ │ • [Action item 2]                                        │ │
│ │ • [Add Action]                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Finalise Weekly Review] │
└─────────────────────────────────────────────────────────────┘
```

#### Auto-Compilation Features
- **Data Aggregation**: Automatically pulls pulse, risk, and escalation data
- **Trajectory Analysis**: Calculates risk and oversight trajectories
- **Drift Detection**: Identifies governance drift requiring attention
- **Template Guidance**: Provides structured prompts for leadership input

---

### S-800: Incident Reconstruction

#### Purpose
Serious incident governance timeline and oversight evidence.

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Governance Reconstruction                                   │
│ House: House B │ Incident: Safeguarding │ Date: March 10, 2026 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GOVERNANCE SIGNAL OVERVIEW                               │ │
│ │ Risk Signals (Pre-Incident): 3 │ Escalations: 2          │ │
│ │ Leadership Reviews: 2 │ Last Review: 6 days before       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GOVERNANCE TIMELINE                                      │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ March 1  │ Risk Signal Logged                            │ │
│ │          │ Medication refusal increasing                 │ │
│ │          │ Logged by: Registered Manager                 │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ March 3  │ Escalation Triggered                          │ │
│ │          │ Responsible Individual notified             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ March 5  │ Weekly Governance Review                     │ │
│ │          │ Risk discussed in leadership review          │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ March 8  │ Leadership Follow-Up                         │ │
│ │          │ Manager asked to update risk plan            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ March 10 │ Serious Incident Occurred                     │ │
│ │          │ Safeguarding referral initiated               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────┬─────────────────────┐ │
│ │ OVERSIGHT SUMMARY                   │ CROSS-HOUSE SIGNALS │ │
│ ├─────────────────────────────────────┼─────────────────────┤ │
│ │ Early risk recognition              │ House B ↑ Medication │ │
│ │ Escalation within 48h               │ House D ↑ Medication │ │
│ │ Leadership review recorded          │ House A → Stable     │ │
│ │ Oversight present pre-incident      │ Pattern: 2 houses    │ │
│ └─────────────────────────────────────┴─────────────────────┘ │
│                                                             │
│ [Generate Reconstruction Report] [Export Timeline] [Add Commentary] │
└─────────────────────────────────────────────────────────────┘
```

#### Key Features
- **Auto-Generated Timeline**: Pulls all relevant governance events
- **Oversight Summary**: Quick interpretation of governance response
- **Cross-House Context**: Shows similar risks across organization
- **Export Capability**: Generate investigation-ready reports

---

## 5. Critical Success Screens

### Success Criteria

#### S-201: Governance Pulse
- **Completion Rate**: >95% of pulses completed on time
- **Completion Time**: Average <5 minutes per pulse
- **User Satisfaction**: >4.5/5 user satisfaction rating
- **Mobile Usage**: >60% completion on mobile devices

#### S-501: Weekly Review
- **Finalization Rate**: 100% of weekly reviews finalized
- **Time to Finalize**: <48 hours from week end
- **Quality Score**: All required sections completed
- **Leadership Adoption**: >90% leadership participation

#### S-300: Risk Register
- **Risk Coverage**: All identified risks tracked
- **Update Frequency**: Risks updated within review intervals
- **Cross-House Visibility**: Leadership can see all house risks
- **Action Tracking**: >80% of risks have action items

#### S-400: Escalations
- **Response Rate**: >95% of escalations reviewed within SLA
- **Response Time**: Average <48 hours response time
- **Assignment Accuracy**: 100% routed to correct roles
- **Resolution Tracking**: >80% of escalations have resolution

### Screen Interdependencies

```
Critical Flow Dependencies:
Governance Pulse (S-201) → Risk Register (S-300) → Escalations (S-400) → 
Weekly Review (S-501) → Monthly Report (S-600) → Archive (S-700)

Supporting Dependencies:
Login (S-001) → All Screens
Home Dashboard (S-100) → Task Management
Setup (S-010) → System Configuration
```

---

## 6. Phase 2 Intelligence Layer

### S-900: Trend Dashboard

#### Purpose
Executive-level analytics with dual trajectory visualization.

#### Key Visualizations
- **6-Week Risk Trajectory**: Line chart showing risk movement
- **Oversight Activity Trends**: Bar chart of leadership response
- **Cross-House Comparison**: Multi-house risk/oversight matrix
- **Pattern Detection**: Automated identification of concerning patterns

### S-901: Recurrence Map

#### Purpose
Cross-house pattern detection and early warning system.

#### Analysis Features
- **Category Clustering**: Group similar risks across houses
- **Temporal Patterns**: Time-based risk recurrence analysis
- **Geographic Patterns**: Regional risk clustering (if applicable)
- **Predictive Indicators**: Early warning based on patterns

### S-800: Incident Reconstruction (Enhanced)

#### Phase 2 Enhancements
- **Predictive Analysis**: Risk prediction based on historical patterns
- **Benchmarking**: Compare governance effectiveness across providers
- **Regulatory Alignment**: Ensure compliance with regulatory expectations
- **Automated Insights**: AI-powered governance recommendations

---

## Technical Implementation Notes

### Performance Requirements
- **Page Load Time**: <3 seconds for all screens
- **Mobile Responsiveness**: Full functionality on tablets and phones
- **Offline Capability**: Draft saving and basic functionality offline
- **Accessibility**: WCAG 2.1 AA compliance

### Data Architecture
- **Real-Time Updates**: Live data for critical screens
- **Caching Strategy**: Intelligent caching for performance
- **Data Synchronization**: Conflict resolution for concurrent edits
- **Audit Trail**: Complete audit trail for all governance actions

### Security Considerations
- **Role-Based Access**: Strict enforcement of role permissions
- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **Session Management**: Secure session handling with appropriate timeouts
- **Audit Logging**: Comprehensive logging of all system access

This screen architecture provides a comprehensive, role-based, and governance-focused user experience that ensures Ordin Core delivers on its core promise of documenting leadership oversight behavior over time.
