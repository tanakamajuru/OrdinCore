import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
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
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [houseFilter, setHouseFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [userHouseId, setUserHouseId] = useState<string | null>(null);
  const [userHouseName, setUserHouseName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [riskSearchTerm, setRiskSearchTerm] = useState('');
  const [escalationSearchTerm, setEscalationSearchTerm] = useState('');

  const defaultOccurredAt = () => new Date().toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:MM'

  // Create incident form state
  const [incidentForm, setIncidentForm] = useState<any>({
    house_id: '', title: '', description: '', severity: 'moderate', occurred_at: defaultOccurredAt(), immediate_action: '', persons_involved: '', location: '', type: '', warning_signals: '',
    la_referral: '', cqc_notification: '', police_reference: '', other_references: '',
    is_foreseeable: '', risk_factors: '', preventive_measures: '', leadership_commentary: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [allHouses, setAllHouses] = useState<any[]>([]);
  const [allRisks, setAllRisks] = useState<any[]>([]);
  const [allEscalations, setAllEscalations] = useState<any[]>([]);

  const userString = localStorage.getItem('user') || '{}';
  const user = JSON.parse(userString);
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  const userId = user.id;
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';

  useEffect(() => { loadIncidents(); }, []);

  useEffect(() => {
    if (location.state?.fromSignal) {
      const { title, description, severity, houseId } = location.state;
      setIncidentForm((prev: any) => ({
        ...prev,
        title: location.state.title || prev.title,
        description: location.state.description || prev.description,
        immediate_action: location.state.immediate_action || prev.immediate_action,
        severity: location.state.severity || prev.severity,
        type: location.state.signalType || prev.type,
        house_id: location.state.houseId || location.state.house_id || prev.house_id,
        occurred_at: defaultOccurredAt()
      }));
      setShowCreateModal(true);
      toast.info('Pre-filling incident from signal details');
      
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadIncidents = async () => {
    try {
      // Load all houses
      const housesRes = await apiClient.get('/houses?limit=100');
      const hDataAll = (housesRes.data as any).data || (housesRes.data as any) || [];
      const housesList = Array.isArray(hDataAll) ? hDataAll : [];
      setAllHouses(housesList);

      // Load all risks for company
      const risksRes = await apiClient.get('/risks?limit=100');
      const rData = (risksRes.data as any).data || (risksRes.data as any) || [];
      const risksList = Array.isArray(rData) ? rData : (rData.risks || rData.items || []);
      setAllRisks(risksList);

      // Load all escalations for company
      const escalationsRes = await apiClient.get('/escalations?limit=100');
      const eData = (escalationsRes.data as any).data || (escalationsRes.data as any) || [];
      const escalationsList = Array.isArray(eData) ? eData : (eData.escalations || eData.items || []);
      setAllEscalations(escalationsList);

      let houseId: string | null = null;
      if (userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        const myHouse = Array.isArray(hData) ? hData[0] : hData;
        if (myHouse) { 
          houseId = myHouse.id; 
          setUserHouseId(myHouse.id); 
          setUserHouseName(myHouse.name);
          setIncidentForm((f: any) => ({ ...f, house_id: myHouse.id }));
        }
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
        status: inc.status || 'Open',
        createdAt: inc.created_at ? new Date(inc.created_at).toLocaleDateString('en-GB') : '',
        createdBy: inc.created_by_name || '',
        linkedRisks: (inc.linked_risks && Array.isArray(inc.linked_risks)) ? inc.linked_risks.length : 0,
        linkedEscalations: (inc.linked_escalations && Array.isArray(inc.linked_escalations)) ? inc.linked_escalations.length : 0,
        externalRefs: inc.external_refs || []
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
    const targetHouseId = (userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') ? (userHouseId || incidentForm.house_id) : incidentForm.house_id;
    if (!targetHouseId) { toast.error('Please select a house'); return; }
    if (!incidentForm.occurred_at) { toast.error('Please select a date'); return; }

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
        linked_risks: incidentForm.linked_risks || [],
        linked_escalations: incidentForm.linked_escalations || [],
        la_referral: incidentForm.la_referral,
        cqc_notification: incidentForm.cqc_notification,
        police_reference: incidentForm.police_reference,
        other_references: incidentForm.other_references,
        is_foreseeable: incidentForm.is_foreseeable,
        risk_factors: incidentForm.risk_factors,
        preventive_measures: incidentForm.preventive_measures,
        leadership_commentary: incidentForm.leadership_commentary,
      });
      toast.success('Incident reported successfully');
      setShowCreateModal(false);
      setIncidentForm({ 
        house_id: userHouseId || '', title: '', description: '', severity: 'moderate', occurred_at: defaultOccurredAt(), 
        immediate_action: '', persons_involved: '', location: '', type: '', warning_signals: '', linked_risks: [], linked_escalations: [],
        la_referral: '', cqc_notification: '', police_reference: '', other_references: '',
        is_foreseeable: '', risk_factors: '', preventive_measures: '', leadership_commentary: ''
      });
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
    return allHouses;
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, houseFilter, statusFilter]);

  // Reset search terms when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setRiskSearchTerm('');
      setEscalationSearchTerm('');
    }
  }, [showCreateModal]);

  const filteredRisks = allRisks.filter(risk =>
    risk.title.toLowerCase().includes(riskSearchTerm.toLowerCase())
  );

  const filteredEscalations = allEscalations.filter(esc => {
    const label = esc.reason || esc.description || esc.id || '';
    return label.toLowerCase().includes(escalationSearchTerm.toLowerCase());
  });

  const filteredIncidents = getFilteredIncidents();
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const canCreateIncident = ['REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN', 'TEAM_LEADER'].includes(userRole);
  const houses = ['All', ...allHouses.map(h => h.name)];

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under_review": return "bg-primary text-primary-foreground";
      case "resolved": return "bg-success text-success-foreground";
      case "closed": return "bg-muted text-muted-foreground";
      case "archived": return "bg-muted/50 text-muted-foreground";
      case "open": return "bg-warning text-warning-foreground";
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
              <h1 className="text-3xl  text-primary mb-2">Serious Incidents</h1>
              <p className="text-muted-foreground">
                {userRole === 'REGISTERED_MANAGER'
                  ? `Serious incident management for ${userHouseName || 'your house'}`
                  : 'Serious incident management across all services'
                }
              </p>
              {userRole === 'REGISTERED_MANAGER' && (
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
          {userRole !== 'REGISTERED_MANAGER' && (
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
          {userRole === 'REGISTERED_MANAGER' && (
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
            {paginatedIncidents.map((incident) => (
              <Card key={incident.id} className="border-2 border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 
                          className="text-lg  text-primary cursor-pointer hover:underline"
                          onClick={() => navigate(`/incidents/${incident.id}`)}
                        >
                          {incident.title}
                        </h3>
                        <span className={`px-2 py-1 rounded text-[10px]  shadow-sm ${getStatusColor(incident.status)}`}>
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
                          <span className="text-sm text-foreground ">{incident.linkedRisks} risks, {incident.linkedEscalations} escalations</span>
                        </div>
                      </div>

                      {incident.externalRefs.length > 0 && (
                        <div className="text-sm text-muted-foreground mb-3 ">
                          External Refs: <span className="text-foreground ">{incident.externalRefs.join(", ")}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground border-t border-border pt-3">
                        Created on <span className="">{incident.createdAt}</span> by <span className=" text-primary">{incident.createdBy}</span>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-border"
              >
                Previous
              </Button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <Button
                    key={num}
                    variant={currentPage === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(num)}
                    className={currentPage === num ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-border"
              >
                Next
              </Button>
            </div>
          )}

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
                <h3 className="text-xl  text-primary mb-2">No incidents found</h3>
                <p>
                  {userRole === 'REGISTERED_MANAGER'
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
            <div className="fixed inset-0 backdrop-blur-sm bg-primary/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border-2 border-border shadow-2xl rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-card pb-4 border-b border-border z-10">
                  <h2 className="text-2xl  text-primary">Report Serious Incident</h2>
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
                    <h3 className=" text-primary mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">1</span>
                      Incident Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="incident-title" className="block text-sm  text-foreground mb-1">Incident Title *</label>
                        <Input
                          id="incident-title"
                          value={incidentForm.title}
                          onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
                          className="border-border bg-background focus:ring-primary rounded-lg"
                          placeholder="Brief title for this incident"
                        />
                      </div>
                      <div>
                        <label htmlFor="incident-house" className="block text-sm  text-foreground mb-1">House/Service *</label>
                        <select 
                          id="incident-house"
                          value={incidentForm.house_id} 
                          onChange={(e) => setIncidentForm({ ...incidentForm, house_id: e.target.value })} 
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                          {getAvailableHouses().map(house => (
                            <option key={house.id} value={house.id}>
                              {house.name}
                            </option>
                          ))}
                        </select>
                        {userRole === 'REGISTERED_MANAGER' && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 ml-1 ">Only your assigned house is available</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="incident-date" className="block text-sm  text-foreground mb-1">Incident Date & Time *</label>
                        <Input
                          id="incident-date"
                          type="datetime-local"
                          value={incidentForm.occurred_at}
                          onChange={(e) => setIncidentForm({ ...incidentForm, occurred_at: e.target.value })}
                          className="border-border bg-background focus:ring-primary rounded-lg"
                        />
                      </div>
                      <div>
                        <label htmlFor="incident-type" className="block text-sm  text-foreground mb-1">Incident Type *</label>
                        <select 
                          id="incident-type"
                          value={incidentForm.type}
                          onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })} 
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
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
                        <label htmlFor="severity-level" className="block text-sm  text-foreground mb-1">Severity Level *</label>
                        <select
                          id="severity-level"
                          value={incidentForm.severity}
                          onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-destructive focus:outline-none text-sm  text-destructive"
                        >
                          <option value="">Select severity...</option>
                          <option value="Critical">Critical</option>
                          <option value="High">Serious</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Low">Minor</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Governance Context */}
                  <div className="pb-6 border-b border-border mb-6">
                    <h3 className=" text-primary mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">2</span>
                      Governance Context
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="warning-signals" className="block text-sm  text-foreground mb-1">Were warning signals present before this incident? *</label>
                        <select 
                          id="warning-signals"
                          onChange={(e) => setIncidentForm({ ...incidentForm, warning_signals: e.target.value })} 
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes - risks were identified</option>
                          <option value="no">No - incident was unexpected</option>
                          <option value="partial">Partial - some indicators present</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="risk-link" className="block text-sm  text-foreground mb-1">Link to Existing Risk Register Items</label>
                        <input
                          id="risk-link"
                          type="text"
                          placeholder="Search risks..."
                          value={riskSearchTerm}
                          onChange={(e) => setRiskSearchTerm(e.target.value)}
                          className="w-full mb-2 px-3 py-2 border-2 border-border rounded bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <select 
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm h-32" 
                          multiple
                          value={incidentForm.linked_risks || []}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setIncidentForm(prev => ({ ...prev, linked_risks: values }));
                          }}
                        >
                          {filteredRisks.map(risk => (
                            <option key={risk.id} value={risk.id}>
                              {risk.title || risk.id.slice(0,8).toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground mt-1.5 ml-1 ">Select all relevant risk items (hold Ctrl/Cmd to select multiple)</p>
                      </div>
                      <div>
                        <label htmlFor="escalation-link" className="block text-sm  text-foreground mb-1">Link to Escalations</label>
                        <input
                          id="escalation-link"
                          type="text"
                          placeholder="Search escalations..."
                          value={escalationSearchTerm}
                          onChange={(e) => setEscalationSearchTerm(e.target.value)}
                          className="w-full mb-2 px-3 py-2 border-2 border-border rounded bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <select 
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm h-32" 
                          multiple
                          value={incidentForm.linked_escalations || []}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setIncidentForm(prev => ({ ...prev, linked_escalations: values }));
                          }}
                        >
                          {filteredEscalations.map(esc => {
                            const display = esc.reason || esc.description || `Escalation ${esc.id.slice(0,8)}`;
                            return (
                              <option key={esc.id} value={esc.id}>
                                {display}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Incident Details */}
                  <div className="border-b border-border pb-6">
                    <h3 className=" text-foreground mb-4">Incident Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="incident-description" className="block text-sm  text-foreground mb-1">Incident Description *</label>
                        <textarea
                          id="incident-description"
                          value={incidentForm.description}
                          onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                          className="w-full border-2 border-border rounded p-2 h-24 resize-none"
                          placeholder="Provide detailed description of what happened..."
                        />
                      </div>
                      <div>
                        <label htmlFor="immediate-actions" className="block text-sm  text-foreground mb-1">Immediate Actions Taken</label>
                        <textarea
                          id="immediate-actions"
                          value={incidentForm.immediate_action}
                          onChange={(e) => setIncidentForm({ ...incidentForm, immediate_action: e.target.value })}
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Describe immediate response and actions taken..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">People Involved</label>
                        <Input
                          value={incidentForm.persons_involved}
                          onChange={(e) => setIncidentForm({ ...incidentForm, persons_involved: e.target.value })}
                          placeholder="Names of residents, staff, or others involved (if applicable)"
                          className="border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Place of occurence</label>
                        <Input
                          value={incidentForm.location}
                          onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                          placeholder="Location of the incident"
                          className="border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* External References */}
                  <div className="border-b border-border pb-6">
                    <h3 className=" text-foreground mb-4">External References</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Local Authority Referral</label>
                        <Input
                          placeholder="LA safeguarding reference number (if applicable)"
                          className="border-border"
                          value={incidentForm.la_referral}
                          onChange={(e) => setIncidentForm({ ...incidentForm, la_referral: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">CQC Notification</label>
                        <Input
                          placeholder="CQC notification reference (if applicable)"
                          className="border-border"
                          value={incidentForm.cqc_notification}
                          onChange={(e) => setIncidentForm({ ...incidentForm, cqc_notification: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Police Reference</label>
                        <Input
                          placeholder="Police reference number (if applicable)"
                          className="border-border"
                          value={incidentForm.police_reference}
                          onChange={(e) => setIncidentForm({ ...incidentForm, police_reference: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Other External References</label>
                        <Input
                          placeholder="Any other external reference numbers"
                          className="border-border"
                          value={incidentForm.other_references}
                          onChange={(e) => setIncidentForm({ ...incidentForm, other_references: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leadership Assessment */}
                  <div className="pb-6">
                    <h3 className=" text-foreground mb-4">Leadership Assessment</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="is-foreseeable" className="block text-sm  text-foreground mb-1">Was this incident foreseeable?</label>
                        <select 
                          id="is-foreseeable"
                          className="w-full border-2 border-border rounded p-2"
                          value={incidentForm.is_foreseeable}
                          onChange={(e) => setIncidentForm({ ...incidentForm, is_foreseeable: e.target.value })}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes - risks were known</option>
                          <option value="no">No - unexpected event</option>
                          <option value="partially">Partially foreseeable</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="risk-factors" className="block text-sm  text-foreground mb-1">Related Risk Factors</label>
                        <textarea
                          id="risk-factors"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Any risk factors that contributed to this incident..."
                          value={incidentForm.risk_factors}
                          onChange={(e) => setIncidentForm({ ...incidentForm, risk_factors: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="preventive-measures" className="block text-sm  text-foreground mb-1">Preventive Measures Needed</label>
                        <textarea
                          id="preventive-measures"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Measures needed to prevent similar incidents..."
                          value={incidentForm.preventive_measures}
                          onChange={(e) => setIncidentForm({ ...incidentForm, preventive_measures: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="leadership-commentary" className="block text-sm  text-foreground mb-1">Leadership Commentary</label>
                        <textarea
                          id="leadership-commentary"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Leadership perspective on the incident and implications..."
                          value={incidentForm.leadership_commentary}
                          onChange={(e) => setIncidentForm({ ...incidentForm, leadership_commentary: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reporting Information */}
                  <div className="pb-6">
                    <h3 className=" text-foreground mb-4">Reporting Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Your Name *</label>
                        <Input
                          placeholder="Your full name"
                          className="border-border bg-muted cursor-not-allowed"
                          value={userName}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Your Role *</label>
                        <Input
                          placeholder="Your role"
                          className="border-border bg-muted cursor-not-allowed"
                          value={userRole.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="border-border text-foreground hover:bg-muted flex-1 py-6 rounded-lg "
                  >
                    Discard Changes
                  </Button>
                  <Button
                    onClick={handleCreateIncident}
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 py-6 rounded-lg  shadow-lg disabled:opacity-50"
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
