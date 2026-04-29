import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { 
  ArrowLeft, 
  History, 
  Target, 
  AlertTriangle, 
  ShieldCheck, 
  FileSearch,
  Download,
  MessageSquare
} from "lucide-react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function EvidencePackViewer() {
  const { house_id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    loadEvidencePack();
  }, [house_id]);

  const loadEvidencePack = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/ri-governance/houses/${house_id}/evidence-pack`);
      setData(res.data?.data);
    } catch (error) {
      toast.error("Failed to load evidence pack");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // Construct the export URL with authentication if needed, but usually a simple redirect or anchor works if session is in cookies
    // For our apiClient setup, we might need to fetch the blob manually to ensure token is sent
    toast.promise(async () => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${apiClient.baseURL}/ri-governance/houses/${house_id}/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        
        if (!response.ok) throw new Error("Export failed");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EvidencePack_${house_id}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    }, {
        loading: 'Generating Forensic PDF...',
        success: 'Evidence Pack Downloaded',
        error: 'Export failed'
    });
  };

  const handleCreateQuery = async (reviewId: string) => {
    const queryText = window.prompt("Enter your query for the Registered Manager:");
    if (!queryText) return;

    try {
        await apiClient.post(`/ri-governance/weekly-reviews/${reviewId}/query`, { query_text: queryText });
        toast.success("Query sent to Registered Manager");
        loadEvidencePack();
    } catch (err) {
        toast.error("Failed to send query");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <RoleBasedNavigation />
      
      <div className="p-8 w-full pt-24 max-w-[1400px] mx-auto">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-8">
            <button 
                onClick={() => navigate(-1)}
                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter italic">Evidence Pack: {data?.service?.name || "Service"}</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Forensic Governance Drill-Down</p>
            </div>
            <div className="ml-auto flex gap-3">
                <button 
                    onClick={handleExport}
                    className="bg-primary text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                    <Download className="w-4 h-4" />
                    Export PDF Bundle
                </button>
            </div>
        </div>

        {/* Forensic Tabs */}
        <div className="flex gap-1 mb-8 border-b-4 border-black">
            {[
                { id: "timeline", label: "Signal Timeline", icon: History },
                { id: "risks", label: "Active Risks", icon: Target },
                { id: "reviews", label: "Weekly Narratives", icon: ShieldCheck },
                { id: "incidents", label: "Incident Audit", icon: AlertTriangle }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                        activeTab === tab.id ? "bg-black text-white" : "hover:bg-muted"
                    }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 gap-8">
            
            {activeTab === "timeline" && (
                <Card className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="border-b-2 border-black">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Recent Signal Telemetry</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y-2 divide-black">
                            {data?.signals?.map((signal: any) => (
                                <div key={signal.id} className="p-4 flex justify-between items-center hover:bg-muted/30">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 ${
                                            signal.severity === 'High' ? 'bg-destructive' : 
                                            signal.severity === 'Moderate' ? 'bg-warning' : 'bg-success'
                                        } border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`} />
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tighter">{signal.severity} Signal: {signal.risk_domain?.join(', ')}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(signal.entry_date).toLocaleDateString('en-GB')}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/signals/${signal.id}`)}
                                        className="text-[10px] font-black uppercase underline hover:text-primary"
                                    >
                                        View Traceability
                                    </button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === "risks" && (
                <div className="grid grid-cols-2 gap-6">
                    {data?.risks?.map((risk: any) => (
                        <Card key={risk.id} className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] transition-all">
                            <CardHeader className="border-b-2 border-black bg-muted/20">
                                <CardTitle className="flex justify-between items-start">
                                    <span className="text-lg font-black uppercase tracking-tighter italic">{risk.title}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 uppercase border border-black ${
                                        risk.severity === 'critical' ? 'bg-destructive text-white' : 'bg-white'
                                    }`}>{risk.severity}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{risk.description}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border-2 border-black p-3 bg-muted/10">
                                        <span className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Trajectory</span>
                                        <span className="text-sm font-black uppercase italic tracking-tighter">{risk.trajectory || 'Stable'}</span>
                                    </div>
                                    <div className="border-2 border-black p-3 bg-muted/10">
                                        <span className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Last Review</span>
                                        <span className="text-sm font-black uppercase italic tracking-tighter">{new Date(risk.updated_at).toLocaleDateString('en-GB')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {activeTab === "reviews" && (
                <div className="space-y-8">
                    {data?.reviews?.map((review: any) => (
                        <Card key={review.id} className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <CardHeader className="border-b-2 border-black flex flex-row items-center justify-between bg-muted/30">
                                <div>
                                    <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Weekly Review: WE {new Date(review.week_ending).toLocaleDateString('en-GB')}</CardTitle>
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Position: {review.overall_position}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleCreateQuery(review.id)}
                                        className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Query RM
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="prose prose-sm max-w-none">
                                    <div className="bg-muted/20 border-l-4 border-black p-6 italic text-sm text-foreground leading-relaxed">
                                        <span className="block font-black uppercase not-italic text-[10px] mb-4 tracking-[0.2em] text-primary">Forensic Governance Narrative</span>
                                        {review.governance_narrative}
                                    </div>
                                </div>
                                
                                {review.query_text && (
                                    <div className="mt-8 border-4 border-primary p-6 bg-primary/5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <FileSearch className="w-5 h-5 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">RI Governance Query</span>
                                        </div>
                                        <p className="text-sm font-bold italic mb-4">"{review.query_text}"</p>
                                        <div className="bg-white border-2 border-primary p-4">
                                            <span className="block text-[10px] font-black uppercase text-muted-foreground mb-2">RM Response</span>
                                            <p className="text-xs font-medium">{review.rm_response_text || "Awaiting management response..."}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {activeTab === "incidents" && (
                <Card className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="border-b-2 border-black">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Serious Incident Audit Trail</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y-2 divide-black">
                            {data?.incidents?.map((incident: any) => (
                                <div key={incident.id} className="p-6 flex justify-between items-start hover:bg-muted/30">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 uppercase border border-black ${
                                                incident.severity === 'critical' ? 'bg-destructive text-white' : 'bg-white'
                                            }`}>{incident.severity}</span>
                                            <span className="text-[10px] font-black uppercase text-muted-foreground">{new Date(incident.occurred_at).toLocaleDateString('en-GB')}</span>
                                        </div>
                                        <h4 className="text-md font-black uppercase tracking-tighter italic">{incident.title}</h4>
                                    </div>
                                    <div className="text-right">
                                        {incident.acknowledged_at ? (
                                            <div className="flex items-center gap-2 text-success">
                                                <ShieldCheck className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">RI Signed Off</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-destructive">
                                                <AlertTriangle className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Awaiting RI Sign-Off</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
      </div>
    </div>
  );
}
