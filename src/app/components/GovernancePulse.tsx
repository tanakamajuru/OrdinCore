import { useState } from "react";
import { Navigation } from "./Navigation";
import { useNavigate } from "react-router";

type DayType = "MON" | "WED" | "FRI";
type StaffingLevel = "Stable" | "Emerging Pressure" | "High Risk";

interface EscalationForm {
  house: string;
  riskDescription: string;
  escalatedBy: string;
  escalatedTo: string;
  leadershipAction: string;
  dateTime: string;
}

interface HouseSnapshot {
  house: string;
  highRisk: boolean;
  safeguarding: boolean;
  staffing: StaffingLevel;
  escalation: boolean;
  oneLineUpdate: string;
}

export function GovernancePulse() {
  const navigate = useNavigate();
  
  // Determine current day and appropriate form
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const [currentDay, setCurrentDay] = useState<DayType>(() => {
    if (dayOfWeek === 1) return "MON"; // Monday
    if (dayOfWeek === 3) return "WED"; // Wednesday  
    if (dayOfWeek === 5) return "FRI"; // Friday
    return "MON"; // Default to Monday for other days
  });

  const [completedBy, setCompletedBy] = useState("");
  const [provider, setProvider] = useState("CareProvider Ltd");
  const [housesReviewed, setHousesReviewed] = useState("");

  // Monday form state
  const [mondayForm, setMondayForm] = useState({
    newHighRisks: false,
    safeguardingConcerns: false,
    medicationIssues: false,
    staffingGaps: false,
    environmentalSafety: false,
    escalationRequired: false,
    briefGovernanceSummary: "",
    leadershipAction: ""
  });

  // Wednesday form state
  const [wednesdayForm, setWednesdayForm] = useState({
    severityChanged: false,
    mitigationHolding: false,
    recurrenceIdentified: false,
    newSafeguardingConcerns: false,
    escalationRequired: false,
    activeHighRisksReviewed: "",
    midweekGovernanceReflection: ""
  });

  // Friday form state
  const [fridayForm, setFridayForm] = useState({
    highRiskTrend: "Stable" as StaffingLevel,
    recurrentRisks: false,
    staffingStability: "Stable" as StaffingLevel,
    escalationRequired: false,
    escalationsThisWeek: "",
    forwardRiskReflection: "",
    mitigationAgreed: ""
  });

  // Escalation sub-form state
  const [escalationForm, setEscalationForm] = useState<EscalationForm>({
    house: "",
    riskDescription: "",
    escalatedBy: "",
    escalatedTo: "",
    leadershipAction: "",
    dateTime: new Date().toISOString()
  });

  // House snapshots state
  const [houseSnapshots, setHouseSnapshots] = useState<HouseSnapshot[]>([
    { house: "Oakwood", highRisk: false, safeguarding: false, staffing: "Stable", escalation: false, oneLineUpdate: "" },
    { house: "Riverside", highRisk: false, safeguarding: false, staffing: "Stable", escalation: false, oneLineUpdate: "" },
    { house: "Maple Grove", highRisk: false, safeguarding: false, staffing: "Stable", escalation: false, oneLineUpdate: "" },
    { house: "Sunset Villa", highRisk: false, safeguarding: false, staffing: "Stable", escalation: false, oneLineUpdate: "" }
  ]);

  const renderYesNoToggle = (checked: boolean, onChange: () => void, label: string) => (
    <div className="flex items-center justify-between p-4 border border-gray-300">
      <label className="text-black font-medium">{label}</label>
      <div className="flex gap-2">
        <button
          onClick={() => !checked && onChange()}
          className={`px-4 py-2 border-2 transition-colors ${
            !checked ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
          }`}
        >
          No
        </button>
        <button
          onClick={() => checked && onChange()}
          className={`px-4 py-2 border-2 transition-colors ${
            checked ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
          }`}
        >
          Yes
        </button>
      </div>
    </div>
  );

  const renderThreeOption = (value: StaffingLevel, onChange: (val: StaffingLevel) => void, label: string) => (
    <div className="flex items-center justify-between p-4 border border-gray-300">
      <label className="text-black font-medium">{label}</label>
      <div className="flex gap-2">
        {(["Stable", "Emerging Pressure", "High Risk"] as StaffingLevel[]).map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-3 py-2 border-2 text-sm transition-colors ${
              value === option ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:border-gray-500"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  const updateHouseSnapshot = (index: number, field: keyof HouseSnapshot, value: any) => {
    setHouseSnapshots(prev => prev.map((house, i) => 
      i === index ? { ...house, [field]: value } : house
    ));
  };

  const handleSaveDraft = () => {
    alert("Draft saved successfully");
  };

  const handleSubmitAndLock = () => {
    alert("Pulse submitted and locked successfully");
    navigate("/dashboard");
  };

  const getDayName = (day: DayType) => {
    switch(day) {
      case "MON": return "Monday";
      case "WED": return "Wednesday"; 
      case "FRI": return "Friday";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">GOVERNANCE PULSE</h1>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-4">
              <label className="text-black font-medium">Date:</label>
              <span className="text-gray-600">{today.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-black font-medium">Day:</label>
              <span className="text-gray-600">{getDayName(currentDay)}</span>
            </div>
            {dayOfWeek !== 1 && dayOfWeek !== 3 && dayOfWeek !== 5 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 p-3">
                <p className="text-yellow-800">
                  You are completing a pulse for {getDayName(currentDay)}. Today is {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dayOfWeek]}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
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
              <label className="block mb-2 text-black font-medium">Provider</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-black font-medium">Houses Reviewed</label>
            <input
              type="text"
              value={housesReviewed}
              onChange={(e) => setHousesReviewed(e.target.value)}
              placeholder="e.g., Oakwood, Riverside, Maple Grove"
              className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
            />
          </div>
        </div>

        {/* Day-specific forms */}
        <div className="space-y-6">
          {/* Monday Form */}
          {currentDay === "MON" && (
            <>
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-semibold mb-2 text-black">Monday — Stability & Weekend Oversight</h2>
                <p className="text-gray-600 mb-4 italic">Confirm weekend safety, identify emerging risks, and ensure no escalation gaps.</p>
                
                <div className="space-y-3">
                  {renderYesNoToggle(mondayForm.newHighRisks, () => setMondayForm(prev => ({...prev, newHighRisks: !prev.newHighRisks})), "Any new High Risks identified?")}
                  {renderYesNoToggle(mondayForm.safeguardingConcerns, () => setMondayForm(prev => ({...prev, safeguardingConcerns: !prev.safeguardingConcerns})), "Any safeguarding concerns?")}
                  {renderYesNoToggle(mondayForm.medicationIssues, () => setMondayForm(prev => ({...prev, medicationIssues: !prev.medicationIssues})), "Medication issues over weekend?")}
                  {renderYesNoToggle(mondayForm.staffingGaps, () => setMondayForm(prev => ({...prev, staffingGaps: !prev.staffingGaps})), "Staffing gaps carried forward?")}
                  {renderYesNoToggle(mondayForm.environmentalSafety, () => setMondayForm(prev => ({...prev, environmentalSafety: !prev.environmentalSafety})), "Environmental safety concerns?")}
                  {renderYesNoToggle(mondayForm.escalationRequired, () => setMondayForm(prev => ({...prev, escalationRequired: !prev.escalationRequired})), "Escalation Required?")}
                </div>
              </div>

              <div className="bg-white border-2 border-black p-6">
                <label className="block mb-2 text-black font-medium">Brief Governance Summary</label>
                <p className="text-gray-600 text-sm mb-2 italic">Summarise the overall governance position following the weekend.</p>
                <textarea
                  value={mondayForm.briefGovernanceSummary}
                  onChange={(e) => setMondayForm(prev => ({...prev, briefGovernanceSummary: e.target.value}))}
                  className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>

              {mondayForm.escalationRequired && (
                <div className="bg-white border-2 border-black p-6">
                  <h3 className="text-lg font-semibold mb-4 text-black">Escalation Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-black font-medium">House</label>
                      <select 
                        value={escalationForm.house}
                        onChange={(e) => setEscalationForm(prev => ({...prev, house: e.target.value}))}
                        className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                      >
                        <option value="">Select house</option>
                        {houseSnapshots.map(house => (
                          <option key={house.house} value={house.house}>{house.house}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-black font-medium">Risk Description</label>
                      <textarea
                        value={escalationForm.riskDescription}
                        onChange={(e) => setEscalationForm(prev => ({...prev, riskDescription: e.target.value}))}
                        className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-black font-medium">Leadership Action Taken</label>
                      <textarea
                        value={escalationForm.leadershipAction}
                        onChange={(e) => setEscalationForm(prev => ({...prev, leadershipAction: e.target.value}))}
                        className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Wednesday Form */}
          {currentDay === "WED" && (
            <>
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-semibold mb-2 text-black">Wednesday — Escalation & Mitigation Review</h2>
                <p className="text-gray-600 mb-4 italic">Midweek review of High Risks, mitigation effectiveness, and recurrence indicators.</p>
                
                <div className="space-y-3">
                  {renderYesNoToggle(wednesdayForm.severityChanged, () => setWednesdayForm(prev => ({...prev, severityChanged: !prev.severityChanged})), "Has severity of any active risk changed?")}
                  {renderYesNoToggle(wednesdayForm.mitigationHolding, () => setWednesdayForm(prev => ({...prev, mitigationHolding: !prev.mitigationHolding})), "Is mitigation holding?")}
                  {renderYesNoToggle(wednesdayForm.recurrenceIdentified, () => setWednesdayForm(prev => ({...prev, recurrenceIdentified: !prev.recurrenceIdentified})), "Any recurrence identified (last 4 weeks)?")}
                  {renderYesNoToggle(wednesdayForm.newSafeguardingConcerns, () => setWednesdayForm(prev => ({...prev, newSafeguardingConcerns: !prev.newSafeguardingConcerns})), "Any new safeguarding concerns?")}
                  {renderYesNoToggle(wednesdayForm.escalationRequired, () => setWednesdayForm(prev => ({...prev, escalationRequired: !prev.escalationRequired})), "Escalation Required?")}
                </div>
              </div>

              <div className="bg-white border-2 border-black p-6">
                <label className="block mb-2 text-black font-medium">Active High Risks Reviewed</label>
                <p className="text-gray-600 text-sm mb-2 italic">List the active high risks reviewed today and any change in status.</p>
                <textarea
                  value={wednesdayForm.activeHighRisksReviewed}
                  onChange={(e) => setWednesdayForm(prev => ({...prev, activeHighRisksReviewed: e.target.value}))}
                  className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>

              <div className="bg-white border-2 border-black p-6">
                <label className="block mb-2 text-black font-medium">Midweek Governance Reflection</label>
                <p className="text-gray-600 text-sm mb-2 italic">Reflect on current risk mitigation. Is anything weakening?</p>
                <textarea
                  value={wednesdayForm.midweekGovernanceReflection}
                  onChange={(e) => setWednesdayForm(prev => ({...prev, midweekGovernanceReflection: e.target.value}))}
                  className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
            </>
          )}

          {/* Friday Form */}
          {currentDay === "FRI" && (
            <>
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-semibold mb-2 text-black">Friday — Trajectory & Forward Risk Review</h2>
                <p className="text-gray-600 mb-4 italic">Review weekly risk trajectory and prepare for weekend stability.</p>
                
                <div className="space-y-3">
                  {renderThreeOption(fridayForm.highRiskTrend, (val) => setFridayForm(prev => ({...prev, highRiskTrend: val})), "High Risk Trend This Week")}
                  {renderYesNoToggle(fridayForm.recurrentRisks, () => setFridayForm(prev => ({...prev, recurrentRisks: !prev.recurrentRisks})), "Recurrent Risks Identified?")}
                  {renderThreeOption(fridayForm.staffingStability, (val) => setFridayForm(prev => ({...prev, staffingStability: val})), "Staffing Stability for Weekend")}
                  {renderYesNoToggle(fridayForm.escalationRequired, () => setFridayForm(prev => ({...prev, escalationRequired: !prev.escalationRequired})), "Escalation Required?")}
                </div>
              </div>

              <div className="bg-white border-2 border-black p-6">
                <label className="block mb-2 text-black font-medium">Escalations This Week</label>
                <p className="text-gray-600 text-sm mb-2 italic">List any escalations that occurred this week.</p>
                <textarea
                  value={fridayForm.escalationsThisWeek}
                  onChange={(e) => setFridayForm(prev => ({...prev, escalationsThisWeek: e.target.value}))}
                  className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>

              <div className="bg-white border-2 border-black p-6">
                <label className="block mb-2 text-black font-medium">Forward Risk Reflection</label>
                <p className="text-gray-600 text-sm mb-2 italic">What could reasonably deteriorate before next review?</p>
                <textarea
                  value={fridayForm.forwardRiskReflection}
                  onChange={(e) => setFridayForm(prev => ({...prev, forwardRiskReflection: e.target.value}))}
                  className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>

              <div className="bg-white border-2 border-black p-6">
                <label className="block mb-2 text-black font-medium">Mitigation Agreed</label>
                <p className="text-gray-600 text-sm mb-2 italic">What mitigation has been agreed ahead of the weekend?</p>
                <textarea
                  value={fridayForm.mitigationAgreed}
                  onChange={(e) => setFridayForm(prev => ({...prev, mitigationAgreed: e.target.value}))}
                  className="w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* House Snapshot Table */}
        <div className="bg-white border-2 border-black p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-black">House Snapshot</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-gray-300 px-4 py-2 text-left">House</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">High Risk</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Safeguarding</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Staffing</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Escalation</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">1-Line Update</th>
                </tr>
              </thead>
              <tbody>
                {houseSnapshots.map((house, index) => (
                  <tr key={house.house} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{house.house}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <div className="flex justify-center scale-75">
                        {renderYesNoToggle(
                          house.highRisk,
                          () => updateHouseSnapshot(index, "highRisk", !house.highRisk),
                          ""
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <div className="flex justify-center scale-75">
                        {renderYesNoToggle(
                          house.safeguarding,
                          () => updateHouseSnapshot(index, "safeguarding", !house.safeguarding),
                          ""
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <div className="flex justify-center scale-75">
                        {renderThreeOption(
                          house.staffing,
                          (val) => updateHouseSnapshot(index, "staffing", val),
                          ""
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <div className="flex justify-center scale-75">
                        {renderYesNoToggle(
                          house.escalation,
                          () => updateHouseSnapshot(index, "escalation", !house.escalation),
                          ""
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={house.oneLineUpdate}
                        onChange={(e) => updateHouseSnapshot(index, "oneLineUpdate", e.target.value)}
                        maxLength={120}
                        placeholder="Max 120 characters"
                        className="w-full px-2 py-1 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black text-black text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={handleSaveDraft}
            className="py-3 px-8 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors font-medium"
          >
            Save Draft
          </button>
          <button
            onClick={handleSubmitAndLock}
            className="py-3 px-8 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
          >
            Submit & Lock
          </button>
        </div>
      </div>
    </div>
  );
}
