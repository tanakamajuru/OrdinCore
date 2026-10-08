# Annual compliance review — OrdinCore

> DSPT Standard 5 (processes reviewed at least annually to identify and improve non-compliance).
> Owner: **[NEEDS INPUT]** (senior officer who owns and directs security — DSPT v8). Review: this
> process runs annually, with a lighter quarterly check.

## Purpose

A single, owned cadence that makes sure the data-security controls and documents are still true,
gaps are tracked, and improvements happen — rather than documents drifting out of date.

## Who

- **Accountable owner (SIRO-equivalent):** **[NEEDS INPUT]** — actively owns and directs security
  (not a nominal assignment).
- **DPO / IG lead:** **[NEEDS INPUT]**.
- **Technical lead:** **[NEEDS INPUT]**.

## Annual review — what is checked

| Area | Evidence to re-confirm |
|---|---|
| DSPT self-assessment | [../dspt-answers.md](../dspt-answers.md) re-reviewed against the live portal wording |
| Staff policies & sign-off | everyone with access has a current signed [responsibilities](./staff-data-security-responsibilities.md) |
| Data-security training | all staff completed annual training (Standard 3) — **[NEEDS INPUT: training evidence]** |
| Access review | quarterly access reviews done; admin accounts still justified |
| Asset/EOL register | [../asset-register.md](../asset-register.md) re-captured; EOL items actioned |
| Dependency/vuln status | [../../operations/dependency-audit-status.md](../../operations/dependency-audit-status.md) current; patch SLA met |
| Backups & DR | restore test done; **off-server copy** in place; BCP rehearsed once this period |
| Incident/breach | log reviewed; at least one rehearsal/exercise done |
| Subprocessors | each confirmed current certification (Standard 10) |
| Certifications | Cyber Essentials / pen test status reviewed |

## Quarterly light check

- Access review, asset/EOL re-check, dependency audit status, backup restore confirmation.

## Output

- A short **review record** (date, who, findings, actions with owners and due dates) kept by the owner.
- Actions are tracked to closure and revisited at the next quarterly check.

## Trigger-based reviews

In addition to the cadence, review the affected controls after: a security incident, a major
architecture change, a new subprocessor, or a change in the DSPT requirements.
