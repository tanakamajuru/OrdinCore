import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { 
  ShieldAlert, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Layers,
  ArrowRight,
  TrendingDown,
  Navigation
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

const SEVERITIES = ['Low', 'Moderate', 'High', 'Critical'];
const TRAJECTORIES = ['Improving', 'Stable', 'Deteriorating', 'Critical'];

export function RiskPromotion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidate_id');
  const clusterId = searchParams.get('cluster_id');
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [sourceData, setSourceData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'Moderate',
    trajectory: 'Stable',
    category_id: '',
    assigned_to: '',
    likelihood: 3,
    impact: 3,
    next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!candidateId && !clusterId) {
        toast.error("No source ID provided (candidate_id or cluster_id)");
        navigate('/governance-dashboard');
        return;
    }
    loadData();
  }, [candidateId, clusterId]);

  const loadData = async () => {
    try {
      const [catRes, uRes] = await Promise.all([
        apiClient.get('/risks/categories'),
        apiClient.get('/users')
      ]);

      setCategories((catRes as any).data || catRes || []);
      setUsers((uRes as any).data || uRes || []);

      if (candidateId) {
        const cRes = await apiClient.get(`/governance/risk-candidates?id=${candidateId}`);
        const candidate = (cRes as any).data?.[0];
        if (candidate) {
          setSourceData(candidate);
          setFormData(prev => ({ 
              ...prev, 
              title: `Risk: ${candidate.risk_domain}`,
              description: `Automated Risk Candidate detected by OrdinCore. Reason: ${candidate.reason}. Trajectory: ${candidate.pattern_trajectory}.`
          }));
        }
      } else if (clusterId) {
        const cRes = await apiClient.get(`/governance/clusters?id=${clusterId}`);
        const cluster = (cRes as any).data?.[0];
        if (cluster) {
          setSourceData(cluster);
          setFormData(prev => ({ 
              ...prev, 
              title: `Risk: ${cluster.cluster_label}`,
              description: `Identified via OrdinCore pattern detection. Includes ${cluster.signal_count} recent signals in ${cluster.risk_domain}.`
          }));
        }
      }

    } catch (err) {
      toast.error("Failed to load promotion source data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/risks/promote', {
          ...formData,
          candidate_id: candidateId,
          cluster_id: clusterId,
          house_id: sourceData.house_id
      });
      toast.success("Risk formally registered");
      navigate('/risk-register');
    } catch (err: any) {
      toast.error((err as any).data?.message || err.message || "Failed to promote risk");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-20 text-center uppercase font-black text-primary animate-pulse">Initializing Decision Protocol...</div>;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="max-w-4xl mx-auto pt-32 p-6">
        
        <div className="mb-8 border-b-8 border-primary pb-6">
          <h1 className="text-5xl font-black text-primary italic uppercase tracking-tighter">Risk Promotion</h1>
          <p className="text-muted-foreground font-medium mt-2 uppercase tracking-widest">
            {candidateId ? `Formalizing Candidate ${candidateId.slice(0,8)}` : `Formalizing Cluster ${clusterId?.slice(0,8)}`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
             {/* Section 1: Title & Description */}
             <div className="bg-card border-2 border-border p-6 shadow-sm">
                <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Risk Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-input-background border-b-2 border-primary p-3 text-xl font-bold focus:outline-none mb-6"
                />

                <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Governance Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full h-40 bg-input-background border-b-2 border-primary p-3 text-lg focus:outline-none resize-none"
                />
             </div>

             {/* Section 2: Ratings */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border-2 border-border p-6 shadow-sm">
                    <label className="block text-xs font-black uppercase text-muted-foreground mb-4">Initial Severity</label>
                    <div className="flex flex-col gap-2">
                        {SEVERITIES.map(s => (
                            <button 
                                key={s}
                                onClick={() => setFormData(p => ({ ...p, severity: s }))}
                                className={`p-3 text-left font-bold border-2 transition-all ${formData.severity === s ? 'bg-destructive text-primary-foreground border-destructive' : 'bg-background border-border hover:border-primary'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-card border-2 border-border p-6 shadow-sm">
                    <label className="block text-xs font-black uppercase text-muted-foreground mb-4">Initial Trajectory</label>
                    <div className="flex flex-col gap-2">
                        {TRAJECTORIES.map(t => (
                            <button 
                                key={t}
                                onClick={() => setFormData(p => ({ ...p, trajectory: t }))}
                                className={`p-3 text-left font-bold border-2 transition-all ${formData.trajectory === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             {/* Section 3: Assignment & Metadata */}
             <div className="bg-card border-2 border-border p-6 shadow-sm sticky top-32">
                <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Risk Category</label>
                <select 
                    value={formData.category_id}
                    onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))}
                    className="w-full bg-input-background border-b-2 border-primary p-3 font-bold focus:outline-none mb-6"
                >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Assign Owner</label>
                <select 
                    value={formData.assigned_to}
                    onChange={e => setFormData(p => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full bg-input-background border-b-2 border-primary p-3 font-bold focus:outline-none mb-6"
                >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                </select>

                <label className="block text-xs font-black uppercase text-muted-foreground mb-2">Next Review Date</label>
                <input 
                    type="date"
                    value={formData.next_review_date}
                    onChange={e => setFormData(p => ({ ...p, next_review_date: e.target.value }))}
                    className="w-full bg-input-background border-b-2 border-primary p-3 font-bold focus:outline-none mb-8"
                />

                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.category_id}
                    className="w-full bg-primary text-primary-foreground p-4 font-black uppercase italic tracking-widest hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    Register Risk <ShieldAlert size={20} />
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
