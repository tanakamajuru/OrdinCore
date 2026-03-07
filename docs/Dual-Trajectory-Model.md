# Dual Trajectory Model Specification
# CareSignal Governance SaaS Platform

## Document Information

| **Document Version** | 1.0 |
|---------------------|------|
| **Date** | March 5, 2026 |
| **Author** | Tanaka Majuru |
| **Approved By** | Product Lead |
| **Status** | Final |

## Table of Contents

1. [Model Overview](#1-model-overview)
2. [Risk Trajectory Calculation](#2-risk-trajectory-calculation)
3. [Oversight Activity Calculation](#3-oversight-activity-calculation)
4. [Cross-House Visibility](#4-cross-house-visibility)
5. [Governance Drift Detection](#5-governance-drift-detection)
6. [Implementation Logic](#6-implementation-logic)
7. [Dashboard Integration](#7-dashboard-integration)
8. [Alert System](#8-alert-system)

---

## 1. Model Overview

### Core Principle

CareSignal's differentiator is showing **two trajectories side by side**:

1. **Risk Trajectory**: How risk is moving across the organization
2. **Oversight Trajectory**: How leadership is responding

This answers the critical governance question: **"Is risk increasing and is governance responding appropriately?"**

### Dual Trajectory Display

Every house displays two simple indicators:

| House | Risk Signals | Oversight Activity | Interpretation |
|-------|--------------|-------------------|----------------|
| House A | Stable | Active | Stable risk with strong oversight |
| House B | Increasing | Active | Risk rising but actively managed |
| House C | Increasing | Weak | ⚠️ Risk rising with weak oversight |
| House D | Improving | Active | Risk improving with active oversight |

### Leadership Insights

This model instantly tells leadership:
- **Risk Recognition**: Are we seeing emerging risks?
- **Response Appropriateness**: Is governance responding?
- **Attention Required**: Where should leadership focus?

---

## 2. Risk Trajectory Calculation

### Signal Sources

Risk signals are calculated from three governance inputs:

```
Weekly Risk Signals = Pulse Risk Flags + Risk Severity Increases + Escalations
```

#### 1. Pulse Risk Flags
- **Emerging Risk Signals**: New risks identified in pulses
- **Risk Movement**: Existing risks getting worse
- **Safeguarding Signals**: Safeguarding concerns identified
- **Operational Pressure**: Staffing, behavioral, medication concerns

#### 2. Risk Severity Increases
- **Severity Changes**: Risk level increased (Low→Medium→High→Critical)
- **Risk Ageing**: Risks open longer than review intervals
- **Recurrence Patterns**: Similar risks recurring across houses

#### 3. Escalations
- **New Escalations**: Issues requiring leadership attention
- **Overdue Escalations**: Escalations not reviewed within SLA
- **Escalation Clusters**: Multiple escalations in same category

### Trajectory Calculation

```
Risk Trajectory = Current Week Signals - Previous Week Signals

Result Interpretation:
- Increasing: Signals increased by ≥1
- Stable: Signals changed by 0
- Improving: Signals decreased by ≥1
```

### Example Calculation

| Week | Pulse Flags | Severity Increases | Escalations | Total Signals | Trajectory |
|------|-------------|-------------------|--------------|---------------|------------|
| Week 1 | 2 | 1 | 0 | 3 | - |
| Week 2 | 3 | 1 | 1 | 5 | Increasing |
| Week 3 | 2 | 0 | 1 | 3 | Improving |
| Week 4 | 2 | 1 | 0 | 3 | Stable |

---

## 3. Oversight Activity Calculation

### Oversight Actions

Oversight activity counts governance actions that demonstrate leadership engagement:

```
Oversight Score = Leadership Reviews + Escalation Reviews + Risk Updates + Follow-up Actions
```

#### 1. Leadership Reviews
- **Weekly Review Completion**: Leadership review submitted
- **Monthly Narrative Completion**: Executive oversight documented
- **Governance Rhythm**: Pulse completion rate adherence

#### 2. Escalation Reviews
- **Escalation Acknowledgement**: Timely escalation response
- **Escalation Decisions**: Leadership decisions recorded
- **Follow-up Requirements**: Actions assigned and tracked

#### 3. Risk Updates
- **Risk Register Reviews**: Regular risk assessment updates
- **Severity Adjustments**: Risk level changes documented
- **Risk Closure**: Risks properly closed with justification

#### 4. Follow-up Actions
- **Action Items**: Governance actions created and assigned
- **Action Completion**: Follow-up actions marked complete
- **Action Tracking**: Due date monitoring and overdue actions

### Oversight Activity Levels

```
Oversight Activity Level:
- Active: ≥3 oversight actions per week
- Weak: <3 oversight actions per week
- Minimal: 0-1 oversight actions per week
```

### Example Calculation

| Week | Leadership Reviews | Escalation Reviews | Risk Updates | Follow-up Actions | Total | Activity |
|------|-------------------|-------------------|--------------|-------------------|-------|----------|
| Week 1 | 1 | 1 | 1 | 0 | 3 | Active |
| Week 2 | 1 | 0 | 1 | 0 | 2 | Weak |
| Week 3 | 1 | 2 | 1 | 1 | 5 | Active |
| Week 4 | 0 | 1 | 0 | 0 | 1 | Minimal |

---

## 4. Cross-House Visibility

### Organisation Oversight Map

The system displays a simple cross-house overview:

```
Organisation Oversight Map

House A → Stable / Active oversight
House B → Increasing risk / Active oversight
House C → Increasing risk / Weak oversight ⚠️
House D → Improving / Active oversight
```

### Pattern Detection

The system identifies cross-house patterns:

#### Risk Clusters
- **Category Clusters**: Same risk category across multiple houses
- **Temporal Clusters**: Similar risks appearing in same time period
- **Geographic Clusters**: Regional patterns in multi-site operations

#### Oversight Patterns
- **Strong Oversight**: Houses with active oversight regardless of risk level
- **Weak Oversight**: Houses with insufficient oversight response
- **Improvement Trends**: Houses showing better oversight over time

### Leadership Attention Matrix

| Risk Level / Oversight | Strong Oversight | Weak Oversight |
|----------------------|------------------|----------------|
| **Increasing Risk** | Monitor Closely | ⚠️ Immediate Attention Required |
| **Stable Risk** | Maintain | Review Oversight Process |
| **Improving Risk** | Continue | Recognize and Learn |

---

## 5. Governance Drift Detection

### Drift Definition

**Governance Drift** occurs when:
- Risk signals are increasing
- Oversight activity is not increasing proportionally
- Time between risk emergence and leadership response is growing

### Drift Detection Algorithm

```
Drift Detected IF:
(Risk Trajectory = Increasing AND Oversight Activity = Weak)
OR
(Risk Signals Increase > 50% AND Oversight Signals Increase < 25%)
OR
(Escalation Response Time > SLA + 24h)
```

### Alert Examples

#### Level 1 Alert (Weekly Review)
```
"Risk signals increased in House C over the past two weeks with limited governance response.

Risk Signals: Week 1 (2) → Week 3 (5) [+3]
Oversight Signals: Week 1 (3) → Week 3 (2) [-1]

Recommendation: Leadership review required for House C."
```

#### Level 2 Alert (Immediate)
```
"Critical governance drift detected in House B.

Escalation overdue by 5 days
Risk severity increased twice in 2 weeks
No leadership review recorded in 3 weeks

Immediate director attention required."
```

### Drift Metrics

#### Response Interval Tracking
- **Signal to Escalation**: Time from risk signal to escalation
- **Escalation to Review**: Time from escalation to leadership review
- **Review to Action**: Time from review to follow-up action

#### Oversight Ratio
```
Oversight Ratio = Oversight Signals / Risk Signals

Healthy Range: 0.8 - 1.2
Concerning: < 0.5 (weak oversight)
Excellent: > 1.5 (strong oversight)
```

---

## 6. Implementation Logic

### Data Collection Points

#### Real-Time Data
- **Pulse Submissions**: Immediate signal capture
- **Escalation Creation**: Real-time leadership notification
- **Risk Updates**: Immediate trajectory recalculation

#### Batch Processing
- **Weekly Calculations**: End-of-week trajectory analysis
- **Monthly Rollups**: Monthly oversight summaries
- **Pattern Analysis**: Cross-house pattern detection

### Calculation Frequency

| Calculation | Frequency | Trigger |
|-------------|-----------|---------|
| Risk Signals | Real-time | Pulse submission, risk update, escalation |
| Oversight Signals | Real-time | Review submission, escalation review |
| Trajectory Analysis | Weekly | End of week (Sunday 23:59) |
| Drift Detection | Daily | Daily batch process |
| Pattern Analysis | Weekly | Weekly analysis run |

### Data Storage Requirements

#### Time Series Data
```sql
-- Weekly trajectory snapshots
CREATE TABLE weekly_trajectories (
    id SERIAL PRIMARY KEY,
    house_id UUID,
    week_date DATE,
    risk_signals INTEGER,
    oversight_signals INTEGER,
    risk_trajectory VARCHAR(20),
    oversight_activity VARCHAR(20),
    created_at TIMESTAMP
);
```

#### Alert History
```sql
-- Governance drift alerts
CREATE TABLE governance_alerts (
    id SERIAL PRIMARY KEY,
    house_id UUID,
    alert_type VARCHAR(50),
    alert_level VARCHAR(20),
    message TEXT,
    risk_signals INTEGER,
    oversight_signals INTEGER,
    created_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID
);
```

---

## 7. Dashboard Integration

### Home Dashboard Components

#### Organization Overview
```
┌─────────────────────────────────────────────────────────────┐
│ GOVERNANCE OVERVIEW                                         │
├─────────────────────────────────────────────────────────────┤
│ Houses with Increasing Risk: 2                             │
│ Houses with Weak Oversight: 1                              │
│ Governance Drift Alerts: 1                                 │
│ Overall Oversight Ratio: 1.1 (Healthy)                     │
└─────────────────────────────────────────────────────────────┘
```

#### House-Level Cards
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ House A         │ │ House B         │ │ House C         │
│ Risk: Stable    │ │ Risk: ↑         │ │ Risk: ↑ ⚠️      │
│ Oversight: Active│ │ Oversight: Active│ │ Oversight: Weak │
│ Last Review: 2d │ │ Last Review: 1d │ │ Last Review: 5d │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Weekly Review Integration

#### Auto-Compiled Section
```
┌─────────────────────────────────────────────────────────────┐
│ CROSS-HOUSE RISK TRAJECTORY                                 │
├─────────────────────────────────────────────────────────────┤
│ House A – Stable (Risk: 2→2, Oversight: 3→3)              │
│ House B – Increasing (Risk: 2→4, Oversight: 2→3)           │
│ House C – Increasing (Risk: 1→3, Oversight: 3→1) ⚠️        │
│ House D – Improving (Risk: 3→1, Oversight: 2→3)            │
│                                                             │
│ Governance Drift Detected: House C                         │
│ Recommendation: Director review required                    │
└─────────────────────────────────────────────────────────────┘
```

### Monthly Report Integration

#### Executive Summary
```
┌─────────────────────────────────────────────────────────────┐
│ MONTHLY GOVERNANCE TRAJECTORY                               │
├─────────────────────────────────────────────────────────────┤
│ Risk Movement:                                              │
│ • Increasing risk signals in 2 houses                       │
• Stable risk in 1 house                                      │
• Improving risk in 1 house                                 │
│                                                             │
│ Oversight Response:                                          │
│ • Strong oversight in 3 houses                              │
│ • Weak oversight in 1 house (House C)                       │
│ • Average oversight ratio: 1.1                              │
│                                                             │
│ Key Governance Insights:                                     │
│ • House C requires leadership attention                      │
│ • Escalation response times improving                        │
│ • Cross-house staffing pressure patterns detected            │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Alert System

### Alert Types

#### Level 1: Weekly Review Alerts
- **Risk Increase**: Risk signals increasing with weak oversight
- **Oversight Decline**: Oversight activity decreasing
- **Pattern Detection**: Cross-house risk patterns identified

#### Level 2: Immediate Alerts
- **Critical Drift**: Severe governance drift detected
- **Escalation Overdue**: Escalations beyond SLA + 24h
- **Risk Spike**: Sudden increase in risk signals (>100%)

#### Level 3: Executive Alerts
- **Systemic Issues**: Organization-wide governance concerns
- **Regulatory Risk**: Potential regulatory compliance issues
- **Crisis Indicators**: Multiple houses in critical state

### Alert Delivery

#### In-Application Notifications
- **Dashboard Banners**: High-priority alerts on home dashboard
- **House Cards**: Alert indicators on house overview cards
- **Task Queue**: Alert items in user task queues

#### Email Notifications
- **Weekly Summaries**: Weekly trajectory and alert summaries
- **Immediate Alerts**: Critical drift and escalation alerts
- **Monthly Reports**: Monthly governance trajectory summaries

### Alert Response Workflow

#### Alert Acknowledgment
1. **Alert Generated**: System detects governance issue
2. **Notification Sent**: In-app and email notifications
3. **Acknowledgment Required**: User must acknowledge alert
4. **Action Assigned**: Follow-up action automatically created
5. **Response Tracked**: Alert response time monitored

#### Escalation Matrix
| Alert Type | Primary Recipient | Escalation Timeline |
|-------------|-------------------|---------------------|
| Risk Increase | House Manager | 24h to RI |
| Oversight Weak | Responsible Individual | 48h to Director |
| Critical Drift | Director | Immediate |
| Systemic Issues | Director + Board | Immediate |

---

## Success Metrics

### Model Effectiveness Metrics

#### Early Warning
- **Signal Detection Time**: Average time from risk emergence to detection
- **False Positive Rate**: Percentage of alerts that don't require action
- **Prediction Accuracy**: Percentage of risk trajectories correctly predicted

#### Governance Response
- **Response Time**: Average time from alert to leadership response
- **Oversight Improvement**: Improvement in oversight ratios over time
- **Drift Reduction**: Reduction in governance drift incidents

#### Leadership Satisfaction
- **User Adoption**: Percentage of users completing required actions
- **Action Completion**: Percentage of follow-up actions completed
- **Leadership Confidence**: Leadership confidence in oversight visibility

### Technical Performance Metrics

#### Calculation Performance
- **Trajectory Calculation Time**: < 1 second for real-time updates
- **Batch Processing Time**: < 5 minutes for weekly calculations
- **Alert Generation Time**: < 30 seconds from trigger to notification

#### Data Quality
- **Signal Accuracy**: Percentage of accurate risk signal captures
- **Data Completeness**: Percentage of required governance data captured
- **Timeline Integrity**: Accuracy of governance timeline reconstruction

---

## Future Enhancements

### Phase 2 Intelligence Layer

#### Predictive Analytics
- **Risk Prediction**: Machine learning models to predict risk trajectories
- **Oversight Optimization**: Recommendations for oversight resource allocation
- **Pattern Recognition**: Advanced pattern detection across organizations

#### Benchmarking
- **Industry Benchmarks**: Compare governance effectiveness across providers
- **Best Practice Identification**: Identify and share effective governance practices
- **Regulatory Alignment**: Ensure alignment with regulatory expectations

### Integration Capabilities

#### External Data Sources
- **Regulatory Feeds**: Integration with regulatory inspection reports
- **Staffing Systems**: Integration with staffing and scheduling systems
- **Incident Systems**: Integration with external incident reporting systems

#### Reporting Integration
- **Board Reporting**: Automated board-level governance reports
- **Regulatory Reporting**: Automated regulatory submission preparation
- **Stakeholder Reporting**: Custom reports for different stakeholder groups

This Dual Trajectory Model provides CareSignal with a unique competitive advantage by focusing on governance effectiveness rather than just compliance data, giving leadership actionable insights into risk management and oversight response.
