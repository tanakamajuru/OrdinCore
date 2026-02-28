import { Navigation } from "./Navigation";
import { FileDown } from "lucide-react";

export function MonthlyReport() {
  const reportMonth = "February 2026";
  const generatedDate = "March 1, 2026";
  const compiledWeeks = ["Week 1 (Feb 1-7)", "Week 2 (Feb 8-14)", "Week 3 (Feb 15-21)", "Week 4 (Feb 22-28)"];

  const positionOverview = {
    totalRisks: 52,
    highSeverity: 14,
    resolved: 28,
    newThisMonth: 19,
    escalations: 23,
    safeguardingConcerns: 7,
  };

  const highRiskAnalysis = [
    { id: "R-2024-089", category: "Medication", house: "Oakwood", opened: "Feb 15", status: "Active", impact: "Multiple admin errors - patient safety risk" },
    { id: "R-2024-091", category: "Staffing", house: "Riverside", opened: "Feb 17", status: "Active", impact: "Below minimum ratios - care quality concern" },
    { id: "R-2024-093", category: "Facilities", house: "Maple Grove", opened: "Feb 18", status: "Active", impact: "Fire safety equipment failure - regulatory breach" },
    { id: "R-2024-095", category: "Resident Safety", house: "Sunset Villa", opened: "Feb 19", status: "Active", impact: "Fall prevention gaps - injury risk" },
  ];

  const escalationTable = [
    { week: "Week 1", count: 5, avgResponseTime: "1.5 hrs", resolved: 4 },
    { week: "Week 2", count: 7, avgResponseTime: "2 hrs", resolved: 5 },
    { week: "Week 3", count: 6, avgResponseTime: "1.2 hrs", resolved: 6 },
    { week: "Week 4", count: 5, avgResponseTime: "1.8 hrs", resolved: 4 },
  ];

  const recurrencePatterns = [
    { issue: "Medication errors", occurrences: 12, houses: ["Oakwood", "Riverside", "Sunset Villa"], action: "Enhanced training protocol implemented" },
    { issue: "Staffing shortages", occurrences: 15, houses: ["All houses"], action: "Recruitment drive initiated, agency support increased" },
    { issue: "Documentation delays", occurrences: 8, houses: ["Oakwood", "Birchwood"], action: "Digital system upgrade scheduled" },
  ];

  const leadershipReflections = [
    {
      week: "Week 1",
      reflection: "Stable start to February. Staffing challenges persist but agency support maintaining minimum ratios. Medication audit results concerning - systemic training gaps identified.",
    },
    {
      week: "Week 2",
      reflection: "Escalation in medication-related incidents at Oakwood. Immediate intervention required. Emergency training sessions scheduled. Safeguarding concern at Riverside under investigation.",
    },
    {
      week: "Week 3",
      reflection: "Training impact visible - medication errors reducing. Fire safety incident at Maple Grove escalated to facilities. Regulatory notification made. Temporary measures in place.",
    },
    {
      week: "Week 4",
      reflection: "Month-end position improved. Key mitigations effective. Staffing stability increasing. Forward planning for March complete. Ongoing oversight required for persistent issues.",
    },
  ];

  const assuranceStatement = `I confirm that the governance activities documented in this report have been conducted in accordance with CareSignal Health Group policies and regulatory requirements. All high-severity risks have been appropriately escalated and mitigation plans are in place. Leadership oversight has been maintained throughout the reporting period.

Based on the evidence reviewed, I can provide reasonable assurance that:
• Risk management processes are operating effectively
• Escalation protocols have been followed
• Safeguarding concerns have been appropriately managed
• Quality and safety standards are being maintained

Areas requiring continued attention: Staffing stability, medication management protocols, and recurring documentation issues.`;

  const handleExportPDF = () => {
    alert("PDF export functionality would generate a formatted report document.");
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-black">Monthly Governance Report</h1>
            <p className="text-gray-600 mt-1">{reportMonth} • Generated: {generatedDate}</p>
            <p className="text-sm text-gray-500 mt-1">Read-only compiled view from 4 weekly reviews</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Export to PDF
          </button>
        </div>

        <div className="space-y-6">
          {/* Cover Page */}
          <div className="bg-white border-2 border-black p-8 text-center">
            <h2 className="text-4xl font-semibold text-black mb-4">Monthly Governance Report</h2>
            <p className="text-2xl text-black mb-2">{reportMonth}</p>
            <p className="text-gray-600 mb-8">CareSignal Health Group</p>
            <div className="border-t-2 border-black pt-6 mt-6">
              <p className="text-sm text-gray-600 mb-2">Compiled from weekly reviews:</p>
              <div className="space-y-1">
                {compiledWeeks.map((week) => (
                  <p key={week} className="text-black">{week}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Position Overview */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Position Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Total Risks</p>
                <p className="text-4xl font-semibold text-black">{positionOverview.totalRisks}</p>
              </div>
              <div className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">High Severity</p>
                <p className="text-4xl font-semibold text-black">{positionOverview.highSeverity}</p>
              </div>
              <div className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Resolved</p>
                <p className="text-4xl font-semibold text-black">{positionOverview.resolved}</p>
              </div>
              <div className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">New This Month</p>
                <p className="text-4xl font-semibold text-black">{positionOverview.newThisMonth}</p>
              </div>
              <div className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Escalations</p>
                <p className="text-4xl font-semibold text-black">{positionOverview.escalations}</p>
              </div>
              <div className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Safeguarding</p>
                <p className="text-4xl font-semibold text-black">{positionOverview.safeguardingConcerns}</p>
              </div>
            </div>
          </div>

          {/* High Risk Analysis */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">High Risk Analysis</h2>
            <div className="space-y-3">
              {highRiskAnalysis.map((risk) => (
                <div key={risk.id} className="p-4 border border-gray-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-black">{risk.id}</span>
                      <span className="text-gray-600 ml-2">• {risk.category} • {risk.house}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-black text-white text-xs">HIGH</span>
                      <span className="px-2 py-1 border border-black text-xs">{risk.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Opened: {risk.opened}</p>
                  <p className="text-black mt-2">{risk.impact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation Table */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Escalation Summary</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-3 px-4 text-black">Week</th>
                  <th className="text-left py-3 px-4 text-black">Count</th>
                  <th className="text-left py-3 px-4 text-black">Avg Response Time</th>
                  <th className="text-left py-3 px-4 text-black">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {escalationTable.map((row, idx) => (
                  <tr
                    key={row.week}
                    className={idx % 2 === 0 ? "bg-gray-100" : "bg-white"}
                  >
                    <td className="py-3 px-4 text-black">{row.week}</td>
                    <td className="py-3 px-4 text-black">{row.count}</td>
                    <td className="py-3 px-4 text-black">{row.avgResponseTime}</td>
                    <td className="py-3 px-4 text-black">{row.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recurrence Patterns */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Recurrence Patterns</h2>
            <div className="space-y-3">
              {recurrencePatterns.map((pattern, idx) => (
                <div key={idx} className="p-4 border border-gray-300">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-black">{pattern.issue}</p>
                    <span className="px-2 py-1 bg-black text-white text-xs">{pattern.occurrences} occurrences</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Affected: {pattern.houses.join(", ")}</p>
                  <p className="text-black">{pattern.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leadership Reflections */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Leadership Reflections (Verbatim)</h2>
            <div className="space-y-4">
              {leadershipReflections.map((item) => (
                <div key={item.week} className="p-4 border border-gray-300">
                  <p className="font-semibold text-black mb-2">{item.week}</p>
                  <p className="text-black italic">"{item.reflection}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assurance Statement */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Assurance Statement</h2>
            <div className="p-4 border border-gray-300 mb-6">
              <p className="text-black whitespace-pre-line">{assuranceStatement}</p>
            </div>
            
            <div className="border-t-2 border-black pt-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-black font-semibold mb-1">Dr. Sarah Mitchell</p>
                  <p className="text-gray-600">Governance Chair</p>
                  <p className="text-gray-600">CareSignal Health Group</p>
                </div>
                <div className="text-right">
                  <div className="border-2 border-black px-6 py-3 mb-2">
                    <p className="text-black font-semibold">Digital Signature</p>
                    <p className="text-sm text-gray-600">S. Mitchell</p>
                  </div>
                  <p className="text-sm text-gray-600">{generatedDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="bg-gray-100 border border-gray-300 p-4">
            <p className="text-sm text-gray-600">
              This is a read-only compiled document generated from 4 weekly governance reviews. 
              All data is immutable and timestamped. For detailed weekly submissions, refer to individual weekly review records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
