import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { FileText, Save, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { directorApi } from "@/services/directorApi";
import { toast } from "sonner";

interface MonthlyReportEditorProps {
  onClose: () => void;
}

export function MonthlyReportEditor({ onClose }: MonthlyReportEditorProps) {
  const [draft, setDraft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalising, setIsFinalising] = useState(false);
  const [finalNarrative, setFinalNarrative] = useState("");

  useEffect(() => {
    loadDraft();
  }, []);

  const loadDraft = async () => {
    try {
      // Calculate previous month
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      
      const data = await directorApi.getMonthlyReportDraft(periodStart, periodEnd);
      setDraft(data);
      setFinalNarrative(data.draft_narrative);
    } catch (err) {
      console.error("Failed to load report draft", err);
      toast.error("Failed to load automated report draft");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalise = async () => {
    if (!draft) return;
    setIsFinalising(true);
    try {
      await directorApi.finaliseMonthlyReport(draft.id, finalNarrative);
      toast.success("Monthly board report finalised and archived");
      onClose();
    } catch (err) {
      toast.error("Failed to finalise report");
    } finally {
      setIsFinalising(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!draft) return <div className="text-center p-12">No draft available. Ensure previous month has locked weekly reviews.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-bold uppercase text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2 py-1 border border-primary/20">Draft Generated: {new Date(draft.generated_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card className="border-4 border-border rounded-none shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                <CardHeader className="bg-primary text-primary-foreground py-4">
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                        <FileText className="w-6 h-6" />
                        Monthly Board Report - Executive Finalisation
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Auto-Generated Governance Narrative (Editable)</label>
                            <Textarea 
                                value={finalNarrative}
                                onChange={(e) => setFinalNarrative(e.target.value)}
                                className="min-h-[600px] font-mono text-sm border-2 border-border focus-visible:ring-0 rounded-none bg-muted/5 p-6"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-4">
                            <Button variant="outline" onClick={onClose} className="border-2 border-border font-bold uppercase rounded-none">Discard Changes</Button>
                            <Button 
                                onClick={handleFinalise}
                                disabled={isFinalising}
                                className="bg-primary text-primary-foreground border-2 border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-black uppercase italic"
                            >
                                {isFinalising ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Finalise & Archive Report
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card className="border-2 border-border rounded-none bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Doctrine Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        "Cross-site governance summary included",
                        "Action effectiveness trends analyzed",
                        "Control failures addressed",
                        "Forward-looking strategic plan defined"
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-border flex items-center justify-center bg-card">
                                <div className="w-2 h-2 bg-primary" />
                            </div>
                            <span className="text-xs font-bold uppercase">{item}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="p-6 border-2 border-dashed border-border bg-card">
                <h3 className="font-black uppercase italic text-sm mb-2">Layer 4 Accountability</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    By finalising this report, you are confirming that executive oversight has been performed across all services for the period. This record is immutable once archived.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
