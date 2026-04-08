"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReportWorker = startReportWorker;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const eventBus_1 = require("../events/eventBus");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfkit_1 = __importDefault(require("pdfkit"));
// Helper function to draw table in basic PDFKit
function drawTable(doc, table, startY) {
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
            if (height > rowMaxHeight)
                rowMaxHeight = height;
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
// -------------------------------------------------------------
// Data Fetchers for each Report Type
// -------------------------------------------------------------
async function generateRiskSummary(company_id, parameters) {
    const house_id = parameters?.house_id;
    // 1. Overview
    const overview = await (0, database_1.query)(`SELECT severity, status, COUNT(*) as count FROM risks WHERE company_id = $1 ${house_id ? 'AND house_id = $2' : ''} GROUP BY severity, status`, house_id ? [company_id, house_id] : [company_id]);
    const overviewList = overview.rows.map(r => `${r.severity.toUpperCase()} (${r.status}): ${r.count}`);
    // 2. Active Risks Table
    const activeRisks = await (0, database_1.query)(`SELECT r.title, r.severity, h.name as house_name, r.status 
     FROM risks r LEFT JOIN houses h ON r.house_id = h.id 
     WHERE r.company_id = $1 AND r.status != 'closed' AND r.status != 'resolved' ${house_id ? 'AND r.house_id = $2' : ''} LIMIT 50`, house_id ? [company_id, house_id] : [company_id]);
    // 3. Recently Closed Risks
    const closedRisks = await (0, database_1.query)(`SELECT r.title, r.severity, r.updated_at 
     FROM risks r 
     WHERE r.company_id = $1 AND r.status IN ('closed', 'resolved') ${house_id ? 'AND r.house_id = $2' : ''}
     ORDER BY r.updated_at DESC LIMIT 20`, house_id ? [company_id, house_id] : [company_id]);
    return {
        title: "Risk Register Summary",
        summary: "Point-in-time snapshot of active and recently closed risks across the organization or service.",
        sections: [
            { title: "1. Risk Register Overview", list: overviewList.length > 0 ? overviewList : ["No risk records found."] },
            {
                title: "2. Active Risks by House",
                table: {
                    headers: ["House", "Risk", "Severity", "Status"],
                    rows: activeRisks.rows.map(r => [r.house_name || 'N/A', r.title, r.severity, r.status])
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
async function generateOrganizationalMonthly(company_id, parameters) {
    const [risks, incidents, escalations] = await Promise.all([
        (0, database_1.query)(`SELECT severity, status, COUNT(*) as count FROM risks WHERE company_id = $1 GROUP BY severity, status`, [company_id]),
        (0, database_1.query)(`SELECT severity, status, COUNT(*) as count FROM incidents WHERE company_id = $1 GROUP BY severity, status`, [company_id]),
        (0, database_1.query)(`SELECT priority, status, COUNT(*) as count FROM escalations WHERE company_id = $1 GROUP BY priority, status`, [company_id])
    ]);
    const observations = parameters?.leadership_observations || "No observations provided.";
    const plan = parameters?.forward_plan || "No forward plan recorded.";
    return {
        title: "Monthly Board Report (Strategic)",
        summary: "Executive strategic narrative, trends, and risk posture for board meetings.",
        sections: [
            { title: "1. Executive Summary", content: "Monthly overview of cross-site governance health and posture." },
            { title: "2. Risk Posture", list: risks.rows.map(r => `${r.severity?.toUpperCase()} (${r.status}): ${r.count}`) },
            { title: "3. Incident Trends", list: incidents.rows.map(r => `${r.severity?.toUpperCase()} (${r.status}): ${r.count}`) },
            { title: "4. Escalation Discipline", list: escalations.rows.map(r => `${r.priority?.toUpperCase()} (${r.status}): ${r.count}`) },
            { title: "5. Leadership Observations", content: observations },
            { title: "6. Actions & Forward Plan", content: plan }
        ]
    };
}
async function generateEscalationReport(company_id, parameters) {
    const house_id = parameters?.house_id;
    const escRes = await (0, database_1.query)(`SELECT e.title, e.priority, e.status, h.name as house_name, e.created_at
     FROM escalations e LEFT JOIN houses h ON e.house_id = h.id
     WHERE e.company_id = $1 ${house_id ? 'AND e.house_id = $2' : ''}
     ORDER BY e.created_at DESC LIMIT 50`, house_id ? [company_id, house_id] : [company_id]);
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
async function generateSafeguardingReport(company_id, parameters) {
    const incRes = await (0, database_1.query)(`SELECT i.title, i.status, h.name as house_name, i.created_at
     FROM incidents i LEFT JOIN houses h ON i.house_id = h.id
     WHERE i.company_id = $1 AND i.severity IN ('critical', 'serious')
     ORDER BY i.created_at DESC`, [company_id]);
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
async function generateIncidentReport(company_id, parameters) {
    const [inc] = await Promise.all([
        (0, database_1.query)(`SELECT severity, COUNT(*) as count FROM incidents WHERE company_id = $1 GROUP BY severity`, [company_id])
    ]);
    return {
        title: "Incident Trend Analysis",
        summary: "Analysis of serious incident patterns and early warning identification.",
        sections: [
            { title: "1. Incident Frequencies", list: inc.rows.map(i => `${i.severity.toUpperCase()}: ${i.count} incidents`) }
        ]
    };
}
async function generateWeeklySummary(company_id, parameters) {
    const house_id = parameters?.house_id;
    const pulses = await (0, database_1.query)(`SELECT status, COUNT(*) as count FROM governance_pulses 
     WHERE company_id = $1 ${house_id ? 'AND house_id = $2' : ''} GROUP BY status`, house_id ? [company_id, house_id] : [company_id]);
    return {
        title: "Weekly Governance Summary",
        summary: "Lightweight, one-week structured snapshot of governance rhythm.",
        sections: [
            { title: "1. Governance Rhythm (Pulse Status)", list: pulses.rows.map(p => `${p.status.toUpperCase()}: ${p.count}`) }
        ]
    };
}
async function generateComprehensive(company_id, parameters) {
    // Pull multiple datasets
    const [pulses, risks, escalations, incidents] = await Promise.all([
        (0, database_1.query)(`SELECT status, COUNT(*) as c FROM governance_pulses WHERE company_id = $1 GROUP BY status`, [company_id]),
        (0, database_1.query)(`SELECT status, COUNT(*) as c FROM risks WHERE company_id = $1 GROUP BY status`, [company_id]),
        (0, database_1.query)(`SELECT status, COUNT(*) as c FROM escalations WHERE company_id = $1 GROUP BY status`, [company_id]),
        (0, database_1.query)(`SELECT severity, COUNT(*) as c FROM incidents WHERE company_id = $1 GROUP BY severity`, [company_id])
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
function startReportWorker() {
    const worker = new bullmq_1.Worker('report_generation', async (job) => {
        const { report_id, company_id, type, parameters } = job.data;
        logger_1.default.info(`Processing report job ${job.id}: ${type}`, { report_id });
        try {
            await (0, database_1.query)("UPDATE reports SET status = 'processing' WHERE id = $1", [report_id]);
            // Call appropriate data fetcher
            let reportData;
            switch (type) {
                case 'risk_summary':
                    reportData = await generateRiskSummary(company_id, parameters);
                    break;
                case 'organizational_monthly':
                    reportData = await generateOrganizationalMonthly(company_id, parameters);
                    break;
                case 'escalation_report':
                    reportData = await generateEscalationReport(company_id, parameters);
                    break;
                case 'custom': // currently custom = safeguarding
                case 'safeguarding_report':
                    reportData = await generateSafeguardingReport(company_id, parameters);
                    break;
                case 'incident_report':
                    reportData = await generateIncidentReport(company_id, parameters);
                    break;
                case 'house_overview':
                    reportData = await generateWeeklySummary(company_id, parameters);
                    break;
                case 'governance_compliance':
                    reportData = await generateComprehensive(company_id, parameters);
                    break;
                default:
                    reportData = await generateComprehensive(company_id, parameters);
                    break;
            }
            // Generate PDF
            const fileName = `${report_id}.pdf`;
            const publicPath = path_1.default.join(__dirname, '../../public/reports');
            if (!fs_1.default.existsSync(publicPath)) {
                fs_1.default.mkdirSync(publicPath, { recursive: true });
            }
            const filePath = path_1.default.join(publicPath, fileName);
            const fileUrl = `/reports/${fileName}`;
            const doc = new pdfkit_1.default({ margin: 50 });
            const writeStream = fs_1.default.createWriteStream(filePath);
            doc.pipe(writeStream);
            // PDF Title & Header
            doc.fontSize(22).font('Helvetica-Bold').text(reportData.title, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').fillColor('gray').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.text(`Reference ID: ${report_id}`, { align: 'center' });
            doc.fillColor('black');
            doc.moveDown(2);
            if (reportData.summary) {
                doc.fontSize(12).font('Helvetica-Oblique').fillColor('black').text(reportData.summary);
                doc.moveDown(2);
            }
            // Render Sections
            let currentY = doc.y;
            for (const section of reportData.sections) {
                if (currentY > 650) {
                    doc.addPage();
                    currentY = 50;
                }
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
                    currentY = drawTable(doc, section.table, currentY);
                }
                else if (section.table) {
                    doc.text("No records matched the criteria.", 50, currentY);
                    currentY += 20;
                }
            }
            doc.end();
            // Wait for file to finish writing
            await new Promise((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', (err) => reject(err));
            });
            await (0, database_1.query)(`UPDATE reports SET status = 'completed', file_url = $1, completed_at = NOW() WHERE id = $2`, [fileUrl, report_id]);
            await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.REPORT_COMPLETED, { report_id, company_id, type, file_url: fileUrl });
            logger_1.default.info(`Report ${report_id} completed successfully as robust PDF`);
            return { success: true, file_url: fileUrl };
        }
        catch (err) {
            logger_1.default.error(`Report ${report_id} failed`, err);
            await (0, database_1.query)(`UPDATE reports SET status = 'failed', error_message = $1 WHERE id = $2`, [err instanceof Error ? err.message : 'Unknown error', report_id]);
            throw err;
        }
    }, { connection: redis_1.redisConnection, concurrency: 3 });
    worker.on('completed', (job) => logger_1.default.info(`Report job ${job.id} completed`));
    worker.on('failed', (job, err) => logger_1.default.error(`Report job ${job?.id} failed`, err));
    return worker;
}
//# sourceMappingURL=report.worker.js.map