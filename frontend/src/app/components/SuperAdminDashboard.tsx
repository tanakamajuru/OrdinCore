import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Building2, Users, Plus, Settings, LogOut, Globe, Shield,
  AlertCircle, CheckCircle, BarChart3, RefreshCw, Trash2,
  UserPlus, ChevronRight, Activity
} from "lucide-react";
import { apiClient } from "@/services/api";

interface Company {
  id: string;
  name: string;
  domain?: string;
  status: string;
  plan?: string;
  created_at: string;
  user_count?: number;
}

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  systemHealth: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<PlatformStats>({ totalCompanies: 0, activeCompanies: 0, totalUsers: 0, systemHealth: "Good" });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newOrg, setNewOrg] = useState({ name: "", domain: "", contactEmail: "", plan: "professional" });
  const [newAdmin, setNewAdmin] = useState({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminName = localStorage.getItem('userName') || 'Super Admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const companiesRes = await apiClient.getCompanies();
      const companiesList = (companiesRes as any).data || [];
      setCompanies(Array.isArray(companiesList) ? companiesList : []);
      const active = companiesList.filter((c: Company) => c.status === 'active').length;
      setStats({
        totalCompanies: companiesList.length,
        activeCompanies: active,
        totalUsers: 0,
        systemHealth: "Good",
      });
    } catch (err) {
      console.error("Failed to load platform data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setIsSubmitting(true);
    try {
      const res = await apiClient.createCompany(newOrg as any);
      if ((res as any).success) {
        setFormSuccess("Organisation created successfully!");
        setNewOrg({ name: "", domain: "", contactEmail: "", plan: "professional" });
        setShowCreateOrg(false);
        loadData();
      } else {
        setFormError((res as any).message || "Failed to create organisation");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create organisation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setIsSubmitting(true);
    try {
      const payload = {
        ...newAdmin,
        role: "ADMIN",
        email: newAdmin.email,
        company_id: newAdmin.company_id,
      };
      const res = await apiClient.createUser(payload as any);
      if ((res as any).success) {
        setFormSuccess(`Admin account created for ${newAdmin.email}`);
        setNewAdmin({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
        setShowCreateAdmin(false);
      } else {
        setFormError((res as any).message || "Failed to create admin");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendOrg = async (company: Company) => {
    if (!confirm(`Suspend "${company.name}"? This will prevent users from logging in.`)) return;
    try {
      await apiClient.updateCompany(company.id, { status: 'suspended' } as any);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to suspend organisation");
    }
  };

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'suspended') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top navigation */}
      <nav className="bg-black text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-white" />
          <div>
            <span className="text-xl font-bold tracking-tight">OrdinCore</span>
            <span className="ml-3 text-xs bg-white text-black px-2 py-0.5 rounded font-semibold">PLATFORM ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">Welcome, {adminName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Success/Error banner */}
        {formSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded">
            <CheckCircle className="w-5 h-5" />
            {formSuccess}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage all organisations on the OrdinCore platform</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowCreateAdmin(true); setFormError(""); setFormSuccess(""); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black text-black font-medium hover:bg-gray-100 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create Company Admin
            </button>
            <button
              onClick={() => { setShowCreateOrg(true); setFormError(""); setFormSuccess(""); }}
              className="flex items-center gap-2 px-5 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Organisation
            </button>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Organisations", value: stats.totalCompanies, icon: Building2, color: "bg-blue-50 text-blue-700" },
            { label: "Active Organisations", value: stats.activeCompanies, icon: CheckCircle, color: "bg-green-50 text-green-700" },
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-purple-50 text-purple-700" },
            { label: "System Health", value: stats.systemHealth, icon: Activity, color: "bg-emerald-50 text-emerald-700" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Organisations Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Organisations
              </h2>
              <p className="text-sm text-gray-500">{companies.length} organisations registered on the platform</p>
            </div>
            <button onClick={loadData} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mr-3" />
              <span className="text-gray-500">Loading organisations...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No organisations yet</p>
              <p className="text-sm">Create the first organisation to get started</p>
              <button
                onClick={() => setShowCreateOrg(true)}
                className="mt-4 px-5 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors"
              >
                Create Organisation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-6 font-semibold text-gray-600">Organisation</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Domain</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Plan</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Created</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{company.name}</p>
                            <p className="text-xs text-gray-400">{company.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{company.domain || '—'}</td>
                      <td className="py-4 px-4">
                        <span className="capitalize text-gray-700">{company.plan || 'professional'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(company.status)}`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-500">
                        {new Date(company.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedCompany(company); setNewAdmin({ ...newAdmin, company_id: company.id }); setShowCreateAdmin(true); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            Add Admin
                          </button>
                          {company.status === 'active' ? (
                            <button
                              onClick={() => handleSuspendOrg(company)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => apiClient.updateCompany(company.id, { status: 'active' } as any).then(loadData)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-green-300 text-green-600 rounded hover:bg-green-50 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Organisation Modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Organisation</h3>
                <p className="text-sm text-gray-500">Add a new company to the OrdinCore platform</p>
              </div>
              <button onClick={() => setShowCreateOrg(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded text-sm border border-red-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name *</label>
                <input
                  type="text"
                  required
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="e.g. Oakwood Care Group"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={newOrg.domain}
                  onChange={(e) => setNewOrg({ ...newOrg, domain: e.target.value })}
                  placeholder="e.g. oakwoodcare.co.uk"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={newOrg.contactEmail}
                  onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={newOrg.plan}
                  onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOrg(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Organisation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Company Admin</h3>
                <p className="text-sm text-gray-500">
                  {selectedCompany ? `Creating admin for ${selectedCompany.name}` : 'Create a new company administrator account'}
                </p>
              </div>
              <button onClick={() => { setShowCreateAdmin(false); setSelectedCompany(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded text-sm border border-red-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.first_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.last_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation *</label>
                <select
                  required
                  value={newAdmin.company_id}
                  onChange={(e) => setNewAdmin({ ...newAdmin, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                >
                  <option value="">Select organisation...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateAdmin(false); setSelectedCompany(null); }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Admin Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
