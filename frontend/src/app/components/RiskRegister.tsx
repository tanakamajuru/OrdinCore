import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowUpRight, ShieldAlert, Layers } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

// Governance Oversight Register (doctrine): shows what leadership is actively
// overseeing — emerging concerns, active oversight, strategic oversight, closed —
// not likelihood/impact risk scoring.
type Tab = "active" | "strategic" | "emerging" | "closed";

const POSITION_TONE: Record<string, string> = {
  Improving: "bg-emerald-100 text-emerald-700",
  Stable: "bg-sky-100 text-sky-700",
  "Emerging Concern": "bg-amber-100 text-amber-700",
  Escalating: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

function TrajIcon({ t }: { t: string }) {
  const v = (t || "").toLowerCase();
  if (v.includes("improv")) return <TrendingDown className="w-4 h-4 text-emerald-600" />;
  if (v.includes("deteriorat") || v.includes("escalat") || v.includes("critical") || v.includes("worsen")) return <TrendingUp className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export function RiskRegister() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/risks/oversight-summary");
      setData((res as any).data || null);
    } catch {
      toast.error("Failed to load oversight register");
    } finally {
      setIsLoading(false);
    }
  };

  const banner = data?.banner || { activeOversight: 0, escalating: 0, stable: 0, improving: 0, critical: 0, controlFailures: 0, lastReviewAt: null };
  const rows: any[] = data?.[tab] || [];

  const tabs: { key: Tab; label: string; count: number; icon: any }[] = [
    { key: "emerging", label: "Emerging Concerns", count: data?.emerging?.length || 0, icon: Layers },
    { key: "active", label: "Active Oversight", count: data?.active?.length || 0, icon: AlertTriangle },
    { key: "strategic", label: "Strategic Oversight", count: data?.strategic?.length || 0, icon: ArrowUpRight },
    { key: "closed", label: "Closed Oversight", count: data?.closed?.length || 0, icon: ShieldAlert },
  ];

  const openRow = (r: any) => {
    if (tab === "emerging") {
      navigate(`/risks/promote`, { state: r.source === "cluster" ? { cluster_id: r.id } : { candidate_id: r.id } });
    } else {
      navigate(`/risks/${r.id}`);
    }
  };

  const Stat = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <div className={`text-2xl font-semibold ${tone || ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-3xl text-primary font-semibold">Governance Oversight Register</h1>
          <p className="text-muted-foreground mt-1">What leadership is actively overseeing — concerns, trajectory and controls.</p>
        </div>

        {/* Summary banner */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-5">
          <Stat label="Active Oversight" value={banner.activeOversight} />
          <Stat label="Escalating" value={banner.escalating} tone="text-orange-600" />
          <Stat label="Critical" value={banner.critical} tone="text-red-600" />
          <Stat label="Stable" value={banner.stable} tone="text-sky-600" />
          <Stat label="Improving" value={banner.improving} tone="text-emerald-600" />
          <Stat label="Control Failures" value={banner.controlFailures} tone="text-red-600" />
          <Stat label="Last Review" value={banner.lastReviewAt ? new Date(banner.lastReviewAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"} />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-border">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${tab === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              <span className="text-xs bg-muted rounded-full px-2 py-0.5">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Register table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Loading oversight register…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">{tab === "emerging" ? "No emerging concerns." : tab === "closed" ? "Nothing closed yet." : "Nothing under oversight here."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                    <th className="py-2.5 px-3">Concern</th>
                    <th className="px-2">Type</th>
                    <th className="px-2">Position</th>
                    <th className="px-2">Trajectory</th>
                    <th className="px-2">Evidence</th>
                    {tab !== "emerging" && <th className="px-2">Controls</th>}
                    {tab !== "emerging" && <th className="px-2">Effectiveness</th>}
                    {tab !== "emerging" && <th className="px-2">Owner</th>}
                    {tab !== "emerging" && <th className="px-2">Next Review</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} onClick={() => openRow(r)} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer">
                      <td className="py-2.5 px-3 font-medium max-w-[260px] truncate">{r.concern}</td>
                      <td className="px-2"><span className="text-xs text-muted-foreground">{r.type}</span></td>
                      <td className="px-2"><span className={`text-xs rounded px-2 py-0.5 ${POSITION_TONE[r.position] || "bg-muted"}`}>{r.position}</span></td>
                      <td className="px-2"><div className="flex items-center gap-1"><TrajIcon t={r.trajectory} /><span className="text-xs text-muted-foreground">{r.trajectory}</span></div></td>
                      <td className="px-2 text-muted-foreground">{r.evidence} signals</td>
                      {tab !== "emerging" && <td className="px-2 text-muted-foreground">{r.controls}</td>}
                      {tab !== "emerging" && <td className="px-2 text-xs text-muted-foreground">{r.effectiveness}</td>}
                      {tab !== "emerging" && <td className="px-2 text-xs text-muted-foreground">{r.owner}</td>}
                      {tab !== "emerging" && <td className="px-2 text-xs text-muted-foreground">{r.nextReview ? new Date(r.nextReview).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {tab === "emerging" && rows.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">Emerging concerns are signal clusters and candidates not yet promoted to formal oversight. Click to review and promote.</p>
        )}
      </div>
    </div>
  );
}
