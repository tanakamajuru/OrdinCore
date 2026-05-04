import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  X
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface PulseRecord {
  id: string;
  house_name: string;
  signal_type: string;
  severity: string;
  review_status: string;
  entry_date: string;
  entry_time: string;
  description: string;
}

export function PulseHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pulses, setPulses] = useState<PulseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    if (user) {
      loadPulseHistory();
    }
  }, [user]);

  const loadPulseHistory = async () => {
    try {
      setIsLoading(true);
      // Fetch pulses created by this user
      const params: any = { limit: 100 };
      const role = (user?.role || '').toUpperCase().replace('-', '_');
      if (role === 'TEAM_LEADER' || role === 'TL') {
        params.created_by = user?.id;
      }

      const res = await apiClient.get('/pulses', { params });
      const data = (res.data as any).data || res.data;
      setPulses(data);
    } catch (err) {
      console.error('Failed to load pulse history:', err);
      toast.error("Failed to load your pulse history");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPulses = pulses.filter(p => {
    const matchesText = p.signal_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.house_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !searchDate || p.entry_date.includes(searchDate);
    
    return matchesText && matchesDate;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB');

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline "
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl  text-primary tracking-tighter uppercase ">Pulse History</h1>
            <p className="text-muted-foreground ">
              {(user?.role?.toUpperCase() === 'TEAM_LEADER' || user?.role?.toUpperCase() === 'TL') 
                ? "All governance signals you have submitted" 
                : "All governance signals for your organisation"}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border-2 border-border focus:border-primary outline-none transition-all "
              />
            </div>
            <div className="relative flex-1 sm:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border-2 border-border focus:border-primary outline-none transition-all  appearance-none"
              />
              {searchDate && (
                <button 
                  onClick={() => setSearchDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : filteredPulses.length > 0 ? (
          <div className="bg-card border-2 border-border shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b-2 border-border">
                    <th className="p-4  uppercase text-xs tracking-widest">Date / Time</th>
                    <th className="p-4  uppercase text-xs tracking-widest">House</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Type</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Severity</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Status</th>
                    <th className="p-4  uppercase text-xs tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPulses.map((pulse) => (
                    <tr key={pulse.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className=" text-foreground">{formatDate(pulse.entry_date)}</span>
                          <span className="text-xs text-muted-foreground ">{pulse.entry_time.slice(0, 5)}</span>
                        </div>
                      </td>
                      <td className="p-4  text-foreground">{pulse.house_name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs  uppercase tracking-tighter">
                          {pulse.signal_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={` ${
                          pulse.severity === 'High' || pulse.severity === 'Critical' ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {pulse.severity}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs  text-muted-foreground uppercase">{pulse.review_status}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`/signals/${pulse.id}`)}
                          className="p-2 hover:bg-primary hover:text-primary-foreground transition-all rounded border-2 border-transparent hover:border-primary group-hover:shadow-md"
                          title="View Details"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-card border-2 border-dashed border-border">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground  ">No pulse records found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
