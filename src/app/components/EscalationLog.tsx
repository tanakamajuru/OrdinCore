import { Navigation } from "./Navigation";

export function EscalationLog() {
  const escalations = [
    {
      date: "2026-02-20",
      house: "Oakwood",
      riskId: "R-2024-089",
      risk: "Medication administration errors",
      escalatedBy: "Jane Smith",
      escalatedTo: "Clinical Director",
      responseTime: "2 hours",
      action: "Training plan approved and implemented",
    },
    {
      date: "2026-02-19",
      house: "Riverside",
      riskId: "R-2024-091",
      risk: "Staffing below minimum ratios",
      escalatedBy: "Michael Chen",
      escalatedTo: "Operations Manager",
      responseTime: "1 hour",
      action: "Emergency staffing activated, agency support secured",
    },
    {
      date: "2026-02-18",
      house: "Maple Grove",
      riskId: "R-2024-093",
      risk: "Fire safety equipment malfunction",
      escalatedBy: "Sarah Johnson",
      escalatedTo: "Facilities Manager",
      responseTime: "30 minutes",
      action: "Emergency repair completed, temporary measures implemented",
    },
    {
      date: "2026-02-17",
      house: "Sunset Villa",
      riskId: "R-2024-095",
      risk: "Resident injury - fall prevention",
      escalatedBy: "David Brown",
      escalatedTo: "Clinical Director",
      responseTime: "1.5 hours",
      action: "Enhanced monitoring protocol implemented, mobility assessment completed",
    },
    {
      date: "2026-02-16",
      house: "Birchwood",
      riskId: "R-2024-090",
      risk: "Safeguarding concern raised",
      escalatedBy: "Emma Wilson",
      escalatedTo: "Safeguarding Lead",
      responseTime: "45 minutes",
      action: "Investigation initiated, interim measures in place",
    },
    {
      date: "2026-02-15",
      house: "Riverside",
      riskId: "R-2024-092",
      risk: "Serious incident investigation",
      escalatedBy: "Michael Chen",
      escalatedTo: "Clinical Director",
      responseTime: "1 hour",
      action: "Full investigation commenced, family notified",
    },
    {
      date: "2026-02-14",
      house: "Oakwood",
      riskId: "R-2024-087",
      risk: "Documentation compliance breach",
      escalatedBy: "Jane Smith",
      escalatedTo: "Quality Manager",
      responseTime: "3 hours",
      action: "Remedial action plan created, staff briefed",
    },
    {
      date: "2026-02-13",
      house: "Sunset Villa",
      riskId: "R-2024-086",
      risk: "Equipment failure affecting care",
      escalatedBy: "David Brown",
      escalatedTo: "Facilities Manager",
      responseTime: "2 hours",
      action: "Equipment replaced, maintenance schedule reviewed",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Escalation Log</h1>
          <p className="text-gray-600 mt-1">Read-only audit trail of all escalated risks</p>
        </div>

        <div className="bg-white border-2 border-black p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-3 px-4 text-black">Date</th>
                  <th className="text-left py-3 px-4 text-black">House</th>
                  <th className="text-left py-3 px-4 text-black">Risk ID</th>
                  <th className="text-left py-3 px-4 text-black">Risk</th>
                  <th className="text-left py-3 px-4 text-black">Escalated By</th>
                  <th className="text-left py-3 px-4 text-black">Escalated To</th>
                  <th className="text-left py-3 px-4 text-black">Response Time</th>
                  <th className="text-left py-3 px-4 text-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((esc, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-gray-100" : "bg-white"}
                  >
                    <td className="py-3 px-4 text-black">{esc.date}</td>
                    <td className="py-3 px-4 text-black">{esc.house}</td>
                    <td className="py-3 px-4 text-black font-semibold">{esc.riskId}</td>
                    <td className="py-3 px-4 text-black">{esc.risk}</td>
                    <td className="py-3 px-4 text-black">{esc.escalatedBy}</td>
                    <td className="py-3 px-4 text-black">{esc.escalatedTo}</td>
                    <td className="py-3 px-4 text-black">{esc.responseTime}</td>
                    <td className="py-3 px-4 text-black">{esc.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white border-2 border-black">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> This is an immutable audit log. All escalation records are permanently retained for compliance and governance purposes. Total records: {escalations.length}
          </p>
        </div>
      </div>
    </div>
  );
}
