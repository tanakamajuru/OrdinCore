import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { AlertCircle, CheckCircle2, Clock, MapPin, ChevronRight, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

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
      const data = (res as any).data || res || [];
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
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'urgent': return 'bg-destructive/80 text-destructive-foreground';
      case 'high': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'pending': return <Clock className="w-5 h-5 text-destructive" />;
      case 'acknowledged': return <AlertCircle className="w-5 h-5 text-primary" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleSelectEscalation = async (esc: Escalation) => {
    try {
      const res = await apiClient.get(`/escalations/${esc.id}`);
      const fullData = (res as any).data || res;
      setSelectedEscalation(fullData || esc);
    } catch (err) {
      console.error('Failed to load escalation details', err);
      setSelectedEscalation(esc); // Fallback to list data
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-8">
          <h1 className="text-3xl  text-primary mb-2 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            Escalation Management
          </h1>
          <p className="text-muted-foreground">Cross-site oversight of high-risk escalations requiring RI attention</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border-2 border-border p-4 mb-4 flex justify-between items-center text-sm shadow-sm">
              <span className=" text-foreground">{escalations.filter(e => e.status !== 'resolved').length} Pending Actions</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive"></div> Critical</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> High</span>
              </div>
            </div>

            {escalations.length > 0 ? escalations.map((esc) => (
              <Card 
                key={esc.id} 
                className={`border-2 border-border transition-all cursor-pointer hover:shadow-lg ${selectedEscalation?.id === esc.id ? 'ring-2 ring-primary bg-muted/30' : 'bg-card'}`}
                onClick={() => handleSelectEscalation(esc)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs  uppercase ${getPriorityColor(esc.priority)}`}>
                        {esc.priority}
                      </span>
                      <span className="text-gray-400 text-xs">|</span>
                      <span className="text-xs  text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {esc.house_name}
                      </span>
                    </div>
                    {getStatusIcon(esc.status)}
                  </div>
                  
                  <h3 className="text-lg  text-primary mb-2">{esc.risk_title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{esc.reason}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Escalated by <span className=" text-primary">{esc.escalated_by_name}</span> • {new Date(esc.created_at).toLocaleDateString('en-GB')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-20 bg-muted/30 border-2 border-dashed border-border">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg  text-muted-foreground">All clear! No pending escalations.</h3>
              </div>
            )}
          </div>

          {/* Details & Actions Section */}
          <div className="lg:col-span-1">
            {selectedEscalation ? (
              <div className="sticky top-24 space-y-6">
                <Card className="border-2 border-border shadow-xl">
                  <CardHeader className="bg-primary text-primary-foreground">
                    <CardTitle className="text-lg">Escalation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <label className="text-xs  uppercase text-muted-foreground block mb-1">Risk Context</label>
                      <h4 className=" text-primary">{selectedEscalation.risk_title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{selectedEscalation.risk_description}</p>
                    </div>

                    <div>
                      <label className="text-xs  uppercase text-muted-foreground block mb-1">Escalation Reason</label>
                      <div className="bg-muted border-l-4 border-primary p-3 text-sm  text-foreground">
                        "{selectedEscalation.reason}"
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs  uppercase text-muted-foreground block mb-1">Site</label>
                        <p className="text-sm  text-foreground">{selectedEscalation.house_name}</p>
                      </div>
                      <div>
                        <label className="text-xs  uppercase text-muted-foreground block mb-1">Status</label>
                        <p className="text-sm  capitalize text-foreground">{selectedEscalation.status}</p>
                      </div>
                    </div>

                    {selectedEscalation.status === 'pending' && (
                      <Button 
                        onClick={() => handleAcknowledge(selectedEscalation.id)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Acknowledge Receipt
                      </Button>
                    )}

                    {selectedEscalation.status !== 'resolved' && (
                      <div className="space-y-3 pt-4 border-t border-border">
                        <label className="text-xs  uppercase text-muted-foreground block">Resolution Action</label>
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Document your oversight actions and resolution notes..."
                          className="w-full h-32 bg-input-background border-2 border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                        />
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleUpdateProgress}
                            disabled={isSubmitting || !resolutionNotes}
                            variant="outline"
                            className="flex-1 border-border text-foreground hover:bg-muted disabled:opacity-50"
                          >
                            Log Progress
                          </Button>
                          <Button 
                            onClick={handleResolve}
                            disabled={isSubmitting || !resolutionNotes}
                            className="flex-1 bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50"
                          >
                            Mark as Resolved
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedEscalation.status === 'resolved' && (
                      <div className="bg-success/20 border border-success p-4 rounded text-sm text-success">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="">Resolved</span>
                        </div>
                        <p className=" text-foreground">"{selectedEscalation.resolution_notes}"</p>
                        <p className="mt-2 text-xs opacity-75">Resolved on {new Date(selectedEscalation.resolved_at!).toLocaleDateString('en-GB')}</p>
                      </div>
                    )}

                    {/* Action History */}
                    {(selectedEscalation as any).actions && (selectedEscalation as any).actions.length > 0 && (
                      <div className="pt-6 border-t border-border">
                        <label className="text-xs  uppercase text-muted-foreground block mb-3">Action History</label>
                        <div className="space-y-4">
                          {(selectedEscalation as any).actions.map((action: any) => (
                            <div key={action.id} className="text-xs border-l-2 border-primary pl-3 py-1">
                              <p className=" text-primary">{action.action_type.toUpperCase()}</p>
                              <p className="text-muted-foreground mt-0.5">{action.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{new Date(action.created_at).toLocaleString('en-GB')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="bg-muted border-2 border-border p-4 flex items-start gap-3 shadow-sm">
                  <MessageSquare className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs  text-muted-foreground uppercase">Communication Log</p>
                    <p className="text-sm text-foreground mt-1">Actions taken here will be logged in the risk history and visible to Registered Managers.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-center ">Select an escalation to view details and take action</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
