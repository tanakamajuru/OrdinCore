import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { AlertCircle, CheckCircle2, Clock, MapPin, ChevronRight, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface Escalation {
  id: string;
  risk_id: string;
  risk_title: string;
  risk_description: string;
  house_id: string;
  house_name: string;
  reason: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'medium' | 'high' | 'urgent' | 'critical';
  escalated_by_name: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export function EscalationLog() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEscalations();
  }, []);

  const loadEscalations = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/escalations?limit=100');
      const data = (res.data as any).data || (res.data as any) || [];
      setEscalations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load escalations', err);
      toast.error('Failed to load escalation log');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await apiClient.post(`/escalations/${id}/acknowledge`);
      toast.success('Escalation acknowledged');
      loadEscalations();
    } catch (err) {
      toast.error('Failed to acknowledge escalation');
    }
  };

  const handleResolve = async () => {
    if (!selectedEscalation || !resolutionNotes) {
      toast.error('Please provide resolution notes');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/escalations/${selectedEscalation.id}/resolve`, {
        resolution_notes: resolutionNotes
      });
      toast.success('Escalation resolved');
      setSelectedEscalation(null);
      setResolutionNotes("");
      loadEscalations();
    } catch (err) {
      toast.error('Failed to resolve escalation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedEscalation || !resolutionNotes) {
      toast.error('Please provide progress notes');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/escalations/${selectedEscalation.id}/actions`, {
        action_type: 'update',
        description: resolutionNotes
      });
      toast.success('Progress updated');
      setResolutionNotes("");
      loadEscalations();
    } catch (err) {
      toast.error('Failed to update progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-black text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-red-500" />;
      case 'acknowledged': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleSelectEscalation = async (esc: Escalation) => {
    try {
      const res = await apiClient.get(`/escalations/${esc.id}`);
      const fullData = (res.data as any).data;
      setSelectedEscalation(fullData || esc);
    } catch (err) {
      console.error('Failed to load escalation details', err);
      setSelectedEscalation(esc); // Fallback to list data
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            Escalation Management
          </h1>
          <p className="text-gray-600">Cross-site oversight of high-risk escalations requiring RI attention</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border-2 border-black p-4 mb-4 flex justify-between items-center text-sm">
              <span className="font-semibold">{escalations.filter(e => e.status !== 'resolved').length} Pending Actions</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-600"></div> Critical</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-black"></div> High</span>
              </div>
            </div>

            {escalations.length > 0 ? escalations.map((esc) => (
              <Card 
                key={esc.id} 
                className={`border-2 border-black transition-all cursor-pointer hover:shadow-lg ${selectedEscalation?.id === esc.id ? 'ring-2 ring-black bg-gray-50' : ''}`}
                onClick={() => handleSelectEscalation(esc)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold uppercase ${getPriorityColor(esc.priority)}`}>
                        {esc.priority}
                      </span>
                      <span className="text-gray-400 text-xs">|</span>
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {esc.house_name}
                      </span>
                    </div>
                    {getStatusIcon(esc.status)}
                  </div>
                  
                  <h3 className="text-lg font-bold text-black mb-2">{esc.risk_title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{esc.reason}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Escalated by <span className="font-semibold text-black">{esc.escalated_by_name}</span> • {new Date(esc.created_at).toLocaleDateString('en-GB')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-black" />
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500">All clear! No pending escalations.</h3>
              </div>
            )}
          </div>

          {/* Details & Actions Section */}
          <div className="lg:col-span-1">
            {selectedEscalation ? (
              <div className="sticky top-24 space-y-6">
                <Card className="border-2 border-black">
                  <CardHeader className="bg-black text-white">
                    <CardTitle className="text-lg">Escalation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Risk Context</label>
                      <h4 className="font-bold text-black">{selectedEscalation.risk_title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedEscalation.risk_description}</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Escalation Reason</label>
                      <div className="bg-gray-50 border-l-4 border-black p-3 text-sm italic">
                        "{selectedEscalation.reason}"
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Site</label>
                        <p className="text-sm font-medium">{selectedEscalation.house_name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Status</label>
                        <p className="text-sm font-medium capitalize">{selectedEscalation.status}</p>
                      </div>
                    </div>

                    {selectedEscalation.status === 'pending' && (
                      <Button 
                        onClick={() => handleAcknowledge(selectedEscalation.id)}
                        className="w-full bg-black text-white hover:bg-gray-800"
                      >
                        Acknowledge Receipt
                      </Button>
                    )}

                    {selectedEscalation.status !== 'resolved' && (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className="text-xs font-bold uppercase text-gray-500 block">Resolution Action</label>
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Document your oversight actions and resolution notes..."
                          className="w-full h-32 border-2 border-black p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        />
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleUpdateProgress}
                            disabled={isSubmitting || !resolutionNotes}
                            variant="outline"
                            className="flex-1 border-black hover:bg-gray-100 disabled:opacity-50"
                          >
                            Log Progress
                          </Button>
                          <Button 
                            onClick={handleResolve}
                            disabled={isSubmitting || !resolutionNotes}
                            className="flex-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark as Resolved
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedEscalation.status === 'resolved' && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-bold">Resolved</span>
                        </div>
                        <p className="italic">"{selectedEscalation.resolution_notes}"</p>
                        <p className="mt-2 text-xs opacity-75">Resolved on {new Date(selectedEscalation.resolved_at!).toLocaleDateString('en-GB')}</p>
                      </div>
                    )}

                    {/* Action History */}
                    {(selectedEscalation as any).actions && (selectedEscalation as any).actions.length > 0 && (
                      <div className="pt-6 border-t border-gray-100">
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-3">Action History</label>
                        <div className="space-y-4">
                          {(selectedEscalation as any).actions.map((action: any) => (
                            <div key={action.id} className="text-xs border-l-2 border-gray-200 pl-3 py-1">
                              <p className="font-bold text-black">{action.action_type.toUpperCase()}</p>
                              <p className="text-gray-600 mt-0.5">{action.description}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(action.created_at).toLocaleString('en-GB')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="bg-gray-50 border-2 border-black p-4 flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Communication Log</p>
                    <p className="text-sm text-gray-600 mt-1">Actions taken here will be logged in the risk history and visible to Registered Managers.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-center font-medium">Select an escalation to view details and take action</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
