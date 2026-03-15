import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, Plus } from "lucide-react";
import { dashboardApi } from "@/services/dashboardApi";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RiskCreationPrompt {
  show: boolean;
  house: string;
  description: string;
  severity: "High" | "Medium" | "Low";
  source: "emerging" | "escalation" | "safeguarding";
}

interface PulseData {
  emergingRisk: "none" | "yes";
  emergingRiskDescription: string;
  riskMovement: "none" | "yes";
  riskMovementDescription: string;
  safeguardingSignals: "none" | "yes";
  safeguardingDescription: string;
  operationalPressure: "staffing" | "behavioural" | "medication" | "environmental" | "none";
  escalationRequired: "no" | "yes";
  escalationReason: string;
  additionalObservations: string;
}

interface House {
  id: string;
  name: string;
  address: string;
}

export function GovernancePulse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pulseStatus, setPulseStatus] = useState<any>(null);
  
  // For registered managers, house will come from user data
  // For other roles (like Responsible Individual), they can select houses
  const [selectedHouse, setSelectedHouse] = useState(user?.assignedHouse || "");
  const [riskCreationPrompt, setRiskCreationPrompt] = useState<RiskCreationPrompt>({
    show: false,
    house: "",
    description: "",
    severity: "Medium",
    source: "emerging"
  });

  const [pulseData, setPulseData] = useState<PulseData>({
    emergingRisk: "none",
    emergingRiskDescription: "",
    riskMovement: "none",
    riskMovementDescription: "",
    safeguardingSignals: "none",
    safeguardingDescription: "",
    operationalPressure: "none",
    escalationRequired: "no",
    escalationReason: "",
    additionalObservations: ""
  });

  useEffect(() => {
    loadPulseData();
    loadHouses();
  }, []);

  const loadPulseData = async () => {
    try {
      const status = await dashboardApi.getPulseStatus();
      setPulseStatus(status);
    } catch (error) {
      console.error('Failed to load pulse status:', error);
      toast.error('Failed to load pulse status');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHouses = async () => {
    try {
      // Mock houses data - this should come from API
      const mockHouses: House[] = [
        { id: "1", name: "Maple House", address: "123 Maple St" },
        { id: "2", name: "Oakwood", address: "456 Oak Ave" },
        { id: "3", name: "Riverside", address: "789 River Rd" },
        { id: "4", name: "Sunset Villa", address: "321 Sunset Blvd" },
        { id: "5", name: "Birchwood", address: "654 Birch Ln" }
      ];
      setHouses(mockHouses);
    } catch (error) {
      console.error('Failed to load houses:', error);
    }
  };

  const houseOptions = houses.map(house => house.name);
  
  // Calculate next pulse day
  const today = currentDate.split(',')[0]; // Get current day name
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const pulseDays = ["Monday", "Wednesday", "Friday"];
  
  const todayIndex = dayOrder.indexOf(today);
  let nextPulseDay = "";
  
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (todayIndex + i) % 7;
    const nextDayName = dayOrder[nextDayIndex];
    if (pulseDays.includes(nextDayName)) {
      nextPulseDay = nextDayName;
      break;
    }
  }
  
  // Mock data for pulse timing
  const lastPulseDate = "Wednesday";
  const nextPulseDate = nextPulseDay;

  const checkForRiskCreation = () => {
    if (pulseData.emergingRisk === "yes" && pulseData.emergingRiskDescription) {
      setRiskCreationPrompt({
        show: true,
        house: selectedHouse,
        description: pulseData.emergingRiskDescription,
        severity: "Medium",
        source: "emerging"
      });
      return true;
    }
    
    if (pulseData.riskMovement === "yes" && pulseData.riskMovementDescription) {
      setRiskCreationPrompt({
        show: true,
        house: selectedHouse,
        description: pulseData.riskMovementDescription,
        severity: "High",
        source: "emerging"
      });
      return true;
    }
    
    if (pulseData.safeguardingSignals === "yes" && pulseData.safeguardingDescription) {
      setRiskCreationPrompt({
        show: true,
        house: selectedHouse,
        description: pulseData.safeguardingDescription,
        severity: "High",
        source: "safeguarding"
      });
      return true;
    }
    
    if (pulseData.escalationRequired === "yes" && pulseData.escalationReason) {
      setRiskCreationPrompt({
        show: true,
        house: selectedHouse,
        description: pulseData.escalationReason,
        severity: "High",
        source: "escalation"
      });
      return true;
    }
    
    return false;
  };

  const confirmRiskCreation = () => {
    const newRisk = {
      id: `RISK-${Date.now()}`,
      house: riskCreationPrompt.house,
      description: riskCreationPrompt.description,
      category: "Governance Pulse Identified",
      severity: riskCreationPrompt.severity,
      dateIdentified: new Date().toISOString().split('T')[0],
      source: riskCreationPrompt.source,
      pulseDate: currentDate,
      createdBy: "Current User"
    };
    
    console.log("Creating Risk Register entry:", newRisk);
    alert(`Risk Register entry created: ${newRisk.id}`);
    
    setRiskCreationPrompt({
      show: false,
      house: "",
      description: "",
      severity: "Medium",
      source: "emerging"
    });
  };

  const handleSubmit = () => {
    const shouldPromptForRisk = checkForRiskCreation();
    
    if (!shouldPromptForRisk) {
      console.log("Governance Pulse submitted:", { house: selectedHouse, ...pulseData });
      alert("Governance Pulse submitted successfully");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-6">
          <div className="flex justify-between items-center mt-4">
            <div>
              <span className="text-gray-600">House: </span>
              <span className="font-medium text-black">{selectedHouse}</span>
            </div>
            <div>
              <span className="text-gray-600">Day: </span>
              <span className="font-medium text-black">{currentDate.split(',')[0]}</span>
            </div>
          </div>
          
          {/* House Selector - Only for non-registered-manager roles */}
          {user?.role !== 'registered-manager' && (
            <div className="mt-4">
              <select 
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(e.target.value)}
                className="px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                {houses.map(house => (
                  <option key={house.id} value={house.name}>{house.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pulse Timing Info */}
        <div className="mb-8 bg-gray-50 border-2 border-gray-300 p-4">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-gray-600">Last Pulse Completed: </span>
              <span className="font-medium text-black">{lastPulseDate}</span>
            </div>
            <div>
              <span className="text-gray-600">Next Pulse Due: </span>
              <span className="font-medium text-black">{nextPulseDate}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* 1. Emerging Risk Signals */}
          <div className="border-2 border-gray-300 p-4">
            <h3 className="font-semibold text-black mb-3">1. Emerging Risk Signals</h3>
            <p className="text-gray-600 mb-4">Have any new risks emerged since the last pulse?</p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="emergingRisk"
                  value="none"
                  checked={pulseData.emergingRisk === "none"}
                  onChange={(e) => setPulseData({...pulseData, emergingRisk: e.target.value as "none" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">No new signals</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="emergingRisk"
                  value="yes"
                  checked={pulseData.emergingRisk === "yes"}
                  onChange={(e) => setPulseData({...pulseData, emergingRisk: e.target.value as "none" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Yes – new risk identified</span>
              </label>
              
              {pulseData.emergingRisk === "yes" && (
                <textarea
                  value={pulseData.emergingRiskDescription}
                  onChange={(e) => setPulseData({...pulseData, emergingRiskDescription: e.target.value})}
                  placeholder="Short description"
                  className="w-full h-20 px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              )}
            </div>
          </div>

          {/* 2. Risk Movement */}
          <div className="border-2 border-gray-300 p-4">
            <h3 className="font-semibold text-black mb-3">2. Risk Movement</h3>
            <p className="text-gray-600 mb-4">Are any existing risks increasing or deteriorating?</p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="riskMovement"
                  value="none"
                  checked={pulseData.riskMovement === "none"}
                  onChange={(e) => setPulseData({...pulseData, riskMovement: e.target.value as "none" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">No change</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="riskMovement"
                  value="yes"
                  checked={pulseData.riskMovement === "yes"}
                  onChange={(e) => setPulseData({...pulseData, riskMovement: e.target.value as "none" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Yes – risk increasing</span>
              </label>
              
              {pulseData.riskMovement === "yes" && (
                <textarea
                  value={pulseData.riskMovementDescription}
                  onChange={(e) => setPulseData({...pulseData, riskMovementDescription: e.target.value})}
                  placeholder="Select risk"
                  className="w-full h-20 px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              )}
            </div>
          </div>

          {/* 3. Safeguarding Signals */}
          <div className="border-2 border-gray-300 p-4">
            <h3 className="font-semibold text-black mb-3">3. Safeguarding Signals</h3>
            <p className="text-gray-600 mb-4">Any safeguarding concerns or indicators this week?</p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="safeguardingSignals"
                  value="none"
                  checked={pulseData.safeguardingSignals === "none"}
                  onChange={(e) => setPulseData({...pulseData, safeguardingSignals: e.target.value as "none" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">None</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="safeguardingSignals"
                  value="yes"
                  checked={pulseData.safeguardingSignals === "yes"}
                  onChange={(e) => setPulseData({...pulseData, safeguardingSignals: e.target.value as "none" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Concern identified</span>
              </label>
              
              {pulseData.safeguardingSignals === "yes" && (
                <textarea
                  value={pulseData.safeguardingDescription}
                  onChange={(e) => setPulseData({...pulseData, safeguardingDescription: e.target.value})}
                  placeholder="Short description"
                  className="w-full h-20 px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              )}
            </div>
          </div>

          {/* 4. Operational Pressure */}
          <div className="border-2 border-gray-300 p-4">
            <h3 className="font-semibold text-black mb-3">4. Operational Pressure</h3>
            <p className="text-gray-600 mb-4">Any operational pressures affecting service stability?</p>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="operationalPressure"
                  value="staffing"
                  checked={pulseData.operationalPressure === "staffing"}
                  onChange={(e) => setPulseData({...pulseData, operationalPressure: e.target.value as any})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Staffing pressure</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="operationalPressure"
                  value="behavioural"
                  checked={pulseData.operationalPressure === "behavioural"}
                  onChange={(e) => setPulseData({...pulseData, operationalPressure: e.target.value as any})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Behavioural support challenges</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="operationalPressure"
                  value="medication"
                  checked={pulseData.operationalPressure === "medication"}
                  onChange={(e) => setPulseData({...pulseData, operationalPressure: e.target.value as any})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Medication concerns</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="operationalPressure"
                  value="environmental"
                  checked={pulseData.operationalPressure === "environmental"}
                  onChange={(e) => setPulseData({...pulseData, operationalPressure: e.target.value as any})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Environmental issue</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="operationalPressure"
                  value="none"
                  checked={pulseData.operationalPressure === "none"}
                  onChange={(e) => setPulseData({...pulseData, operationalPressure: e.target.value as any})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">None</span>
              </label>
            </div>
          </div>

          {/* 5. Escalation Required */}
          <div className="border-2 border-gray-300 p-4">
            <h3 className="font-semibold text-black mb-3">5. Escalation Required?</h3>
            <p className="text-gray-600 mb-4">Does anything require leadership attention?</p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="escalationRequired"
                  value="no"
                  checked={pulseData.escalationRequired === "no"}
                  onChange={(e) => setPulseData({...pulseData, escalationRequired: e.target.value as "no" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">No escalation required</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="escalationRequired"
                  value="yes"
                  checked={pulseData.escalationRequired === "yes"}
                  onChange={(e) => setPulseData({...pulseData, escalationRequired: e.target.value as "no" | "yes"})}
                  className="w-4 h-4 text-black"
                />
                <span className="text-black">Escalation required</span>
              </label>
              
              {pulseData.escalationRequired === "yes" && (
                <textarea
                  value={pulseData.escalationReason}
                  onChange={(e) => setPulseData({...pulseData, escalationReason: e.target.value})}
                  placeholder="Reason"
                  className="w-full h-20 px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                />
              )}
            </div>
          </div>

          {/* Additional Observations */}
          <div className="border-2 border-gray-300 p-4">
            <h3 className="font-semibold text-black mb-3">Additional Observations (Optional)</h3>
            <textarea
              value={pulseData.additionalObservations}
              onChange={(e) => setPulseData({...pulseData, additionalObservations: e.target.value})}
              placeholder="Short text field"
              className="w-full h-20 px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
            >
              Submit Governance Pulse
            </button>
          </div>
        </div>

        {/* Risk Creation Prompt Modal */}
        {riskCreationPrompt.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white border-2 border-black p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-black" />
                <h3 className="text-xl font-semibold text-black">Create Risk Register Entry?</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Risk identified in Governance Pulse. Create Risk Register entry to track?
                </p>
                
                <div className="bg-gray-50 border-2 border-gray-300 p-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">House:</span>
                      <span className="ml-2 text-black font-medium">{riskCreationPrompt.house}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Description:</span>
                      <span className="ml-2 text-black">{riskCreationPrompt.description}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Severity:</span>
                      <span className="ml-2 text-black font-medium">{riskCreationPrompt.severity}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Source:</span>
                      <span className="ml-2 text-black capitalize">{riskCreationPrompt.source}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRiskCreationPrompt({...riskCreationPrompt, show: false})}
                  className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRiskCreation}
                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Risk Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
