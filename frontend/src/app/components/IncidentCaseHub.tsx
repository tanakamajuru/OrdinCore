import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, Calendar, MapPin, AlertTriangle, Filter, X, Ambulance } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface IncidentCase {
  id: string;
  houseId: string;
  houseName: string;
  title: string;
  description: string;
  incidentDate: string;
  incidentType: string;
  status: "under-review" | "closed" | "archived";
  createdAt: string;
  createdBy: string;
  linkedRisks: number;
  linkedEscalations: number;
  externalRefs: string[];
}


export function IncidentCaseHub() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [houseFilter, setHouseFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [userHouseId, setUserHouseId] = useState<string | null>(null);
  const [userHouseName, setUserHouseName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create incident form state
  const [incidentForm, setIncidentForm] = useState({
    house_id: '', title: '', description: '', severity: 'moderate', occurred_at: '', immediate_action: '', persons_involved: '', location: ''
  });

  const [allHouses, setAllHouses] = useState<any[]>([]);

  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id;

  useEffect(() => { loadIncidents(); }, []);

  const loadIncidents = async () => {
    try {
      // Load all houses
      const housesRes = await apiClient.get('/houses?limit=100');
      const hDataAll = (housesRes.data as any).data || (housesRes.data as any) || [];
      const housesList = Array.isArray(hDataAll) ? hDataAll : [];
      setAllHouses(housesList);

      let houseId: string | null = null;
      if (userRole === 'REGISTERED_MANAGER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        const myHouse = Array.isArray(hData) ? hData[0] : hData;
        if (myHouse) { houseId = myHouse.id; setUserHouseId(myHouse.id); setUserHouseName(myHouse.name); }
      }
      const params = houseId ? `?house_id=${houseId}&limit=100` : '?limit=100';
      const res = await apiClient.get(`/incidents${params}`);
      const data = (res.data as any).data || (res.data as any) || {};
      const rawIncs = data.incidents || data.items || (Array.isArray(data) ? data : []);
      const mapped: IncidentCase[] = rawIncs.map((inc: any) => ({
        id: inc.id,
        houseId: inc.house_id,
        houseName: inc.house_name || housesList.find((h: any) => h.id === inc.house_id)?.name || userHouseName || 'Unknown',
        title: inc.title || 'Untitled Incident',
        description: inc.description || '',
        incidentDate: inc.occurred_at ? new Date(inc.occurred_at).toLocaleDateString('en-GB') : '',
        incidentType: inc.category_name || 'Incident',
        status: inc.status === 'under_review' ? 'under-review' : (inc.status || 'open') as any,
        createdAt: inc.created_at ? new Date(inc.created_at).toLocaleDateString('en-GB') : '',
        createdBy: inc.created_by_name || '',
        linkedRisks: 0, linkedEscalations: 0, externalRefs: []
      }));
      setIncidents(mapped);
    } catch (err) {
      console.error('Failed to load incidents', err);
      toast.error('Failed to load incidents');
    } finally { setIsLoading(false); }
  };

  const handleCreateIncident = async () => {
    if (!incidentForm.title || !incidentForm.description || !incidentForm.occurred_at) {
      toast.error('Please fill in title, description and date'); return;
    }
    const targetHouseId = userRole === 'REGISTERED_MANAGER' ? userHouseId : incidentForm.house_id;
    if (!targetHouseId) { toast.error('Please select a house'); return; }
    
    setIsSubmitting(true);
    try {
      await apiClient.post('/incidents', {
        house_id: targetHouseId,
        title: incidentForm.title,
        description: incidentForm.description,
        severity: incidentForm.severity,
        occurred_at: new Date(incidentForm.occurred_at).toISOString(),
        location: incidentForm.location,
        immediate_action: incidentForm.immediate_action,
        persons_involved: incidentForm.persons_involved ? [incidentForm.persons_involved] : [],
        follow_up_required: true,
      });
      toast.success('Incident reported successfully');
      setShowCreateModal(false);
      setIncidentForm({ house_id: '', title: '', description: '', severity: 'moderate', occurred_at: '', immediate_action: '', persons_involved: '', location: '' });
      loadIncidents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to report incident'); }
    finally { setIsSubmitting(false); }
  };

  // Role-based filtering
  const getFilteredIncidents = () => {
    let filtered = incidents;
    if (houseFilter !== 'All') filtered = filtered.filter(i => i.houseName === houseFilter);
    if (statusFilter !== 'All') filtered = filtered.filter(i => i.status === statusFilter);
    if (searchTerm) filtered = filtered.filter(i =>
      i.houseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.incidentType.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered;
  };

  const getAvailableHouses = () => {
    if (userHouseName) return [{ id: userHouseId || '', name: userHouseName }];
    return [];
  };

  const filteredIncidents = getFilteredIncidents();
  const canCreateIncident = ['REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN'].includes(userRole);
  const houses = ['All', ...allHouses.map(h => h.name)];

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under-review": return "bg-primary text-primary-foreground";
      case "closed": return "bg-muted text-muted-foreground";
      case "archived": return "bg-muted/50 text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <>
        <RoleBasedNavigation />
        <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Serious Incidents</h1>
            <p className="text-muted-foreground">
              {userRole === 'REGISTERED_MANAGER' 
                ? `Serious incident management for ${userHouseName || 'your house'}`
                : 'Serious incident management across all services'
              }
            </p>
            {userRole === 'registered-manager' && (
              <p className="text-sm text-muted-foreground mt-1">Showing incidents for your assigned house only</p>
            )}
          </div>
          {canCreateIncident && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Serious Incident
            </Button>
          )}
        </div>

        {/* Filters */}
        {userRole !== 'registered-manager' && (
          <Card className="border-2 border-border mb-6 bg-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search incidents by title, description, house, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border bg-background focus:ring-primary"
                  />
                </div>
                <select
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  className="px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="under-review">Under Review</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
                <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search only for RM */}
        {userRole === 'registered-manager' && (
          <Card className="border-2 border-border mb-6 bg-card shadow-sm">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search incidents by title, description, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border bg-background"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incident List */}
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <Card key={incident.id} className="border-2 border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-primary">{incident.title}</h3>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold shadow-sm ${getStatusColor(incident.status)}`}>
                        {incident.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    {incident.description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{incident.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">{incident.houseName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">{incident.incidentDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-sm text-foreground">{incident.incidentType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ambulance className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-foreground font-medium">{incident.linkedRisks} risks, {incident.linkedEscalations} escalations</span>
                      </div>
                    </div>

                    {incident.externalRefs.length > 0 && (
                      <div className="text-sm text-muted-foreground mb-3 italic">
                        External Refs: <span className="text-foreground font-medium">{incident.externalRefs.join(", ")}</span>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground border-t border-border pt-3">
                      Created on <span className="font-semibold">{incident.createdAt}</span> by <span className="font-semibold text-primary">{incident.createdBy}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/incidents/${incident.id}/timeline`)}
                      className="border-primary text-primary hover:bg-primary/10 shadow-sm"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      View Governance Timeline
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Serious Incident
            </Button>
          </div>
        )}

        {/* Empty State with Add Button */}
        {canCreateIncident && filteredIncidents.length === 0 && (
          <div className="text-center py-12 bg-card border-2 border-dashed border-border rounded-lg shadow-inner">
            <div className="text-muted-foreground mb-6">
              <Ambulance className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-semibold text-primary mb-2">No incidents found</h3>
              <p>
                {userRole === 'registered-manager' 
                  ? 'There are no incidents for your assigned house.'
                  : 'No incidents match your current filters.'
                }
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Serious Incident
            </Button>
          </div>
        )}

        {/* Create Serious Incident Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border-2 border-border shadow-2xl rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-card pb-4 border-b border-border z-10">
                <h2 className="text-2xl font-bold text-primary">Report Serious Incident</h2>
                <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setShowCreateModal(false)}
                   className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Incident Summary */}
                <div className="pb-6">
                  <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">1</span>
                    Incident Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">House/Service *</label>
                      <select className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm">
                        {getAvailableHouses().map(house => (
                          <option key={house.id} value={house.id}>
                            {house.name}
                          </option>
                        ))}
                      </select>
                      {userRole === 'registered-manager' && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 ml-1 italic">Only your assigned house is available</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Incident Date & Time *</label>
                      <Input 
                        type="datetime-local" 
                        value={incidentForm.occurred_at}
                        onChange={(e) => setIncidentForm({...incidentForm, occurred_at: e.target.value})}
                        className="border-border bg-background focus:ring-primary rounded-lg" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Incident Type *</label>
                      <select className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm">
                        <option value="">Select type...</option>
                        <option value="safeguarding">Safeguarding</option>
                        <option value="medication">Medication Error</option>
                        <option value="behavioral">Behavioral Incident</option>
                        <option value="environmental">Environmental Hazard</option>
                        <option value="staff">Staff Misconduct</option>
                        <option value="injury">Resident Incident</option>
                        <option value="absconding">Absconding</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Severity Level *</label>
                      <select 
                        value={incidentForm.severity}
                        onChange={(e) => setIncidentForm({...incidentForm, severity: e.target.value})}
                        className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-destructive focus:outline-none text-sm font-bold text-destructive"
                      >
                        <option value="">Select severity...</option>
                        <option value="critical">CRITICAL</option>
                        <option value="serious">SERIOUS</option>
                        <option value="moderate">MODERATE</option>
                        <option value="low">LOW</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Governance Context */}
                <div className="pb-6 border-b border-border mb-6">
                  <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">2</span>
                    Governance Context
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Were warning signals present before this incident? *</label>
                      <select className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm">
                        <option value="">Select...</option>
                        <option value="yes">Yes - risks were identified</option>
                        <option value="no">No - incident was unexpected</option>
                        <option value="partial">Partial - some indicators present</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Link to Existing Risk Register Items</label>
                      <select className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm h-24" multiple>
                        <option value="risk-001">Risk-001: Medication administration errors</option>
                        <option value="risk-002">Risk-002: Fire safety system failure</option>
                        <option value="risk-003">Risk-003: Critical staffing shortage</option>
                      </select>
                      <p className="text-[11px] text-muted-foreground mt-1.5 ml-1 italic">Select all relevant risk items (hold Ctrl/Cmd to select multiple)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">Link to Escalations</label>
                      <select className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm h-16" multiple>
                        <option value="esc-001">ESC-001: Medication risk escalation</option>
                        <option value="esc-002">ESC-002: Staffing pressure escalation</option>
                      </select>
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
                        value={incidentForm.description}
                        onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
                        className="w-full border-2 border-black rounded p-2 h-24 resize-none"
                        placeholder="Provide detailed description of what happened..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Immediate Actions Taken</label>
                      <textarea 
                        value={incidentForm.immediate_action}
                        onChange={(e) => setIncidentForm({...incidentForm, immediate_action: e.target.value})}
                        className="w-full border-2 border-black rounded p-2 h-20 resize-none"
                        placeholder="Describe immediate response and actions taken..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">People Involved</label>
                      <Input 
                        value={incidentForm.persons_involved}
                        onChange={(e) => setIncidentForm({...incidentForm, persons_involved: e.target.value})}
                        placeholder="Names of residents, staff, or others involved (if applicable)"
                        className="border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">Witnesses</label>
                      <Input 
                        value={incidentForm.location}
                        onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})}
                        placeholder="Location of the incident"
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

              <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-border text-foreground hover:bg-muted flex-1 py-6 rounded-lg font-bold"
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleCreateIncident}
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 py-6 rounded-lg font-bold shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Reporting...' : 'Submit Serious Incident'}
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
