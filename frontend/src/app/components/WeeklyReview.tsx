import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface SafeguardingConcern {
  id: string;
  summary: string;
  immediateActions: string;
  personsViews: string;
  capacityConsidered: boolean;
  capacityReasoning: string;
  referralMade: boolean;
  referralDate: string;
  externalAgencies: string;
  currentStatus: string;
  widerTheme: boolean;
  widerThemeExplanation: string;
}

interface RiskRegisterItem {
  id: string;
  title: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  impactOnPerson: string;
  controlsInPlace: string;
  nextReviewDate: string;
  status: "Open" | "Under Review" | "Escalated" | "Closed";
}

export function WeeklyReview() {
  const navigate = useNavigate();

  // Header fields
  const [weekEnding, setWeekEnding] = useState("");
  const [serviceName, setServiceName] = useState("CareProvider Ltd");
  const [registeredManager, setRegisteredManager] = useState("");
  const [completedBy, setCompletedBy] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [status, setStatus] = useState<"Draft" | "Submitted" | "Locked">("Draft");
  const [house, setHouse] = useState<any>(null);
  const [allHouses, setAllHouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Section 1 - Executive Overview
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [riskLevelChanged, setRiskLevelChanged] = useState(false);
  const [riskLevelChangeExplanation, setRiskLevelChangeExplanation] = useState("");

  // Auto-populated summary data (from weekly pulses)
  const autoSummaryData = {
    totalActiveRisks: 12,
    highRisks: 4,
    safeguardingSignals: 3,
    escalationsThisWeek: 2,
    staffingStability: "Emerging Pressure"
  };

  // Section 2 - Active Risk Register
  const [riskRegister, setRiskRegister] = useState<RiskRegisterItem[]>([
    {
      id: "RISK-001",
      title: "Medication administration errors",
      category: "Clinical",
      severity: "High",
      impactOnPerson: "",
      controlsInPlace: "",
      nextReviewDate: "",
      status: "Open"
    },
    {
      id: "RISK-002", 
      title: "Staffing below minimum ratios",
      category: "Operational",
      severity: "High",
      impactOnPerson: "",
      controlsInPlace: "",
      nextReviewDate: "",
      status: "Open"
    }
  ]);

  // Section 3 - Safeguarding Activity
  const [safeguardingConcerns, setSafeguardingConcerns] = useState<SafeguardingConcern[]>([
    {
      id: "SG-001",
      summary: "",
      immediateActions: "",
      personsViews: "",
      capacityConsidered: false,
      capacityReasoning: "",
      referralMade: false,
      referralDate: "",
      externalAgencies: "",
      currentStatus: "",
      widerTheme: false,
      widerThemeExplanation: ""
    }
  ]);

  // Section 4 - Incident & Trend Reflection
  const [incidentCounts, setIncidentCounts] = useState({
    falls: 0,
    assault: 0,
    illness: 0,
    injury: 0,
    abcBehaviour: 0,
    medicationErrors: 0,
    missedVisits: 0,
    missingPerson: 0,
    seizure: 0
  });
  const [incidentPattern, setIncidentPattern] = useState("");

  // Section 5 - Staffing & Commissioned Hours
  const [commissionedHoursDelivered, setCommissionedHoursDelivered] = useState("");
  const [varianceExplanation, setVarianceExplanation] = useState("");
  const [impactOnHighRisk, setImpactOnHighRisk] = useState("");
  const [staffingStabilityConcerns, setStaffingStabilityConcerns] = useState("");

  // Section 6 - Escalation & Provider Oversight
  const [risksEscalatedThisWeek, setRisksEscalatedThisWeek] = useState(false);
  const [escalationDetails, setEscalationDetails] = useState("");
  const [nextOversightReviewDate, setNextOversightReviewDate] = useState("");

  // Section 7 - Learning & Strengthening Actions
  const [strengthenedThisWeek, setStrengthenedThisWeek] = useState("");
  const [learningActions, setLearningActions] = useState("");
  const [effectivenessReview, setEffectivenessReview] = useState("");
  const [impactReviewDate, setImpactReviewDate] = useState("");

  // Section 8 - Reflective Governance Statement
  const [greatestConcern, setGreatestConcern] = useState("");
  const [couldDeteriorate, setCouldDeteriorate] = useState("");

  // Declaration
  const [digitalSignature, setDigitalSignature] = useState("");
  const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
      
      // Load all houses
      const housesRes = await apiClient.get('/houses?limit=100');
      const hDataAll = (housesRes.data as any).data || (housesRes.data as any) || [];
      const housesList = Array.isArray(hDataAll) ? hDataAll : [];
      setAllHouses(housesList);

      let initialHouse = null;
      if (userRole === 'REGISTERED_MANAGER') {
        const hRes = await apiClient.get(`/users/${user.id}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        initialHouse = Array.isArray(hData) ? hData[0] : hData;
      } else if (housesList.length > 0) {
        initialHouse = housesList[0];
      }

      if (initialHouse) {
        setHouse(initialHouse);
        setServiceName(initialHouse.name);
        setRegisteredManager(`${user.first_name} ${user.last_name}`);
        loadReviewData(initialHouse.id, weekEnding || new Date().toISOString().split('T')[0]);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
      setIsLoading(false);
    }
  };

  const loadReviewData = async (houseId: string, weekEndingDate: string) => {
    try {
      setIsLoading(true);
      const rRes = await apiClient.get(`/weekly-reviews/house/${houseId}`);
      const reviews = (rRes.data as any).data || [];
      const current = reviews.find((r: any) => r.week_ending.startsWith(weekEndingDate));
      
      if (current) {
        const c = current.content;
        setExecutiveSummary(c.executiveSummary || "");
        setRiskLevelChanged(c.riskLevelChanged || false);
        setRiskLevelChangeExplanation(c.riskLevelChangeExplanation || "");
        setRiskRegister(c.riskRegister || []);
        setSafeguardingConcerns(c.safeguardingConcerns || []);
        setIncidentCounts(c.incidentCounts || { falls: 0, assault: 0, illness: 0, injury: 0, abcBehaviour: 0, medicationErrors: 0, missedVisits: 0, missingPerson: 0, seizure: 0 });
        setIncidentPattern(c.incidentPattern || "");
        setCommissionedHoursDelivered(c.commissionedHoursDelivered || "");
        setVarianceExplanation(c.varianceExplanation || "");
        setImpactOnHighRisk(c.impactOnHighRisk || "");
        setStaffingStabilityConcerns(c.staffingStabilityConcerns || "");
        setRisksEscalatedThisWeek(c.risksEscalatedThisWeek || false);
        setEscalationDetails(c.escalationDetails || "");
        setNextOversightReviewDate(c.nextOversightReviewDate || "");
        setStrengthenedThisWeek(c.strengthenedThisWeek || "");
        setLearningActions(c.learningActions || "");
        setEffectivenessReview(c.effectivenessReview || "");
        setImpactReviewDate(c.impactReviewDate || "");
        setGreatestConcern(c.greatestConcern || "");
        setCouldDeteriorate(c.couldDeteriorate || "");
        setDigitalSignature(c.digitalSignature || "");
        setStatus(current.status === 'locked' ? 'Locked' : (current.status === 'submitted' ? 'Submitted' : 'Draft'));
      } else {
        // Reset state for new review
        resetForm();
      }
    } catch (err) {
      console.error("Failed to load review data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setExecutiveSummary("");
    setRiskLevelChanged(false);
    setRiskLevelChangeExplanation("");
    setRiskRegister([]);
    setSafeguardingConcerns([{
      id: "SG-001", summary: "", immediateActions: "", personsViews: "",
      capacityConsidered: false, capacityReasoning: "", referralMade: false,
      referralDate: "", externalAgencies: "", currentStatus: "",
      widerTheme: false, widerThemeExplanation: ""
    }]);
    setIncidentCounts({ falls: 0, assault: 0, illness: 0, injury: 0, abcBehaviour: 0, medicationErrors: 0, missedVisits: 0, missingPerson: 0, seizure: 0 });
    setIncidentPattern("");
    setCommissionedHoursDelivered("");
    setVarianceExplanation("");
    setImpactOnHighRisk("");
    setStaffingStabilityConcerns("");
    setRisksEscalatedThisWeek(false);
    setEscalationDetails("");
    setNextOversightReviewDate("");
    setStrengthenedThisWeek("");
    setLearningActions("");
    setEffectivenessReview("");
    setImpactReviewDate("");
    setGreatestConcern("");
    setCouldDeteriorate("");
    setDigitalSignature("");
    setStatus("Draft");
  };

  const addSafeguardingConcern = () => {
    const newConcern: SafeguardingConcern = {
      id: `SG-${String(safeguardingConcerns.length + 1).padStart(3, '0')}`,
      summary: "",
      immediateActions: "",
      personsViews: "",
      capacityConsidered: false,
      capacityReasoning: "",
      referralMade: false,
      referralDate: "",
      externalAgencies: "",
      currentStatus: "",
      widerTheme: false,
      widerThemeExplanation: ""
    };
    setSafeguardingConcerns([...safeguardingConcerns, newConcern]);
  };

  const updateSafeguardingConcern = (id: string, field: keyof SafeguardingConcern, value: any) => {
    setSafeguardingConcerns(prev => prev.map(concern => 
      concern.id === id ? { ...concern, [field]: value } : concern
    ));
  };

  const updateRiskRegisterItem = (id: string, field: keyof RiskRegisterItem, value: any) => {
    setRiskRegister(prev => prev.map(risk => 
      risk.id === id ? { ...risk, [field]: value } : risk
    ));
  };

  const saveReview = async (newStatus: "Draft" | "Locked") => {
    if (!house) return;
    setIsSaving(true);
    try {
      const payload = {
        house_id: house.id,
        week_ending: weekEnding,
        status: newStatus.toLowerCase(),
        content: {
          executiveSummary,
          riskLevelChanged,
          riskLevelChangeExplanation,
          riskRegister,
          safeguardingConcerns,
          incidentCounts,
          incidentPattern,
          commissionedHoursDelivered,
          varianceExplanation,
          impactOnHighRisk,
          staffingStabilityConcerns,
          risksEscalatedThisWeek,
          escalationDetails,
          nextOversightReviewDate,
          strengthenedThisWeek,
          learningActions,
          effectivenessReview,
          impactReviewDate,
          greatestConcern,
          couldDeteriorate,
          digitalSignature,
        }
      };
      await apiClient.post('/weekly-reviews', payload);
      setStatus(newStatus);
      toast.success(`Weekly Review ${newStatus === 'Draft' ? 'draft saved' : 'submitted and locked'} successfully`);
      if (newStatus === 'Locked') navigate("/dashboard");
    } catch (err) {
      toast.error("Failed to save weekly review");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => {
    saveReview("Draft");
  };

  const handleSubmitAndLock = () => {
    saveReview("Locked");
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">WEEKLY GOVERNANCE REVIEW</h1>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-gray-600">Status:</span>
            <span className={`px-3 py-1 border-2 font-medium ${
              status === "Draft" ? "bg-white text-black border-gray-300" :
              status === "Submitted" ? "bg-gray-100 text-black border-gray-400" :
              "bg-black text-white border-black"
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Form Header */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-black font-medium">House / Service</label>
              <select
                value={house?.id || ""}
                onChange={(e) => {
                  const selected = allHouses.find(h => h.id === e.target.value);
                  if (selected) {
                    setHouse(selected);
                    setServiceName(selected.name);
                    loadReviewData(selected.id, weekEnding);
                  }
                }}
                disabled={localStorage.getItem('userRole')?.toUpperCase() === 'REGISTERED_MANAGER'}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              >
                <option value="">Select house...</option>
                {allHouses.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-black font-medium">Week Ending</label>
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => {
                  setWeekEnding(e.target.value);
                  if (house) loadReviewData(house.id, e.target.value);
                }}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
            <div>
              <label className="block mb-2 text-black font-medium">Service Name</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
            <div>
              <label className="block mb-2 text-black font-medium">Registered Manager</label>
              <input
                type="text"
                value={registeredManager}
                onChange={(e) => setRegisteredManager(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
            <div>
              <label className="block mb-2 text-black font-medium">Completed By</label>
              <input
                type="text"
                value={completedBy}
                onChange={(e) => setCompletedBy(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
            <div>
              <label className="block mb-2 text-black font-medium">Reviewed By</label>
              <input
                type="text"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1 - Executive Governance Overview */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 1 — Executive Governance Overview (Auto-Summary Panel)</h2>
            
            <div className="bg-gray-50 border-2 border-gray-300 p-4 mb-4">
              <h3 className="font-semibold text-black mb-3">Auto-Populated from Week's Governance Pulses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-black">Total Active Risks:</span>
                  <span className="font-semibold">{autoSummaryData.totalActiveRisks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">High Risks:</span>
                  <span className="font-semibold">{autoSummaryData.highRisks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Safeguarding Signals:</span>
                  <span className="font-semibold">{autoSummaryData.safeguardingSignals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Escalations This Week:</span>
                  <span className="font-semibold">{autoSummaryData.escalationsThisWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Staffing Stability:</span>
                  <span className="font-semibold">{autoSummaryData.staffingStability}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-black font-medium">Executive Summary</label>
              <p className="text-gray-600 text-sm mb-2 italic">Provide a concise summary of the service's overall risk and safeguarding position this week.</p>
              <textarea
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
              />
            </div>
          </div>

          {/* Section 2 - Active Risk Register Review */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 2 — Active Risk Register Review</h2>
            
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="border border-gray-300 px-4 py-2 text-left">Risk Title</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Severity</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Impact on Person</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Controls in Place</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Next Review Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {riskRegister.map((risk, index) => (
                    <tr key={risk.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={risk.title}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "title", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={risk.category}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "category", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <select
                          value={risk.severity}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "severity", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={risk.impactOnPerson}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "impactOnPerson", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={risk.controlsInPlace}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "controlsInPlace", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="date"
                          value={risk.nextReviewDate}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "nextReviewDate", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <select
                          value={risk.status}
                          onChange={(e) => updateRiskRegisterItem(risk.id, "status", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black"
                        >
                          <option value="Open">Open</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Escalated">Escalated</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-black font-medium">Has the level of any risk changed this week?</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRiskLevelChanged(false)}
                    className={`px-4 py-2 border-2 transition-colors ${
                      !riskLevelChanged ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setRiskLevelChanged(true)}
                    className={`px-4 py-2 border-2 transition-colors ${
                      riskLevelChanged ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
              {riskLevelChanged && (
                <div>
                  <label className="block mb-2 text-black font-medium">Explanation</label>
                  <textarea
                    value={riskLevelChangeExplanation}
                    onChange={(e) => setRiskLevelChangeExplanation(e.target.value)}
                    className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3 - Safeguarding Activity */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 3 — Safeguarding Activity (7-Day Review)</h2>
            
            {safeguardingConcerns.map((concern, index) => (
              <div key={concern.id} className="border-2 border-gray-300 p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-black">Concern #{index + 1}</h3>
                  {safeguardingConcerns.length > 1 && (
                    <button
                      onClick={() => setSafeguardingConcerns(prev => prev.filter(c => c.id !== concern.id))}
                      className="px-3 py-1 bg-red-600 text-white text-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-black font-medium">Concern Summary</label>
                    <textarea
                      value={concern.summary}
                      onChange={(e) => updateSafeguardingConcern(concern.id, "summary", e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-black font-medium">Immediate Actions Taken</label>
                    <textarea
                      value={concern.immediateActions}
                      onChange={(e) => updateSafeguardingConcern(concern.id, "immediateActions", e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-black font-medium">Person's Views (wishes and feelings)</label>
                    <textarea
                      value={concern.personsViews}
                      onChange={(e) => updateSafeguardingConcern(concern.id, "personsViews", e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="text-black font-medium">Capacity Considered?</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSafeguardingConcern(concern.id, "capacityConsidered", false)}
                        className={`px-4 py-2 border-2 transition-colors ${
                          !concern.capacityConsidered ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        No
                      </button>
                      <button
                        onClick={() => updateSafeguardingConcern(concern.id, "capacityConsidered", true)}
                        className={`px-4 py-2 border-2 transition-colors ${
                          concern.capacityConsidered ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                  
                  {concern.capacityConsidered && (
                    <div>
                      <label className="block mb-2 text-black font-medium">Reasoning</label>
                      <textarea
                        value={concern.capacityReasoning}
                        onChange={(e) => updateSafeguardingConcern(concern.id, "capacityReasoning", e.target.value)}
                        className="w-full h-16 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <label className="text-black font-medium">Referral Made?</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSafeguardingConcern(concern.id, "referralMade", false)}
                        className={`px-4 py-2 border-2 transition-colors ${
                          !concern.referralMade ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        No
                      </button>
                      <button
                        onClick={() => updateSafeguardingConcern(concern.id, "referralMade", true)}
                        className={`px-4 py-2 border-2 transition-colors ${
                          concern.referralMade ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                  
                  {concern.referralMade && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-black font-medium">Referral Date</label>
                        <input
                          type="date"
                          value={concern.referralDate}
                          onChange={(e) => updateSafeguardingConcern(concern.id, "referralDate", e.target.value)}
                          className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-black font-medium">External Agencies Involved</label>
                        <input
                          type="text"
                          value={concern.externalAgencies}
                          onChange={(e) => updateSafeguardingConcern(concern.id, "externalAgencies", e.target.value)}
                          className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block mb-2 text-black font-medium">Current Status</label>
                    <input
                      type="text"
                      value={concern.currentStatus}
                      onChange={(e) => updateSafeguardingConcern(concern.id, "currentStatus", e.target.value)}
                      className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="text-black font-medium">Does this indicate a wider theme?</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSafeguardingConcern(concern.id, "widerTheme", false)}
                        className={`px-4 py-2 border-2 transition-colors ${
                          !concern.widerTheme ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        No
                      </button>
                      <button
                        onClick={() => updateSafeguardingConcern(concern.id, "widerTheme", true)}
                        className={`px-4 py-2 border-2 transition-colors ${
                          concern.widerTheme ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                  
                  {concern.widerTheme && (
                    <div>
                      <label className="block mb-2 text-black font-medium">Explanation</label>
                      <textarea
                        value={concern.widerThemeExplanation}
                        onChange={(e) => updateSafeguardingConcern(concern.id, "widerThemeExplanation", e.target.value)}
                        className="w-full h-16 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <button
              onClick={addSafeguardingConcern}
              className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-gray-100"
            >
              Add Safeguarding Concern
            </button>
          </div>

          {/* Section 4 - Incident & Trend Reflection */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 4 — Incident & Trend Reflection (Past 7 Days)</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block mb-2 text-black font-medium">Falls</label>
                <input
                  type="number"
                  value={incidentCounts.falls}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, falls: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Assault</label>
                <input
                  type="number"
                  value={incidentCounts.assault}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, assault: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Illness</label>
                <input
                  type="number"
                  value={incidentCounts.illness}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, illness: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Injury</label>
                <input
                  type="number"
                  value={incidentCounts.injury}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, injury: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">ABC Behaviour Incidents</label>
                <input
                  type="number"
                  value={incidentCounts.abcBehaviour}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, abcBehaviour: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Medication Errors</label>
                <input
                  type="number"
                  value={incidentCounts.medicationErrors}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, medicationErrors: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Missed Visits</label>
                <input
                  type="number"
                  value={incidentCounts.missedVisits}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, missedVisits: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Missing Person</label>
                <input
                  type="number"
                  value={incidentCounts.missingPerson}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, missingPerson: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Seizure</label>
                <input
                  type="number"
                  value={incidentCounts.seizure}
                  onChange={(e) => setIncidentCounts(prev => ({...prev, seizure: parseInt(e.target.value) || 0}))}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
            </div>
            
            <div>
              <label className="block mb-2 text-black font-medium">Is there any clustering or emerging pattern requiring action?</label>
              <textarea
                value={incidentPattern}
                onChange={(e) => setIncidentPattern(e.target.value)}
                className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
              />
            </div>
          </div>

          {/* Section 5 - Staffing & Commissioned Hours Assurance */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 5 — Staffing & Commissioned Hours Assurance</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-black font-medium">Commissioned Hours Delivered This Week</label>
                <input
                  type="number"
                  value={commissionedHoursDelivered}
                  onChange={(e) => setCommissionedHoursDelivered(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Variance Explanation (if applicable)</label>
                <textarea
                  value={varianceExplanation}
                  onChange={(e) => setVarianceExplanation(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Impact on High-Risk Individuals</label>
                <textarea
                  value={impactOnHighRisk}
                  onChange={(e) => setImpactOnHighRisk(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Any Staffing Stability Concerns</label>
                <textarea
                  value={staffingStabilityConcerns}
                  onChange={(e) => setStaffingStabilityConcerns(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 6 - Escalation & Provider Oversight */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 6 — Escalation & Provider Oversight</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-black font-medium">Were any risks escalated this week?</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRisksEscalatedThisWeek(false)}
                    className={`px-4 py-2 border-2 transition-colors ${
                      !risksEscalatedThisWeek ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setRisksEscalatedThisWeek(true)}
                    className={`px-4 py-2 border-2 transition-colors ${
                      risksEscalatedThisWeek ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
              
              {risksEscalatedThisWeek && (
                <div>
                  <label className="block mb-2 text-black font-medium">Details of Escalation & Provider Response</label>
                  <textarea
                    value={escalationDetails}
                    onChange={(e) => setEscalationDetails(e.target.value)}
                    className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                  />
                </div>
              )}
              
              <div>
                <label className="block mb-2 text-black font-medium">Next Oversight Review Date</label>
                <input
                  type="date"
                  value={nextOversightReviewDate}
                  onChange={(e) => setNextOversightReviewDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
            </div>
          </div>

          {/* Section 7 - Learning & Strengthening Actions */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 7 — Learning & Strengthening Actions</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-black font-medium">What has been strengthened this week?</label>
                <textarea
                  value={strengthenedThisWeek}
                  onChange={(e) => setStrengthenedThisWeek(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Learning Actions Implemented</label>
                <textarea
                  value={learningActions}
                  onChange={(e) => setLearningActions(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">How will effectiveness be reviewed?</label>
                <textarea
                  value={effectivenessReview}
                  onChange={(e) => setEffectivenessReview(e.target.value)}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Impact Review Date</label>
                <input
                  type="date"
                  value={impactReviewDate}
                  onChange={(e) => setImpactReviewDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
            </div>
          </div>

          {/* Section 8 - Reflective Governance Statement */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Section 8 — Reflective Governance Statement</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-black font-medium">What caused the greatest concern this week?</label>
                <textarea
                  value={greatestConcern}
                  onChange={(e) => setGreatestConcern(e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">What could reasonably deteriorate before next week?</label>
                <textarea
                  value={couldDeteriorate}
                  onChange={(e) => setCouldDeteriorate(e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
            </div>
          </div>

          {/* Declaration & Lock */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Declaration & Lock</h2>
            
            <div className="mb-4">
              <p className="text-black mb-4">I confirm that I have reviewed all active risks, safeguarding concerns and governance controls for this reporting period.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-black font-medium">Digital Signature</label>
                <input
                  type="text"
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  placeholder="Type your name to sign"
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              <div>
                <label className="block mb-2 text-black font-medium">Date</label>
                <input
                  type="date"
                  value={declarationDate}
                  onChange={(e) => setDeclarationDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || status === 'Locked'}
            className="py-3 px-8 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'SAVE AS DRAFT'}
          </button>
          <button
            onClick={handleSubmitAndLock}
            disabled={isSaving || status === 'Locked'}
            className="py-3 px-8 bg-black text-white hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            SUBMIT & LOCK REVIEW
          </button>
        </div>
      </div>
    </div>
  );
}
