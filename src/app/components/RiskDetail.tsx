import { Navigation } from "./Navigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

export function RiskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock detailed risk data
  const riskDetails = {
    id: id || "R-2024-089",
    house: "Oakwood",
    severity: "High",
    status: "Open",
    dateReported: "2026-02-15",
    reportedBy: "Jane Smith, House Manager",
    category: "Medication Management",
    description: "Multiple instances of medication administration errors identified during routine audits. Errors include missed doses, incorrect dosages, and documentation discrepancies. Three residents affected over a 5-day period.",
    impact: "Potential adverse health outcomes for residents. Regulatory compliance risk. Reputational damage.",
    mitigation: "Immediate implementation of double-check protocol for all medication administration. Additional training scheduled for all care staff. Daily audits implemented until resolved.",
    escalated: true,
    escalatedDate: "2026-02-16",
    escalatedTo: "Clinical Director",
    rootCause: "Staff training gaps identified. High workload during evening shifts contributing to rushed procedures. Inadequate supervision of new staff members.",
    timeline: [
      { date: "2026-02-15", event: "Risk identified during audit", by: "Jane Smith" },
      { date: "2026-02-15", event: "Immediate corrective action initiated", by: "Jane Smith" },
      { date: "2026-02-16", event: "Escalated to Clinical Director", by: "Jane Smith" },
      { date: "2026-02-17", event: "Training plan approved", by: "Clinical Director" },
      { date: "2026-02-19", event: "First training session completed", by: "Training Team" },
    ],
    actions: [
      { action: "Double-check protocol implemented", status: "Complete", date: "2026-02-15" },
      { action: "Staff training sessions", status: "In Progress", date: "2026-02-19" },
      { action: "Daily medication audits", status: "Ongoing", date: "2026-02-16" },
      { action: "Supervision plan for new staff", status: "Pending", date: "" },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/risk-register")}
          className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors mb-6 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Risk Register
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-semibold text-black">{riskDetails.id}</h1>
            <span
              className={`px-3 py-1 ${
                riskDetails.severity === "High"
                  ? "bg-black text-white"
                  : riskDetails.severity === "Medium"
                  ? "border-2 border-black"
                  : "bg-gray-200"
              }`}
            >
              {riskDetails.severity} Severity
            </span>
            <span className="px-3 py-1 border-2 border-black">
              {riskDetails.status}
            </span>
            {riskDetails.escalated && (
              <span className="px-3 py-1 bg-black text-white">
                Escalated
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {riskDetails.house} • Reported {riskDetails.dateReported} by {riskDetails.reportedBy}
          </p>
        </div>

        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-3 text-black">Description</h2>
            <p className="text-black">{riskDetails.description}</p>
          </div>

          {/* Impact & Mitigation */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Impact</h2>
              <p className="text-black">{riskDetails.impact}</p>
            </div>
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Mitigation Plan</h2>
              <p className="text-black">{riskDetails.mitigation}</p>
            </div>
          </div>

          {/* Root Cause */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-3 text-black">Root Cause Analysis</h2>
            <p className="text-black">{riskDetails.rootCause}</p>
          </div>

          {/* Actions */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Actions Taken</h2>
            <div className="space-y-3">
              {riskDetails.actions.map((action, idx) => (
                <div
                  key={idx}
                  className={`p-4 ${idx % 2 === 0 ? "bg-gray-100" : "bg-white"} border border-gray-300`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-black flex-1">{action.action}</p>
                    <div className="ml-4 text-right">
                      <span
                        className={`inline-block px-2 py-1 text-xs ${
                          action.status === "Complete"
                            ? "bg-black text-white"
                            : action.status === "In Progress"
                            ? "border border-black"
                            : action.status === "Ongoing"
                            ? "bg-gray-200"
                            : "border border-gray-300 text-gray-400"
                        }`}
                      >
                        {action.status}
                      </span>
                      {action.date && (
                        <p className="text-sm text-gray-600 mt-1">{action.date}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Timeline</h2>
            <div className="space-y-4">
              {riskDetails.timeline.map((entry, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="relative">
                    <div className="w-3 h-3 bg-black mt-1.5" />
                    {idx < riskDetails.timeline.length - 1 && (
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-sm text-gray-600">{entry.date}</p>
                    <p className="text-black">{entry.event}</p>
                    <p className="text-sm text-gray-600">{entry.by}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation Info */}
          {riskDetails.escalated && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Escalation Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Escalated Date</p>
                  <p className="text-black">{riskDetails.escalatedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Escalated To</p>
                  <p className="text-black">{riskDetails.escalatedTo}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
