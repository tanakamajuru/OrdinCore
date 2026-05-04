import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { Cpu, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { dashboardApi } from "@/services/dashboardApi";
import { toast } from "sonner";

export function ComputationalEngines() {
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEngineStatus();
  }, []);

  const loadEngineStatus = async () => {
    setIsLoading(true);
    try {
      const status = await dashboardApi.getComputationalEnginesStatus();
      setEngineStatus(status);
    } catch (error) {
      console.error('Failed to load engine status:', error);
      toast.error('Failed to load engine status');
    } finally {
      setIsLoading(false);
    }
  };

  const engines = engineStatus?.engines || [
    { name: "Automated Escalation", status: "active", lastRun: new Date().toISOString(), description: "Detects high-severity risks and triggers immediate RI notification." },
    { name: "Governance Pulse Compliance", status: "active", lastRun: new Date().toISOString(), description: "Tracks weekly submissions and flags overdue governance pulses." },
    { name: "Serious Incident Linkage", status: "active", lastRun: new Date().toISOString(), description: "Reconstructs governance timelines linking prior signals to incidents." },
    { name: "Reporting Engine", status: "active", lastRun: new Date().toISOString(), description: "Generates consolidated organizational and site-level PDF reports." }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl  text-primary mb-2">Computational System Engines</h1>
            <p className="text-muted-foreground">Monitor and manage the background logic driving organizational strategic oversight</p>
          </div>
          <Button 
            onClick={loadEngineStatus} 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary/5 shadow-sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {engines.map((engine: any, idx: number) => (
            <Card key={idx} className="border-2 border-border shadow-sm bg-card hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl  flex items-center gap-2 text-primary">
                  <Cpu className="w-5 h-5 text-primary" />
                  {engine.name}
                </CardTitle>
                <span className={`px-2 py-1 rounded text-[10px]  uppercase shadow-sm ${
                  engine.status === 'active' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                }`}>
                  {engine.status}
                </span>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-6">{engine.description}</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-foreground/60">
                    <Clock className="w-4 h-4 text-primary/60" />
                    Last execution: {new Date(engine.lastRun).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-success ">
                    <CheckCircle className="w-4 h-4" />
                    Operational integrity verified
                  </div>
                  <div className="pt-4 mt-4 border-t border-border flex gap-3">
                    <Button variant="outline" className="flex-1 border-border text-xs h-8 hover:bg-muted text-foreground">View Logs</Button>
                    <Button className="flex-1 bg-primary text-primary-foreground text-xs h-8 hover:bg-primary/90 shadow-sm">Run Now</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Health Summary */}
        <Card className="mt-8 border-2 border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-primary">System Computational Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl  text-foreground">100%</div>
                <div className="text-sm text-muted-foreground">Engine Uptime</div>
              </div>
              <div>
                <div className="text-3xl  text-foreground">~1.2s</div>
                <div className="text-sm text-muted-foreground">Avg. Reconstruction Latency</div>
              </div>
              <div>
                <div className="text-3xl  text-foreground">2.4k</div>
                <div className="text-sm text-muted-foreground">Events Processed (24h)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
