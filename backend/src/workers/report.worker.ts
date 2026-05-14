import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';
import { eventBus, EVENTS } from '../events/eventBus';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { drawReportHeader } from '../utils/pdfHelper';

// Define layout structures for PDF rendering
type ReportSection = {
  title?: string;
  content?: string;
  list?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
};

type ReportData = {
  title: string;
  summary?: string;
  sections: ReportSection[];
};

// Helper function to draw table in basic PDFKit
function drawTable(doc: typeof PDFDocument, table: { headers: string[], rows: string[][] }, startY: number) {
  const startX = 50;
  const colWidth = (500 / table.headers.length);
  let currentY = startY;

  // Draw Headers
  doc.font('Helvetica-Bold').fontSize(10);
  table.headers.forEach((h, i) => {
    doc.text(h, startX + (i * colWidth), currentY, { width: colWidth, align: 'left' });
  });
  currentY += 15;
  doc.moveTo(startX, currentY).lineTo(startX + 500, currentY).stroke();
  currentY += 10;

  // Draw Rows
  doc.font('Helvetica').fontSize(9);
  table.rows.forEach(row => {
    let rowMaxHeight = 15;
    row.forEach((cell, i) => {
      const height = doc.heightOfString(cell, { width: colWidth - 10 });
      if (height > rowMaxHeight) rowMaxHeight = height;
      doc.text(cell, startX + (i * colWidth), currentY, { width: colWidth - 10, align: 'left' });
    });
    currentY += rowMaxHeight + 10;
    
    // Page break logic
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }
  });

  return currentY;
}

function buildFilterClause(parameters: Record<string, any>, prefix: string = ''): { clause: string, values: any[] } {
  let clause = '';
  const values: any[] = [];
  let paramIndex = 2; // Assuming $1 is always company_id

  if (parameters.date_from) {
    clause += ` AND ${prefix}created_at >= $${paramIndex++}`;
    values.push(parameters.date_from);
  }
  if (parameters.date_to) {
    clause += ` AND ${prefix}created_at <= $${paramIndex++}`;
    values.push(parameters.date_to);
  }
  if (parameters.severity && Array.isArray(parameters.severity) && parameters.severity.length > 0) {
    clause += ` AND LOWER(${prefix}severity::text) = ANY($${paramIndex++}::text[])`;
    values.push(parameters.severity.map((s: string) => s.toLowerCase()));
  }
  if (parameters.status && Array.isArray(parameters.status) && parameters.status.length > 0 && !parameters.status.includes('all')) {
    clause += ` AND LOWER(${prefix}status::text) = ANY($${paramIndex++}::text[])`;
    values.push(parameters.status.map((s: string) => s.toLowerCase()));
  }
  if (parameters.houses && Array.isArray(parameters.houses) && parameters.houses.length > 0) {
    clause += ` AND ${prefix}house_id = ANY($${paramIndex++}::uuid[])`;
    values.push(parameters.houses);
  } else if (parameters.house_id) {
    clause += ` AND ${prefix}house_id = $${paramIndex++}`;
    values.push(parameters.house_id);
  }

  return { clause, values };
}

// -------------------------------------------------------------
// Data Fetchers for each Report Type
// -------------------------------------------------------------

async function generateRiskSummary(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters);
  
  // 1. Overview
  const overview = await query(
    `SELECT severity, status, COUNT(*) as count FROM risks WHERE company_id = $1 ${clause} GROUP BY severity, status`,
    [company_id, ...values]
  );
  const overviewList = overview.rows.map(r => `${r.severity.toUpperCase()} (${r.status}): ${r.count}`);

  // 2. Active Risks Table
  const activeRisks = await query(
    `SELECT r.title, r.severity, r.trajectory, h.name as house_name, r.status,
            (SELECT COUNT(*) FROM risk_signal_links WHERE risk_id = r.id) as signal_count
     FROM risks r LEFT JOIN houses h ON r.house_id = h.id 
     WHERE r.company_id = $1 AND r.status != 'closed' AND r.status != 'resolved' ${clause.replace(/created_at/g, 'r.created_at').replace(/house_id/g, 'r.house_id').replace(/severity/g, 'r.severity').replace(/status/g, 'r.status')} LIMIT 50`,
    [company_id, ...values]
  );

  // 3. Recently Closed Risks
  const { clause: houseClause, values: houseValues } = buildFilterClause({ houses: parameters.houses, house_id: parameters.house_id });
  const closedRisks = await query(
    `SELECT r.title, r.severity, r.updated_at 
     FROM risks r 
     WHERE r.company_id = $1 AND r.status IN ('closed', 'resolved') ${houseClause.replace(/house_id/g, 'r.house_id')}
     ORDER BY r.updated_at DESC LIMIT 20`,
    [company_id, ...houseValues]
  );

  return {
    title: "Risk Register Summary",
    summary: "Point-in-time snapshot of active and recently closed risks across the organization or service.",
    sections: [
      { title: "1. Risk Register Overview", list: overviewList.length > 0 ? overviewList : ["No risk records found."] },
      { 
        title: "2. Active Risks by House", 
        table: {
          headers: ["House", "Risk", "Severity", "Trajectory", "Evid. Count", "Status"],
          rows: activeRisks.rows.map(r => [
            r.house_name || 'N/A', 
            r.title, 
            r.severity, 
            r.trajectory || 'Stable', 
            r.signal_count.toString(),
            r.status
          ])
        }
      },
      {
        title: "3. Recently Closed Risks",
        table: {
          headers: ["Risk", "Severity", "Closed Date"],
          rows: closedRisks.rows.map(r => [r.title, r.severity, new Date(r.updated_at).toLocaleDateString()])
        }
      }
    ]
  };
}

async function generateOrganizationalMonthly(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters);
  
  const [risks, incidents, escalations, positions] = await Promise.all([
    query(`SELECT severity, status, COUNT(*) as count FROM risks WHERE company_id = $1 ${clause} GROUP BY severity, status`, [company_id, ...values]),
    query(`SELECT severity, status, COUNT(*) as count FROM incidents WHERE company_id = $1 ${clause} GROUP BY severity, status`, [company_id, ...values]),
    query(`SELECT priority, status, COUNT(*) as count FROM escalations WHERE company_id = $1 ${clause} GROUP BY priority, status`, [company_id, ...values]),
    query(`SELECT overall_position, COUNT(*) as count FROM (
             SELECT DISTINCT ON (house_id) overall_position FROM weekly_reviews 
             WHERE company_id = $1 AND status = 'LOCKED' ${clause} ORDER BY house_id, week_ending DESC
           ) sub GROUP BY overall_position`, [company_id, ...values])
  ]);

  const observations = parameters?.leadership_observations as string || "No observations provided.";
  const plan = parameters?.forward_plan as string || "No forward plan recorded.";

  const positionList = positions.rows.map(p => `${p.overall_position || 'Not Reviewed'}: ${p.count}`);

  return {
    title: "Monthly Board Report (Strategic)",
    summary: "Executive strategic narrative, trends, and risk posture for board meetings.",
    sections: [
      { title: "1. Executive Summary", content: "Monthly overview of cross-site governance health and posture." },
      { title: "2. Service Positions", list: positionList.length > 0 ? positionList : ["⚠️ No weekly reviews finalised for this period."] },
      { title: "3. Risk Posture", list: risks.rows.map(r => `${r.severity?.toUpperCase()} (${r.status}): ${r.count}`) },
      { title: "4. Incident Trends", list: incidents.rows.map(r => `${r.severity?.toUpperCase()} (${r.status}): ${r.count}`) },
      { title: "5. Escalation Discipline", list: escalations.rows.map(r => `${r.priority?.toUpperCase()} (${r.status}): ${r.count}`) },
      { title: "6. Leadership Observations", content: observations },
      { title: "7. Actions & Forward Plan", content: plan }
    ]
  };
}

async function generateEscalationReport(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters, 'e.');

  const escRes = await query(
    `SELECT e.reason as title, e.priority, e.status, h.name as house_name, e.created_at
     FROM escalations e LEFT JOIN houses h ON e.house_id = h.id
     WHERE e.company_id = $1 ${clause}
     ORDER BY e.created_at DESC LIMIT 50`,
    [company_id, ...values]
  );

  return {
    title: "Escalation Activity Report",
    summary: "Breakdown of escalation volume, priorities, and resolution tracking.",
    sections: [
      {
        title: "1. Escalation Log",
        table: {
          headers: ["Date", "House", "Escalation", "Priority", "Status"],
          rows: escRes.rows.map(e => [new Date(e.created_at).toLocaleDateString(), e.house_name || 'N/A', e.title, e.priority, e.status])
        }
      }
    ]
  };
}

async function generateSafeguardingReport(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters, 'i.');

  const incRes = await query(
    `SELECT i.title, i.status, h.name as house_name, i.created_at
     FROM incidents i LEFT JOIN houses h ON i.house_id = h.id
     WHERE i.company_id = $1 AND i.severity IN ('critical', 'serious') ${clause}
     ORDER BY i.created_at DESC`,
    [company_id, ...values]
  );

  return {
    title: "Safeguarding Activity Report",
    summary: "Strictly scoped report tracking safeguarding signals, severe incidents, and final outcomes.",
    sections: [
      {
        title: "1. Safeguarding Incidents & Signals",
        table: {
          headers: ["Date", "House", "Incident Title", "Status"],
          rows: incRes.rows.map(i => [new Date(i.created_at).toLocaleDateString(), i.house_name || 'N/A', i.title, i.status])
        }
      }
    ]
  };
}

async function generateIncidentReport(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters);
  const [inc] = await Promise.all([
    query(`SELECT severity, COUNT(*) as count FROM incidents WHERE company_id = $1 ${clause} GROUP BY severity`, [company_id, ...values])
  ]);
  
  return {
    title: "Incident Trend Analysis",
    summary: "Analysis of serious incident patterns and early warning identification.",
    sections: [
      { title: "1. Incident Frequencies", list: inc.rows.map(i => `${i.severity.toUpperCase()}: ${i.count} incidents`) }
    ]
  };
}

async function generateWeeklySummary(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters);
  
  const pulses = await query(
    `SELECT status, COUNT(*) as count FROM governance_pulses 
     WHERE company_id = $1 ${clause} GROUP BY status`,
    [company_id, ...values]
  );

  return {
    title: "Weekly Governance Summary",
    summary: "Lightweight, one-week structured snapshot of governance rhythm.",
    sections: [
      { title: "1. Governance Rhythm (Pulse Status)", list: pulses.rows.map(p => `${p.status.toUpperCase()}: ${p.count}`) }
    ]
  };
}

async function generateCrossSiteSummary(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const { clause, values } = buildFilterClause(parameters, 'h.');
  
  const result = await query(
    `SELECT 
      h.name AS house_name,
      COUNT(DISTINCT r.id) FILTER (WHERE LOWER(r.status::text) NOT IN ('closed', 'resolved')) AS open_risks,
      COUNT(DISTINCT i.id) FILTER (WHERE LOWER(i.status::text) NOT IN ('closed', 'resolved')) AS open_incidents,
      COALESCE(
        ROUND(
          100.0 * COUNT(gp.id) FILTER (WHERE gp.review_status != 'New') / NULLIF(COUNT(gp.id), 0),
          2
        ), 
        100
      ) AS avg_compliance
     FROM houses h
     LEFT JOIN risks r ON r.house_id = h.id AND r.company_id = $1
     LEFT JOIN incidents i ON i.house_id = h.id AND i.company_id = $1
     LEFT JOIN governance_pulses gp ON gp.house_id = h.id AND gp.company_id = $1
     WHERE h.company_id = $1 AND h.status = 'active' ${clause.replace(/house_id/g, 'id')}
     GROUP BY h.id, h.name
     ORDER BY avg_compliance DESC`,
    [company_id, ...values]
  );

  return {
    title: "Cross-Site Governance Summary",
    summary: "Comparative performance analysis across all active sites within the organization.",
    sections: [
      {
        title: "1. Site-by-Site Comparison",
        table: {
          headers: ["Site Name", "Open Risks", "Open Incidents", "Avg Compliance %"],
          rows: result.rows.map(r => [
            r.house_name, 
            r.open_risks.toString(), 
            r.open_incidents.toString(), 
            `${Math.round(r.avg_compliance)}%`
          ])
        }
      },
      {
        title: "2. Strategic Recommendation",
        content: "Sites with compliance scores below 85% should be prioritized for inner-sanctum audit and leadership support."
      }
    ]
  };
}

async function generateDetailedEvidencePack(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const risk_id = parameters?.risk_id as string;
  if (!risk_id) throw new Error("risk_id is required for Detailed Evidence Pack");

  // 1. Risk Core Data
  const riskRes = await query(
    `SELECT r.*, h.name as house_name, u.first_name || ' ' || u.last_name as created_by_name
     FROM risks r 
     JOIN houses h ON r.house_id = h.id
     JOIN users u ON r.created_by = u.id
     WHERE r.id = $1 AND r.company_id = $2`,
    [risk_id, company_id]
  );
  if (riskRes.rows.length === 0) throw new Error("Risk not found or access denied");
  const risk = riskRes.rows[0];

  // 2. Linked Signals (Lineage)
  const signals = await query(
    `SELECT gp.entry_date, gp.signal_type, gp.description, gp.severity
     FROM risk_signal_links rsl
     JOIN governance_pulses gp ON rsl.pulse_entry_id = gp.id
     WHERE rsl.risk_id = $1
     ORDER BY gp.entry_date DESC`,
    [risk_id]
  );

  // 3. Verified Actions (Mitigation Audit)
  const actions = await query(
    `SELECT ra.title, ra.description, ra.status, ra.completed_at, ra.verification_notes,
            u_rm.first_name || ' ' || u_rm.last_name as verifier_rm_name,
            u_ri.first_name || ' ' || u_ri.last_name as verifier_ri_name
     FROM risk_actions ra
     LEFT JOIN users u_rm ON ra.verified_by_rm = u_rm.id
     LEFT JOIN users u_ri ON ra.verified_by_ri = u_ri.id
     WHERE ra.risk_id = $1
     ORDER BY ra.created_at ASC`,
    [risk_id]
  );

  // 4. Linked Incidents
  const linkedIncidents = await query(
    `SELECT i.title, i.severity, i.status, i.occurred_at
     FROM incident_risks ir
     JOIN incidents i ON ir.incident_id = i.id
     WHERE ir.risk_id = $1
     ORDER BY i.occurred_at DESC`,
    [risk_id]
  );

  return {
    title: `CQC Evidence Pack: ${risk.title}`,
    summary: `Comprehensive audit trail for risk registered in ${risk.house_name}. This document proves proactive identification, trajectory tracking, and independent verification of mitigations.`,
    sections: [
      {
        title: "1. Risk Governance Profile",
        table: {
          headers: ["Attribute", "Value"],
          rows: [
            ["House", risk.house_name],
            ["Registered By", risk.created_by_name],
            ["Current Severity", risk.severity],
            ["Current Trajectory", risk.trajectory || 'Stable'],
            ["Status", risk.status],
            ["Risk Score", (risk.risk_score || 0).toString()]
          ]
        }
      },
      {
        title: "2. Evidence Lineage (Signals)",
        content: signals.rows.length > 0 
          ? "The following observations directly informed the registration of this risk."
          : "⚠️ Risk created without cluster or linked signals – evidence lineage missing.",
        table: {
          headers: ["Date", "Type", "Description", "Severity"],
          rows: signals.rows.map(s => [new Date(s.entry_date).toLocaleDateString(), s.signal_type, s.description, s.severity])
        }
      },
      {
        title: "3. Mitigation & Independent Verification Audit",
        content: "Evidence of control measures and senior management sign-off (Four-Eyes Principle).",
        table: {
          headers: ["Action", "Status", "Completion", "Verified By", "Governance Notes"],
          rows: actions.rows.map(a => [
            a.title,
            a.status,
            a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "Pending",
            [a.verifier_rm_name, a.verifier_ri_name].filter(Boolean).join(" & ") || "Unverified",
            a.verification_notes || "N/A"
          ])
        }
      },
      {
        title: "4. Resultant Incidents",
        content: "Serious incidents occurring despite mitigation efforts.",
        table: {
          headers: ["Date", "Incident", "Severity", "Status"],
          rows: linkedIncidents.rows.map(i => [
            new Date(i.occurred_at).toLocaleDateString(),
            i.title,
            i.severity,
            i.status
          ])
        }
      }
    ]
  };
}

async function generateWeeklyNarrativeReport(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  const house_id = parameters?.house_id as string;
  const week_ending = parameters?.week_ending as string;
  
  if (!house_id || !week_ending) throw new Error("house_id and week_ending are required for Weekly Narrative");

  // 1. Fetch Weekly Review Record
  const reviewRes = await query(
    `SELECT wr.*, h.name as house_name, u.first_name || ' ' || u.last_name as manager_name
     FROM weekly_reviews wr
     JOIN houses h ON wr.house_id = h.id
     JOIN users u ON wr.created_by = u.id
     WHERE wr.house_id = $1 AND wr.week_ending = $2 AND wr.company_id = $3`,
    [house_id, week_ending, company_id]
  );

  if (reviewRes.rows.length === 0) {
    // Try to get house name at least
    const houseRes = await query(`SELECT name FROM houses WHERE id = $1`, [house_id]);
    const houseName = houseRes.rows[0]?.name || house_id;

    return {
      title: `Weekly Governance Narrative: ${houseName}`,
      summary: `⚠️ Governance gap – no weekly review was finalised for this house for the week ending ${new Date(week_ending).toLocaleDateString()}.`,
      sections: [{ 
        title: "Audit Result", 
        content: "Continuous oversight not evidenced. No qualitative leadership narrative recorded for this period." 
      }]
    };
  }
  
  const review = reviewRes.rows[0];
  const content = typeof review.content === 'string' ? JSON.parse(review.content) : review.content;

  return {
    title: `Weekly Governance Narrative: ${review.house_name}`,
    summary: `Strategic leadership interpretation of governance rhythm for the week ending ${new Date(week_ending).toLocaleDateString()}. Status: ${review.status?.toUpperCase()}.`,
    sections: [
      {
        title: "1. Leadership Interpretation",
        content: content.leadership_interpretation || "No qualitative narrative provided."
      },
      {
        title: "2. Governance Position",
        table: {
          headers: ["Metric", "Position"],
          rows: [
            ["Overall Position", content.overall_position || "Stable"],
            ["Review Status", review.status],
            ["Completed By", review.manager_name]
          ]
        }
      },
      {
        title: "3. Escalating Patterns Identified",
        list: content.escalating_signals?.map((s: any) => `${s.label} (${s.trajectory})`) || ["No escalating patterns identified this week."]
      },
      {
        title: "4. Risk Interventions",
        content: content.decisions_required || "No specific strategic decisions recorded."
      }
    ]
  };
}

async function generateComprehensive(company_id: string, parameters: Record<string, any>): Promise<ReportData> {
  // Pull multiple datasets
  const [pulses, risks, escalations, incidents] = await Promise.all([
    query(`SELECT review_status as status, COUNT(*) as c FROM governance_pulses WHERE company_id = $1 GROUP BY review_status`, [company_id]),

    query(`SELECT status, COUNT(*) as c FROM risks WHERE company_id = $1 GROUP BY status`, [company_id]),
    query(`SELECT status, COUNT(*) as c FROM escalations WHERE company_id = $1 GROUP BY status`, [company_id]),
    query(`SELECT severity, COUNT(*) as c FROM incidents WHERE company_id = $1 GROUP BY severity`, [company_id])
  ]);

  return {
    title: "Comprehensive Governance Report",
    summary: "Full evidence pack for inspection and investigation. Draws strictly from locked records.",
    sections: [
      { title: "1. Governance Rhythm", list: pulses.rows.map(x => `${x.status}: ${x.c}`) },
      { title: "2. Risk Register Overview", list: risks.rows.map(x => `${x.status}: ${x.c}`) },
      { title: "3. Escalation Activity", list: escalations.rows.map(x => `${x.status}: ${x.c}`) },
      { title: "4. Incident Trends", list: incidents.rows.map(x => `${x.severity}: ${x.c}`) },
      { content: "This report covers all required metrics for CQC readiness and transparency." }
    ]
  };
}


// -------------------------------------------------------------
// The Worker
// -------------------------------------------------------------

export function startReportWorker() {
  const worker = new Worker('report_generation', async (job: Job) => {
    const { report_id, company_id, type, parameters } = job.data as {
      report_id: string; company_id: string; company_name?: string; type: string; parameters: Record<string, unknown>;
    };

    logger.info(`Processing report job ${job.id}: ${type}`, { report_id });

    try {
      await query("UPDATE reports SET status = 'processing' WHERE id = $1", [report_id]);

      // Call appropriate data fetcher
      let reportData: ReportData;
      switch (type) {
        case 'cross_site_summary': reportData = await generateCrossSiteSummary(company_id, parameters); break;
        case 'risk_summary': reportData = await generateRiskSummary(company_id, parameters); break;
        case 'organizational_monthly': reportData = await generateOrganizationalMonthly(company_id, parameters); break;
        case 'escalation_report': reportData = await generateEscalationReport(company_id, parameters); break;
        case 'custom': // currently custom = safeguarding
        case 'safeguarding_report': reportData = await generateSafeguardingReport(company_id, parameters); break;
        case 'incident_report': reportData = await generateIncidentReport(company_id, parameters); break;
        case 'house_overview': reportData = await generateWeeklySummary(company_id, parameters); break;
        case 'weekly_narrative': reportData = await generateWeeklyNarrativeReport(company_id, parameters); break;
        case 'detailed_evidence_pack': reportData = await generateDetailedEvidencePack(company_id, parameters); break;
        case 'governance_compliance': reportData = await generateComprehensive(company_id, parameters); break;
        default: reportData = await generateComprehensive(company_id, parameters); break;
      }

      // Generate PDF
      const fileName = `${report_id}.pdf`;
      const publicPath = path.join(__dirname, '../../public/reports');
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }
      const filePath = path.join(publicPath, fileName);
      const fileUrl = `/reports/${fileName}`;

      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 71, bottom: 57, left: 57, right: 57 } 
      });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // PDF Title & Header with Logo
      drawReportHeader(doc as any, reportData.title);
      
      doc.fontSize(10).font('Helvetica').fillColor('gray').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.text(`Reference ID: ${report_id}`, { align: 'right' });
      doc.fillColor('black');
      doc.moveDown(1);

      if (reportData.summary) {
        doc.fontSize(12).font('Helvetica-Oblique').fillColor('black').text(reportData.summary);
        doc.moveDown(2);
      }

      // Render Sections
      let currentY = doc.y;
      
      for (const section of reportData.sections) {
        if (currentY > 650) { doc.addPage(); currentY = 50; }
        
        if (section.title) {
          doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(section.title, 50, currentY);
          currentY += 25;
        }

        doc.fontSize(11).font('Helvetica');
        
        if (section.content) {
          doc.text(section.content, 50, currentY, { width: 500 });
          currentY = doc.y + 15;
        }

        if (section.list && section.list.length > 0) {
          section.list.forEach(item => {
            doc.text(`• ${item}`, 60, currentY);
            currentY += 15;
          });
          currentY += 10;
        }

        if (section.table && section.table.rows.length > 0) {
          currentY = drawTable(doc as any, section.table, currentY);
        } else if (section.table) {
          doc.text("No records matched the criteria.", 50, currentY);
          currentY += 20;
        }
      }

      doc.end();

      // Wait for file to finish writing
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      await query(
        `UPDATE reports SET status = 'completed', file_url = $1, completed_at = NOW() WHERE id = $2`,
        [fileUrl, report_id]
      );

      await eventBus.emitEvent(EVENTS.REPORT_COMPLETED, { report_id, company_id, type, file_url: fileUrl });
      logger.info(`Report ${report_id} completed successfully as robust PDF`);
      return { success: true, file_url: fileUrl };

    } catch (err) {
      logger.error(`Report ${report_id} failed`, err);
      await query(
        `UPDATE reports SET status = 'failed', error_message = $1 WHERE id = $2`,
        [err instanceof Error ? err.message : 'Unknown error', report_id]
      );
      throw err;
    }
  }, { connection: redisConnection, concurrency: 3 });

  worker.on('completed', (job: Job) => logger.info(`Report job ${job.id} completed`));
  worker.on('failed', (job: Job | undefined, err: Error) => logger.error(`Report job ${job?.id} failed`, err));

  return worker;
}
