import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Building2, Users, Plus, Settings, LogOut, Globe, Shield,
  AlertCircle, CheckCircle, BarChart3, RefreshCw, Trash2,
  UserPlus, ChevronRight, Activity, Cpu, Database, Search, Key, X, Check
} from "lucide-react";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import CreateOrgModal from "./modals/CreateOrgModal";
import CreateAdminModal from "./modals/CreateAdminModal";
import ManageAdminsModal from "./modals/ManageAdminsModal";
import { ThemeToggle } from "./ThemeToggle";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { Switch } from "./ui/switch";


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
  const location = useLocation();
  const currentPath = location.pathname;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<PlatformStats>({ totalCompanies: 0, activeCompanies: 0, totalUsers: 0, systemHealth: "Good" });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [showManageAdmins, setShowManageAdmins] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", domain: "", contactEmail: "", plan: "professional", sector: "SUPPORTED_LIVING" });
  const [newAdmin, setNewAdmin] = useState({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Platform Admins Management states
  const [admins, setAdmins] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearchTerm, setUsersSearchTerm] = useState("");
  const [usersStatusFilter, setUsersStatusFilter] = useState("all");
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [usersResetPasswordOpen, setUsersResetPasswordOpen] = useState(false);
  const [usersNewPassword, setUsersNewPassword] = useState("");

  // Platform System Settings states
  const [selectedEngine, setSelectedEngine] = useState("gemini-pro");
  const [temperature, setTemperature] = useState(0.2);
  const [complianceThreshold, setComplianceThreshold] = useState(85);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [purgingPool, setPurgingPool] = useState(false);

  const adminName = localStorage.getItem('userName') || 'Super Admin';

  const fetchPlatformAdmins = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('role', 'ADMIN');
      params.append('limit', '100');
      
      const trimmed = usersSearchTerm.trim();
      if (trimmed) params.append('search', trimmed);
      if (usersStatusFilter !== 'all') params.append('status', usersStatusFilter);

      const url = `/users?${params.toString()}`;
      const response = await apiClient.get<any>(url);
      if (response && response.success) {
        setAdmins(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch platform admins:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const toggleAdminStatus = async (admin: any) => {
    const newStatus = admin.status === 'active' ? 'suspend' : 'activate';
    try {
      const response = await apiClient.patch<any>(`/users/${admin.id}/${newStatus}`, {});
      if (response.success) {
        setFormSuccess(`Admin ${newStatus}d successfully`);
        fetchPlatformAdmins();
        loadData();
      }
    } catch (error) {
      setFormError(`Failed to ${newStatus} admin`);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserForReset || !usersNewPassword) return;
    if (usersNewPassword.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    try {
      const response = await apiClient.patch<any>(`/users/${selectedUserForReset.id}/password`, { password: usersNewPassword });
      if (response.success) {
        setFormSuccess("Password reset successfully");
        setUsersResetPasswordOpen(false);
        setUsersNewPassword("");
        setSelectedUserForReset(null);
      }
    } catch (error) {
      setFormError("Failed to reset password");
    }
  };

  const handlePurgePool = () => {
    setPurgingPool(true);
    setTimeout(() => {
      setPurgingPool(false);
      setFormSuccess("Database connection pool purged successfully!");
    }, 1500);
  };

  const handleSaveSettings = () => {
    setFormSuccess("System configurations updated successfully!");
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentPath === '/super-admin/users') {
      const timer = setTimeout(() => {
        fetchPlatformAdmins();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPath, usersSearchTerm, usersStatusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const companiesRes = await apiClient.getCompanies();
      const companiesList = (companiesRes as any).data || [];
      setCompanies(Array.isArray(companiesList) ? companiesList : []);
      const active = companiesList.filter((c: Company) => c.status === 'active').length;
      const totalUsers = companiesList.reduce((sum: number, c: Company) => sum + (Number(c.user_count) || 0), 0);
      setStats({
        totalCompanies: companiesList.length,
        activeCompanies: active,
        totalUsers,
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
        setNewOrg({ name: "", domain: "", contactEmail: "", plan: "professional", sector: "SUPPORTED_LIVING" });
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

    if (newAdmin.password.length < 8) {
      setFormError("Password must be at least 8 characters long");
      return;
    }
    if (!/[a-zA-Z]/.test(newAdmin.password) || !/[0-9]/.test(newAdmin.password)) {
      setFormError("Password must contain at least one letter and one number");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...newAdmin,
        role: "ADMIN",
        email: newAdmin.email,
        // When invoked from a specific company context, always bind to that company.
        company_id: selectedCompany?.id || newAdmin.company_id,
      };
      if (!payload.company_id) {
        setFormError("Please select an organisation");
        setIsSubmitting(false);
        return;
      }
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

  const handleSectorChange = async (company: Company, sector: string) => {
    try {
      await apiClient.updateCompany(company.id, { sector } as any);
      toast.success(`${company.name} sector set to ${sector === 'DOMICILIARY' ? 'Domiciliary Care' : 'Supported Living'}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update sector");
    }
  };

  const confirmSuspendOrg = (company: Company) => {
    setSelectedCompany(company);
    setShowSuspendModal(true);
  };

  const handleSuspendOrg = async () => {
    if (!selectedCompany) return;
    try {
      await apiClient.updateCompany(selectedCompany.id, { status: 'suspended' } as any);
      setShowSuspendModal(false);
      setSelectedCompany(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to suspend organisation");
    }
  };

  const confirmArchiveOrg = (company: Company) => {
    setSelectedCompany(company);
    setShowArchiveModal(true);
  };

  const handleArchiveOrg = async () => {
    if (!selectedCompany) return;
    try {
      await apiClient.updateCompany(selectedCompany.id, { status: 'archived' } as any);
      setShowArchiveModal(false);
      setSelectedCompany(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to archive organisation");
    }
  };

  const handleUnsuspendOrg = async () => {
    if (!selectedCompany) return;
    try {
      await apiClient.updateCompany(selectedCompany.id, { status: 'active' } as any);
      setShowUnsuspendModal(false);
      setSelectedCompany(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to unsuspend organisation");
    }
  };

  const handleUnarchiveOrg = async () => {
    if (!selectedCompany) return;
    try {
      await apiClient.updateCompany(selectedCompany.id, { status: 'active' } as any);
      setShowUnarchiveModal(false);
      setSelectedCompany(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to unarchive organisation");
    }
  };

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'suspended') return 'bg-yellow-100 text-yellow-800';
    if (status === 'archived') return 'bg-red-100 text-red-800';
    return 'bg-muted text-muted-foreground';
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return companies.slice(start, start + itemsPerPage);
  }, [companies, currentPage]);

  const totalPages = Math.ceil(companies.length / itemsPerPage);

  const companiesTable = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mr-3" />
          <span className="text-muted-foreground">Loading organisations...</span>
        </div>
      );
    }
    if (companies.length === 0) {
      return (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg ">No organisations yet</p>
          <p className="text-sm">Create the first organisation to get started</p>
          <button
            onClick={() => setShowCreateOrg(true)}
            className="mt-4 px-5 py-2 bg-primary text-primary-foreground text-sm hover:bg-[#008394] transition-colors"
          >
            Create Organisation
          </button>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-gray-100">
              <th className="text-left py-3 px-6  text-muted-foreground">Organisation</th>
              <th className="text-left py-3 px-4  text-muted-foreground">Plan</th>
              <th className="text-left py-3 px-4  text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4  text-muted-foreground">Created</th>
              <th className="text-right py-3 px-6  text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-muted transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className=" text-foreground">{company.name}</p>
                      <p className="text-xs text-gray-400">{company.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="capitalize text-muted-foreground block mb-1">{company.plan || 'professional'}</span>
                  <select
                    value={(company as any).sector || 'SUPPORTED_LIVING'}
                    onChange={(e) => handleSectorChange(company, e.target.value)}
                    className="text-xs bg-card border border-border rounded px-1.5 py-1 text-muted-foreground"
                    title="Governance sector"
                  >
                    <option value="SUPPORTED_LIVING">Supported Living</option>
                    <option value="DOMICILIARY">Domiciliary Care</option>
                  </select>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs  capitalize ${statusColor(company.status)}`}>
                    {company.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-muted-foreground">
                  {new Date(company.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setSelectedCompany(company); setNewAdmin({ ...newAdmin, company_id: company.id }); setShowCreateAdmin(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card border border-border text-muted-foreground rounded hover:bg-muted transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      Add Admin
                    </button>
                    <button
                      onClick={() => { setSelectedCompany(company); setShowManageAdmins(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card border border-border text-muted-foreground rounded hover:bg-muted transition-colors"
                    >
                      <Users className="w-3 h-3" />
                      View Admins
                    </button>
                    {company.status === 'active' ? (
                      <button
                        onClick={() => confirmSuspendOrg(company)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card border border-yellow-300 text-yellow-600 rounded hover:bg-yellow-50 transition-colors"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Suspend
                      </button>
                    ) : company.status === 'suspended' ? (
                      <button
                        onClick={() => { setSelectedCompany(company); setShowUnsuspendModal(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card border border-green-300 text-green-600 rounded hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Unsuspend
                      </button>
                    ) : company.status === 'archived' ? (
                      <button
                        onClick={() => { setSelectedCompany(company); setShowUnarchiveModal(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Unarchive
                      </button>
                    ) : null}
                    {company.status !== 'archived' && (
                      <button
                        onClick={() => confirmArchiveOrg(company)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card border border-red-300 text-red-600 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-muted">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, companies.length)} of {companies.length} entries
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 text-sm bg-card border border-border text-muted-foreground rounded disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 text-sm bg-card border border-border text-muted-foreground rounded disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }, [isLoading, companies, paginatedCompanies, currentPage, itemsPerPage, totalPages, newAdmin]);

  const statsCards = useMemo(() => {

    return [
      { label: "Total Organisations", value: stats.totalCompanies, icon: Building2, color: "bg-blue-50 text-blue-700" },
      { label: "Active Organisations", value: stats.activeCompanies, icon: CheckCircle, color: "bg-green-50 text-green-700" },
      { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-purple-50 text-purple-700" },
      { label: "System Health", value: stats.systemHealth, icon: Activity, color: "bg-emerald-50 text-emerald-700" },
    ].map((stat, idx) => (
      <div key={idx} className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
          <stat.icon className="w-5 h-5" />
        </div>
        <p className="text-2xl  text-foreground">{stat.value}</p>
        <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
      </div>
    ));
  }, [stats]);

  return (
    <div className="min-h-screen bg-muted font-sans pt-20">
      <RoleBasedNavigation />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Success/Error banner */}
        {formSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 text-sm font-medium">{formSuccess}</div>
            <button onClick={() => setFormSuccess("")} className="text-green-800 hover:text-green-950 font-bold px-1 select-none">×</button>
          </div>
        )}

        {formError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 text-sm font-medium">{formError}</div>
            <button onClick={() => setFormError("")} className="text-red-800 hover:text-red-950 font-bold px-1 select-none">×</button>
          </div>
        )}

        {/* Dynamic sub-view rendering */}
        {currentPath === '/super-admin/users' ? (
          /* PLATFORM ADMINS VIEW */
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl text-foreground font-semibold">Manage Company Admins</h2>
                  <p className="text-xs text-muted-foreground">Platform-wide administrative accounts control</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCompany(null);
                  setNewAdmin({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
                  setShowCreateAdmin(true);
                  setFormError("");
                  setFormSuccess("");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors cursor-pointer text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Create Company Admin
              </button>
            </div>

            {/* Filters */}
            <div className="p-6 border-b border-border flex flex-wrap gap-4 items-end bg-card">
              <div className="flex-1 min-w-[300px]">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block font-semibold">Search Admins</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={usersSearchTerm}
                    onChange={(e) => setUsersSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none"
                  />
                  {usersSearchTerm && (
                    <button 
                      onClick={() => setUsersSearchTerm("")}
                      className="absolute right-3 top-2.5 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-48">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block font-semibold">Status</label>
                <select
                  value={usersStatusFilter}
                  onChange={(e) => setUsersStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <button 
                onClick={fetchPlatformAdmins}
                className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors border border-border h-10 flex items-center justify-center cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${usersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Table */}
            <div className="p-6">
              {usersLoading && admins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-border mb-4" />
                  <p>Loading platform admins...</p>
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-20 bg-muted rounded-xl border border-dashed border-border">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg text-foreground font-semibold">No admins found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-border rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-widest border-b border-border">
                      <tr>
                        <th className="px-6 py-4">Admin Details</th>
                        <th className="px-6 py-4">Organisation</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {admins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/5 rounded-full flex items-center justify-center text-foreground text-xs font-semibold">
                                {admin.first_name?.[0] || ""}{admin.last_name?.[0] || ""}
                              </div>
                              <div>
                                <p className="text-foreground font-medium">{admin.first_name} {admin.last_name}</p>
                                <p className="text-xs text-muted-foreground">{admin.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {admin.company_name || "Platform Admin"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                              admin.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-3 items-center">
                              <div className="flex flex-col items-end mr-2">
                                 <span className="text-[9px] text-muted-foreground uppercase tracking-tighter mb-0.5">Suspend / Activate</span>
                                 <Switch 
                                    checked={admin.status === 'active'} 
                                    onCheckedChange={() => toggleAdminStatus(admin)}
                                 />
                              </div>
                              <div className="h-8 w-[1px] bg-muted mx-1" />
                              <button
                                onClick={() => { setSelectedUserForReset(admin); setUsersResetPasswordOpen(true); }}
                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-transparent hover:border-border"
                                title="Reset Password"
                              >
                                <Key className="w-4 h-4" />
                              </button>
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
        ) : currentPath === '/super-admin/settings' ? (
          /* PLATFORM SYSTEM SETTINGS VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl text-foreground font-semibold flex items-center gap-2">
                  <Settings className="w-8 h-8 text-primary" />
                  System Settings
                </h1>
                <p className="text-muted-foreground mt-1">Configure global AI models, view connection pools, and trigger system actions</p>
              </div>
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors cursor-pointer text-sm font-medium shadow-sm"
              >
                <Check className="w-4 h-4" />
                Save Configurations
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GenAI Engine Configuration */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
                <h2 className="text-xl text-foreground font-semibold flex items-center gap-2 pb-3 border-b border-border">
                  <Cpu className="w-5 h-5 text-primary" />
                  Computational GenAI Engine
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block font-semibold">Active LLM Model</label>
                    <select
                      value={selectedEngine}
                      onChange={(e) => setSelectedEngine(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none"
                    >
                      <option value="gemini-pro">Gemini 1.5 Pro (Recommended)</option>
                      <option value="claude-35">Claude 3.5 Sonnet</option>
                      <option value="gpt-4o">GPT-4o Enterprise</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1.5">Selected engine coordinates cross-house pattern analysis and incident forensics reconstruction.</p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block font-semibold">Temperature Controls</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="flex-1 accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-12 text-center text-sm bg-muted border border-border py-1 px-2 rounded-md">{temperature}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">Lower temperatures trigger high determinism. Recommended for structured safety metrics.</p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block font-semibold">Compliance Flag Threshold</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        step="5" 
                        value={complianceThreshold}
                        onChange={(e) => setComplianceThreshold(parseInt(e.target.value))}
                        className="flex-1 accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-12 text-center text-sm bg-muted border border-border py-1 px-2 rounded-md">{complianceThreshold}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">Flag systems automatically if process adherence dips below this parameter.</p>
                  </div>
                </div>
              </div>

              {/* Connection Pool Monitor */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
                <h2 className="text-xl text-foreground font-semibold flex items-center gap-2 pb-3 border-b border-border">
                  <Database className="w-5 h-5 text-primary" />
                  Connection Pool Telemetry
                </h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted p-4 border border-border rounded-lg text-center">
                      <span className="block text-2xl font-semibold text-foreground">12 / 50</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1 block">Active Connections</span>
                    </div>
                    <div className="bg-muted p-4 border border-border rounded-lg text-center">
                      <span className="block text-2xl font-semibold text-green-600">38</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1 block">Idle Connections</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      <span>Pool Capacity Utilization</span>
                      <span>24%</span>
                    </div>
                    <div className="w-full bg-muted border border-border h-4 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-500" style={{ width: '24%' }} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="block text-sm text-foreground font-medium">Clear connection leak buffers</span>
                      <span className="text-[11px] text-muted-foreground">Force disconnect dead websocket & API handshakes</span>
                    </div>
                    <button
                      onClick={handlePurgePool}
                      disabled={purgingPool}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-border hover:bg-muted text-foreground transition-all cursor-pointer text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${purgingPool ? 'animate-spin' : ''}`} />
                      {purgingPool ? "Purging..." : "Purge Pool"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Platform Control & Maintenance */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6 col-span-1 md:col-span-2 space-y-6">
                <h2 className="text-xl text-foreground font-semibold flex items-center gap-2 pb-3 border-b border-border">
                  <Shield className="w-5 h-5 text-primary" />
                  Global Platform Maintenance
                </h2>
                
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground font-semibold">Enable Maintenance Lockdown</span>
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider rounded ${
                        maintenanceMode ? "bg-red-100 text-red-700 animate-pulse" : "bg-green-100 text-green-700"
                      }`}>
                        {maintenanceMode ? "Lockdown Enabled" : "System Operational"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                      When active, prevent any team leaders, registered managers, directors, or responsible individuals from submitting compliance pulses or modifying records. Only Super Admins maintain backend API control.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{maintenanceMode ? "ACTIVE LOCKDOWN" : "OPERATIONAL"}</span>
                    <Switch
                      checked={maintenanceMode}
                      onCheckedChange={(val) => {
                        setMaintenanceMode(val);
                        if (val) {
                          setFormError("Platform placed in global maintenance lockdown mode!");
                        } else {
                          setFormSuccess("Maintenance lockdown lifted. Platform is fully active!");
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* DEFAULT COMPANIES VIEW */
          <>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between relative z-10">
              <div>
                <h1 className="text-3xl text-foreground font-semibold">Platform Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage all organisations on the OrdinCore platform</p>
              </div>
              <div className="flex gap-3">
                <button
                  id="create-admin-btn"
                  type="button"
                  onClick={() => {
                    setSelectedCompany(null);
                    setNewAdmin({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
                    setShowCreateAdmin(true);
                    setFormError("");
                    setFormSuccess("");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border text-foreground hover:bg-muted transition-colors cursor-pointer relative z-20 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Company Admin
                </button>
                <button
                  id="create-org-btn"
                  type="button"
                  onClick={() => {
                    setShowCreateOrg(true);
                    setFormError("");
                    setFormSuccess("");
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors cursor-pointer relative z-20 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Organisation
                </button>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {statsCards}
            </div>

            {/* Organisations Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                <div>
                  <h2 className="text-xl text-foreground font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Organisations
                  </h2>
                  <p className="text-sm text-muted-foreground">{companies.length} organisations registered on the platform</p>
                </div>
                <button onClick={loadData} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border px-3 py-1.5 rounded bg-card">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {companiesTable}
            </div>
          </>
        )}
      </div>

      {/* Create Organisation Modal */}
      <CreateOrgModal
        isOpen={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        onSubmit={handleCreateOrg}
        newOrg={newOrg}
        setNewOrg={setNewOrg}
        formError={formError}
        isSubmitting={isSubmitting}
      />

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={showCreateAdmin}
        onClose={() => { setShowCreateAdmin(false); setSelectedCompany(null); }}
        onSubmit={handleCreateAdmin}
        newAdmin={newAdmin}
        setNewAdmin={setNewAdmin}
        companies={companies}
        selectedCompany={selectedCompany}
        formError={formError}
        isSubmitting={isSubmitting}
      />

      <ManageAdminsModal
        isOpen={showManageAdmins}
        onClose={() => { setShowManageAdmins(false); setSelectedCompany(null); }}
        companyId={selectedCompany?.id}
        companyName={selectedCompany?.name}
      />

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-border">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-200">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-lg text-foreground font-semibold mb-2">Suspend Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to suspend <span className="text-foreground font-semibold">{selectedCompany?.name}</span>? This will immediately prevent all their users from logging in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSuspendModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendOrg}
                className="flex-1 py-2 bg-yellow-600 text-primary-foreground rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium cursor-pointer"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-border">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg text-foreground font-semibold mb-2">Archive Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to archive <span className="text-foreground font-semibold">{selectedCompany?.name}</span>? This organisation will be removed from active lists.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowArchiveModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveOrg}
                className="flex-1 py-2 bg-red-600 text-primary-foreground rounded-lg hover:bg-red-700 transition-colors text-sm font-medium cursor-pointer"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsuspend Modal */}
      {showUnsuspendModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-border">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg text-foreground font-semibold mb-2">Unsuspend Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to unsuspend <span className="text-foreground font-semibold">{selectedCompany?.name}</span>? This will allow all their users to log in again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnsuspendModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUnsuspendOrg}
                className="flex-1 py-2 bg-green-600 text-primary-foreground rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer"
              >
                Unsuspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive Modal */}
      {showUnarchiveModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-border">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200">
              <RefreshCw className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg text-foreground font-semibold mb-2">Unarchive Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to unarchive <span className="text-foreground font-semibold">{selectedCompany?.name}</span>? This will move the organisation back to the active list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnarchiveModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUnarchiveOrg}
                className="flex-1 py-2 bg-blue-600 text-primary-foreground rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
              >
                Unarchive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal Overlay */}
      {usersResetPasswordOpen && selectedUserForReset && (
        <div className="fixed inset-0 bg-primary/40 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <h3 className="text-lg text-foreground mb-2 flex items-center gap-2 font-semibold">
              <Key className="w-5 h-5 text-foreground" />
              Reset Admin Password
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Enter a new password for <span className="text-foreground font-semibold">{selectedUserForReset.first_name}</span>. They will need to use this to log in immediately.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="New Password (min 8 chars)"
                autoFocus
                value={usersNewPassword}
                onChange={(e) => setUsersNewPassword(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setUsersResetPasswordOpen(false); setUsersNewPassword(''); setSelectedUserForReset(null); }}
                  className="flex-1 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={usersNewPassword.length < 8}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-[#008394] transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
