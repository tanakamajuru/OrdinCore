import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, Calendar, MapPin, AlertTriangle, Eye, FileText, Filter, X, Ambulance } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface IncidentCase {
  id: string;
  houseId: string;
  houseName: string;
  incidentDate: string;
  incidentType: string;
  status: "under-review" | "closed" | "archived";
  createdAt: string;
  createdBy: string;
  linkedRisks: number;
  linkedEscalations: number;
  externalRefs: string[];
}

const mockIncidents: IncidentCase[] = [
  {
    id: "INC-001",
    houseId: "oakwood",
    houseName: "Oakwood",
    incidentDate: "2024-01-18",
    incidentType: "Safeguarding",
    status: "under-review",
    createdAt: "2024-01-18",
    createdBy: "Sarah Johnson",
    linkedRisks: 3,
    linkedEscalations: 2,
    externalRefs: ["LA-SAF-2024-001"]
  },
  {
    id: "INC-002", 
    houseId: "riverside",
    houseName: "Riverside",
    incidentDate: "2024-01-22",
    incidentType: "Medication Error",
    status: "under-review",
    createdAt: "2024-01-22",
    createdBy: "Mike Chen",
    linkedRisks: 2,
    linkedEscalations: 1,
    externalRefs: ["CQC-MED-2024-002"]
  },
  {
    id: "INC-003",
    houseId: "maple-grove",
    houseName: "Maple Grove",
    incidentDate: "2024-01-25",
    incidentType: "Behavioral Incident",
    status: "closed",
    createdAt: "2024-01-25",
    createdBy: "Emma Davis",
    linkedRisks: 1,
    linkedEscalations: 1,
    externalRefs: ["LA-BEH-2024-003"]
  },
  {
    id: "INC-004",
    houseId: "sunset-villa",
    houseName: "Sunset Villa",
    incidentDate: "2024-02-01",
    incidentType: "Environmental Hazard",
    status: "under-review",
    createdAt: "2024-02-01",
    createdBy: "Tom Wilson",
    linkedRisks: 2,
    linkedEscalations: 0,
    externalRefs: ["CQC-ENV-2024-004"]
  },
  {
    id: "INC-005",
    houseId: "birchwood",
    houseName: "Birchwood",
    incidentDate: "2024-02-05",
    incidentType: "Resident Injury",
    status: "under-review",
    createdAt: "2024-02-05",
    createdBy: "Lisa Anderson",
    linkedRisks: 1,
    linkedEscalations: 1,
    externalRefs: ["LA-INJ-2024-005"]
  }
];

export function IncidentCaseHub() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentCase[]>(mockIncidents);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [houseFilter, setHouseFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Get current user role and assigned house
  const userRole = localStorage.getItem('userRole') || 'registered-manager'; // Default to RM for testing
  const userHouse = localStorage.getItem('userHouse') || 'oakwood'; // RM assigned house

  // Define houses like risk register
  const houses = ["All", "Oakwood", "Riverside", "Maple Grove", "Sunset Villa", "Birchwood"];

  // Role-based filtering
  const getFilteredIncidents = () => {
    let roleFilteredIncidents = incidents;
    
    // Registered Managers can only see incidents for their assigned house
    if (userRole === 'registered-manager') {
      const userHouseName = houses.find(house => house.toLowerCase().replace(' ', '-') === userHouse) || userHouse;
      roleFilteredIncidents = incidents.filter(incident => incident.houseName === userHouseName);
    }
    // Responsible Individuals and Directors can see all incidents
    
    // Apply additional filters for RI and Director
    if (userRole !== 'registered-manager') {
      if (houseFilter !== "All") {
        roleFilteredIncidents = roleFilteredIncidents.filter(incident => incident.houseName === houseFilter);
      }
      if (statusFilter !== "All") {
        roleFilteredIncidents = roleFilteredIncidents.filter(incident => incident.status === statusFilter);
      }
    }
    
    // Apply search filter
    return roleFilteredIncidents.filter(incident =>
      incident.houseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.incidentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredIncidents = getFilteredIncidents();

  // Role-based permissions for creating incidents
  const canCreateIncident = userRole === 'registered-manager' || userRole === 'responsible-individual' || userRole === 'director';
  
  // Debug: Log current role to console
  console.log('Current userRole:', userRole);
  console.log('Can create incident:', canCreateIncident);
  console.log('Filtered incidents count:', filteredIncidents.length);
  
  // Get available houses for incident creation based on role
  const getAvailableHouses = () => {
    if (userRole === 'registered-manager') {
      // RM can only create incidents for their assigned house
      const userHouseName = houses.find(house => house.toLowerCase().replace(' ', '-') === userHouse) || userHouse;
      return [
        { id: userHouse, name: userHouseName }
      ];
    } else {
      // RI and Director can create incidents for any house
      return [
        { id: 'oakwood', name: 'Oakwood' },
        { id: 'riverside', name: 'Riverside' },
        { id: 'maple-grove', name: 'Maple Grove' },
        { id: 'sunset-villa', name: 'Sunset Villa' },
        { id: 'birchwood', name: 'Birchwood' }
      ];
    }
  };

  // Get unique houses for filter dropdown
  const getUniqueHouses = () => {
    const houseNames = Array.from(new Set(incidents.map(incident => incident.houseName)));
    return houseNames.map(houseName => ({
      id: houseName.toLowerCase().replace(' ', '-'),
      name: houseName
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under-review": return "bg-black text-white";
      case "closed": return "bg-gray-200 text-gray-800";
      case "archived": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <>
        <RoleBasedNavigation />
        <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Serious Incidents</h1>
            <p className="text-gray-600">
              {userRole === 'registered-manager' 
                ? `Serious incident management for ${houses.find(house => house.toLowerCase().replace(' ', '-') === userHouse) || userHouse}`
                : 'Serious incident management across all services'
              }
            </p>
            {userRole === 'registered-manager' && (
              <p className="text-sm text-gray-500 mt-1">Showing incidents for your assigned house only</p>
            )}
          </div>
          {canCreateIncident && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Serious Incident
            </Button>
          )}
        </div>

        {/* Filters */}
        {userRole !== 'registered-manager' && (
          <Card className="border-2 border-black mb-6">
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search incidents by house, type, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-black"
                  />
                </div>
                <select
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-black rounded"
                >
                  {houses.map(house => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-black rounded"
                >
                  <option value="All">All Statuses</option>
                  <option value="under-review">Under Review</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
                <Button variant="outline" className="border-black hover:bg-black hover:text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search only for RM */}
        {userRole === 'registered-manager' && (
          <Card className="border-2 border-black mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search incidents by type or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-black"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incident List */}
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <Card key={incident.id} className="border-2 border-black">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-black">{incident.id}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                        {incident.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{incident.houseName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{incident.incidentDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{incident.incidentType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{incident.linkedRisks} risks, {incident.linkedEscalations} escalations</span>
                      </div>
                    </div>

                    {incident.externalRefs.length > 0 && (
                      <div className="text-sm text-gray-600 mb-3">
                        External References: {incident.externalRefs.join(", ")}
                      </div>
                    )}

                    <div className="text-sm text-gray-500">
                      Created on {incident.createdAt} by {incident.createdBy}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      className="border-black hover:bg-black hover:text-white"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/incidents/${incident.id}/timeline`)}
                      className="border-black hover:bg-black hover:text-white"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Timeline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Incident Button at Bottom */}
        {canCreateIncident && filteredIncidents.length > 0 && (
          <div className="mt-8 text-center">
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white hover:bg-gray-800 px-8 py-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Serious Incident
            </Button>
          </div>
        )}

        {/* Empty State with Add Button */}
        {canCreateIncident && filteredIncidents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-6">
              <Ambulance className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-black mb-2">No incidents found</h3>
              <p>
                {userRole === 'registered-manager' 
                  ? 'There are no incidents for your assigned house.'
                  : 'No incidents match your current filters.'
                }
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Serious Incident
            </Button>
          </div>
        )}

        {/* Create Serious Incident Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white border-2 border-black rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-black">Report Serious Incident</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="border-black hover:bg-black hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Incident Summary */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="font-semibold text-black mb-4">Incident Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">House/Service *</label>
                      <select className="w-full border-2 border-black rounded p-2">
                        {getAvailableHouses().map(house => (
                          <option key={house.id} value={house.id}>
                            {house.name}
                          </option>
                        ))}
                      </select>
                      {userRole === 'registered-manager' && (
                        <p className="text-xs text-gray-500 mt-1">Only your assigned house is available</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Incident Date & Time *</label>
                      <Input type="datetime-local" className="border-black" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Incident Type *</label>
                      <select className="w-full border-2 border-black rounded p-2">
                        <option value="">Select type...</option>
                        <option value="safeguarding">Safeguarding</option>
                        <option value="medication">Medication Error</option>
                        <option value="behavioral">Behavioral Incident</option>
                        <option value="environmental">Environmental Hazard</option>
                        <option value="staff">Staff Misconduct</option>
                        <option value="injury">Resident Injury</option>
                        <option value="absconding">Absconding</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Severity Level *</label>
                      <select className="w-full border-2 border-black rounded p-2">
                        <option value="">Select severity...</option>
                        <option value="critical">Critical</option>
                        <option value="serious">Serious</option>
                        <option value="moderate">Moderate</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Governance Context */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="font-semibold text-black mb-4">Governance Context</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Were warning signals present before this incident? *</label>
                      <select className="w-full border-2 border-black rounded p-2">
                        <option value="">Select...</option>
                        <option value="yes">Yes - risks were identified</option>
                        <option value="no">No - incident was unexpected</option>
                        <option value="partial">Partial - some indicators present</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Link to Existing Risk Register Items</label>
                      <select className="w-full border-2 border-black rounded p-2" multiple>
                        <option value="risk-001">Risk-001: Medication administration errors</option>
                        <option value="risk-002">Risk-002: Fire safety system failure</option>
                        <option value="risk-003">Risk-003: Critical staffing shortage</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Select all relevant risk items (hold Ctrl/Cmd to select multiple)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Link to Escalations</label>
                      <select className="w-full border-2 border-black rounded p-2" multiple>
                        <option value="esc-001">ESC-001: Medication risk escalation</option>
                        <option value="esc-002">ESC-002: Staffing pressure escalation</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Select relevant escalations (hold Ctrl/Cmd to select multiple)</p>
                    </div>
                  </div>
                </div>

                {/* Incident Details */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="font-semibold text-black mb-4">Incident Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Incident Description *</label>
                      <textarea 
                        className="w-full border-2 border-black rounded p-2 h-24 resize-none"
                        placeholder="Provide detailed description of what happened..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Immediate Actions Taken</label>
                      <textarea 
                        className="w-full border-2 border-black rounded p-2 h-20 resize-none"
                        placeholder="Describe immediate response and actions taken..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">People Involved</label>
                      <Input 
                        placeholder="Names of residents, staff, or others involved (if applicable)"
                        className="border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Witnesses</label>
                      <Input 
                        placeholder="Names of any witnesses to the incident"
                        className="border-black"
                      />
                    </div>
                  </div>
                </div>

                {/* External References */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="font-semibold text-black mb-4">External References</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Local Authority Referral</label>
                      <Input 
                        placeholder="LA safeguarding reference number (if applicable)"
                        className="border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">CQC Notification</label>
                      <Input 
                        placeholder="CQC notification reference (if applicable)"
                        className="border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Police Reference</label>
                      <Input 
                        placeholder="Police reference number (if applicable)"
                        className="border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Other External References</label>
                      <Input 
                        placeholder="Any other external reference numbers"
                        className="border-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Leadership Assessment */}
                <div className="pb-6">
                  <h3 className="font-semibold text-black mb-4">Leadership Assessment</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Was this incident foreseeable?</label>
                      <select className="w-full border-2 border-black rounded p-2">
                        <option value="">Select...</option>
                        <option value="yes">Yes - risks were known</option>
                        <option value="no">No - unexpected event</option>
                        <option value="partially">Partially foreseeable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Related Risk Factors</label>
                      <textarea 
                        className="w-full border-2 border-black rounded p-2 h-20 resize-none"
                        placeholder="Any risk factors that contributed to this incident..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Preventive Measures Needed</label>
                      <textarea 
                        className="w-full border-2 border-black rounded p-2 h-20 resize-none"
                        placeholder="Measures needed to prevent similar incidents..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Leadership Commentary</label>
                      <textarea 
                        className="w-full border-2 border-black rounded p-2 h-20 resize-none"
                        placeholder="Leadership perspective on the incident and implications..."
                      />
                    </div>
                  </div>
                </div>

                {/* Reporting Information */}
                <div className="pb-6">
                  <h3 className="font-semibold text-black mb-4">Reporting Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Your Name *</label>
                      <Input 
                        placeholder="Your full name"
                        className="border-black"
                        defaultValue={userRole === 'registered-manager' ? 'Current RM' : 'Current User'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Your Role *</label>
                      <Input 
                        placeholder="Your role"
                        className="border-black"
                        defaultValue={userRole}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-black hover:bg-black hover:text-white flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Handle creation logic
                    setShowCreateModal(false);
                  }}
                  className="bg-black text-white hover:bg-gray-800 flex-1"
                >
                  Submit Serious Incident
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </>
    </div>
  );
}
