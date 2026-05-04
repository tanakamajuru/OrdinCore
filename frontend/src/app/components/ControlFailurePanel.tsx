import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { AlertTriangle, ShieldAlert, CheckCircle, Bell, Loader2 } from "lucide-react";
import { directorApi } from "@/services/directorApi";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

export function ControlFailurePanel() {
  const [failures, setFailures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    loadFailures();
  }, []);

  const loadFailures = async () => {
    try {
      const data = await directorApi.getControlFailures();
      setFailures(data);
    } catch (err) {
      console.error("Failed to load control failures", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolvingId) return;
    setIsResolving(true);
    try {
      await directorApi.resolveControlFailure(resolvingId, resolutionNote);
      toast.success("Control failure resolved");
      setResolvingId(null);
      setResolutionNote("");
      loadFailures();
    } catch (err) {
      toast.error("Failed to resolve control failure");
    } finally {
      setIsResolving(false);
    }
  };

  const handleAlertRM = async (failure: any) => {
    try {
      await directorApi.createIntervention({
        service_id: failure.service_id,
        intervention_type: 'alert_rm',
        message: `Forensic Alert: Control failure detected (${failure.threshold_trigger}). Please review effectiveness and adjust risk controls immediately.`
      });
      toast.success(`Alert sent to Registered Manager of ${failure.service_name}`);
    } catch (err) {
      toast.error("Failed to send alert");
    }
  };

  if (isLoading) return <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>;
  if (failures.length === 0) return null;

  return (
    <Card className="border-2 border-destructive/20 shadow-sm mb-8 bg-destructive/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-destructive" />
          <CardTitle className="text-xl  uppercase  tracking-tighter text-destructive">Active Control Failures Detected</CardTitle>
        </div>
        <span className="bg-destructive text-primary-foreground px-2 py-0.5 text-[10px]  uppercase animate-pulse">Action Required</span>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {failures.map((failure) => (
          <div key={failure.id} className="bg-card border-2 border-destructive/20 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-destructive/40 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs  uppercase bg-destructive/10 text-destructive px-1.5 py-0.5">{failure.failure_type.replace('_', ' ')}</span>
                <p className=" text-primary uppercase  tracking-tighter">{failure.service_name}</p>
              </div>
              <p className="text-sm  text-foreground mb-1">{failure.threshold_trigger}</p>
              <div className="flex items-center gap-4 text-[10px]  text-muted-foreground uppercase">
                <span>Detected: {new Date(failure.detected_at).toLocaleString()}</span>
                {failure.risk_title && <span>Target Risk: {failure.risk_title}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 md:flex-none border-2 border-primary text-primary hover:bg-primary/5  uppercase text-[10px]"
                onClick={() => handleAlertRM(failure)}
              >
                <Bell className="w-3 h-3 mr-1" />
                Alert RM
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1 md:flex-none bg-destructive text-primary-foreground hover:bg-destructive/90  uppercase text-[10px]"
                onClick={() => setResolvingId(failure.id)}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Resolve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!resolvingId} onOpenChange={(open) => !open && setResolvingId(null)}>
        <DialogContent className="border-4 border-border rounded-none">
          <DialogHeader>
            <DialogTitle className="text-2xl  uppercase  tracking-tighter">Resolve Control Failure</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-[10px]  uppercase text-muted-foreground mb-2 tracking-widest">Resolution Note / Strategic Intervention</label>
            <Textarea 
              placeholder="Detail the intervention taken to address this repeated control failure..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="border-2 border-border focus-visible:ring-0 min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingId(null)} className="border-2 border-border  uppercase">Cancel</Button>
            <Button 
              onClick={handleResolve} 
              disabled={isResolving}
              className="bg-primary text-primary-foreground hover:bg-[#008394]  uppercase"
            >
              {isResolving ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
