import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertCircle, Clock, PlusCircle } from "lucide-react";
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
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-4 px-6 bg-destructive text-destructive-foreground font-bold text-lg hover:bg-destructive/90 transition-all shadow-md flex items-center justify-center gap-3"
                >
                  <AlertCircle className="w-6 h-6" />
                  REPORT SERIOUS INCIDENT
                </button>
                <button
                  onClick={() => navigate("/governance-pulse")}
                  className="w-full py-4 px-6 bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-3"
                >
                  <Clock className="w-6 h-6" />
                  COMPLETE DAILY PULSE
                </button>
              </div>
            </div>

            {/* Daily Pulse Status */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Daily Pulse Status</h2>
              {lastPulse ? (
                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded">
                  <div>
                    <p className="font-bold text-foreground">Last Pulse Attempt</p>
                    <p className="text-sm text-muted-foreground">{new Date(lastPulse.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ['SUBMITTED', 'LOCKED', 'completed'].includes(lastPulse.status) ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                  }`}>
                    {lastPulse.status.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border">
                  No pulse records found.
                </div>
              )}
            </div>
          </div>

          {/* Right: Recent Activity */}
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">My Recent Reports</h2>
            <div className="space-y-4">
              {recentIncidents.length > 0 ? recentIncidents.map((incident) => (
                <div key={incident.id} className="p-4 border border-border hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-foreground">{incident.title || `Incident #${incident.id.substring(0,8)}`}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                      incident.severity === 'serious' || incident.severity === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {incident.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                    <span className="capitalize">{incident.status.replace('_', ' ')}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border">
                  No incidents reported recently.
                </div>
              )}
            </div>
            <button
              onClick={() => navigate("/incidents")}
              className="w-full mt-6 py-2 text-sm font-bold text-primary hover:underline"
            >
              View Full History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
