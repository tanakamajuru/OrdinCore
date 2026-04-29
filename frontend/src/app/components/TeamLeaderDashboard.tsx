import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertCircle, Clock, PlusCircle, FileText, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

export function TeamLeaderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lastPulse, setLastPulse] = useState<any>(null);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If we have a user, load data. If not, we still need to stop loading at some point
    // unless the RoleBasedDashboard redirects us first.
    if (user) {
      loadDashboardData();
    } else {
      // Small timeout to prevent infinite spinner if auth doesn't resolve quickly
      const timer = setTimeout(() => {
        if (!user) setIsLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [pulseRes, incidentRes] = await Promise.all([
        apiClient.get(`/pulses?limit=1`).catch(err => {
          console.error('Pulse fetch failed:', err);
          return { data: { data: [] } };
        }),
        apiClient.get('/incidents?limit=5').catch(err => {
          console.error('Incident fetch failed:', err);
          return { data: { data: [] } };
        })
      ]);

      const pulses = pulseRes.data || [];
      if (pulses.length > 0) setLastPulse(pulses[0]);

      const incidents = incidentRes.data || [];
      setRecentIncidents(incidents);

    } catch (error) {
      console.error('Failed to load TL dashboard data:', error);
      toast.error('Partial dashboard data loaded. Please check your connection.');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-3xl font-bold text-primary">Frontline Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.first_name} {user?.last_name || 'Team Leader'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Quick Actions */}
          <div className="space-y-6">
            <div className="bg-card border-2 border-primary/20 p-6 shadow-sm">
              <h2 className="text-xl font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                Frontline Reporting
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => navigate("/governance-pulse")}
                  className="w-full py-6 px-6 bg-primary text-primary-foreground font-black text-2xl italic tracking-tighter hover:bg-primary/90 transition-all shadow-xl flex items-center justify-center gap-4 group"
                >
                  <Activity className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  COMPLETE DAILY PULSE
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-4 px-6 bg-destructive text-destructive-foreground font-black text-xl italic tracking-tighter hover:bg-destructive/90 transition-all shadow-md flex items-center justify-center gap-3"
                >
                  <AlertCircle className="w-6 h-6" />
                  REPORT SERIOUS INCIDENT
                </button>
              </div>
            </div>

            {/* Daily Pulse Status */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Observation History</h2>
              {lastPulse ? (
                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded">
                  <div>
                    <p className="font-bold text-foreground italic uppercase text-xs tracking-widest opacity-60">Latest Signal Recorded</p>
                    <p className="font-black text-lg text-primary italic tracking-tighter mt-1">{lastPulse.signal_type}</p>
                    <p className="text-[10px] text-muted-foreground font-bold mt-1">{new Date(lastPulse.pulse_date || lastPulse.created_at).toLocaleString('en-GB')}</p>
                  </div>
                  <div className={`px-4 py-1 border-2 font-black italic text-xs tracking-widest ${
                    ['SUBMITTED', 'LOCKED', 'completed'].includes(lastPulse.status) ? 'border-success/30 text-success bg-success/5' : 'border-warning/30 text-warning bg-warning/5'
                  }`}>
                    {lastPulse.status.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border italic font-bold">
                  No signals recorded yet.
                </div>
              )}
              <button
                onClick={() => navigate("/pulse-history")}
                className="w-full mt-4 py-2 text-sm font-black text-primary hover:underline flex items-center justify-center gap-2 border-t-2 border-border pt-4 uppercase italic tracking-widest"
              >
                <FileText className="w-4 h-4" />
                View Full Signal History
              </button>
            </div>
          </div>

          {/* Right: Assigned Actions */}
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              My Assigned Actions
            </h2>
            <div className="space-y-4">
              {/* This will be populated from ra.* where assigned_user_id = TL.id */}
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border font-bold italic uppercase tracking-widest opacity-40">
                No active actions assigned by Manager.
              </div>
            </div>
            <button
              onClick={() => navigate("/my-actions")}
              className="w-full mt-6 py-3 bg-muted text-foreground font-black uppercase italic tracking-widest hover:bg-muted/80 transition-all border-2 border-border"
            >
              Go to Action Tracker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
