import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Building2, Users, Plus, Settings, LogOut, Globe, Shield,
  AlertCircle, CheckCircle, BarChart3, RefreshCw, Trash2,
  UserPlus, ChevronRight, Activity
} from "lucide-react";
import { apiClient } from "@/services/api";
import CreateOrgModal from "./modals/CreateOrgModal";
import CreateAdminModal from "./modals/CreateAdminModal";
import ManageAdminsModal from "./modals/ManageAdminsModal";
import { ThemeToggle } from "./ThemeToggle";


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
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [showManageAdmins, setShowManageAdmins] = useState(false);
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
                  <span className="capitalize text-muted-foreground">{company.plan || 'professional'}</span>
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

    <div className="min-h-screen bg-muted font-sans">
      {/* Top navigation */}
      <nav className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary-foreground" />
          <div>
            <span className="text-xl  tracking-tight">OrdinCore</span>
            <span className="ml-3 text-xs bg-card text-foreground px-2 py-0.5 rounded ">PLATFORM ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-gray-300">Welcome, {adminName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-primary-foreground transition-colors"
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
        <div className="mb-8 flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl  text-foreground">Platform Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage all organisations on the OrdinCore platform</p>
          </div>
          <div className="flex gap-3">
            <button
              id="create-admin-btn"
              type="button"
              onClick={() => {
                console.log("Create Admin Clicked");
                setShowCreateAdmin(true);
                setFormError("");
                setFormSuccess("");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border text-foreground  hover:bg-muted transition-colors cursor-pointer relative z-20"
            >
              <UserPlus className="w-4 h-4" />
              Create Company Admin
            </button>
            <button
              id="create-org-btn"
              type="button"
              onClick={() => {
                console.log("Create Org Clicked");
                setShowCreateOrg(true);
                setFormError("");
                setFormSuccess("");
              }}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground  hover:bg-[#008394] transition-colors cursor-pointer relative z-20"
            >
              <Plus className="w-4 h-4" />
              Create Organisation
            </button>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statsCards}
        </div>


        {/* Organisations Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl  text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Organisations
              </h2>
              <p className="text-sm text-muted-foreground">{companies.length} organisations registered on the platform</p>
            </div>
            <button onClick={loadData} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {companiesTable}
        </div>
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
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-lg  text-foreground mb-2">Suspend Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to suspend <span className=" text-foreground">{selectedCompany?.name}</span>? This will immediately prevent all their users from logging in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSuspendModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded hover:bg-muted transition-colors text-sm "
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendOrg}
                className="flex-1 py-2 bg-yellow-600 text-primary-foreground rounded hover:bg-yellow-700 transition-colors text-sm "
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg  text-foreground mb-2">Archive Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to archive <span className=" text-foreground">{selectedCompany?.name}</span>? This organisation will be removed from active lists.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowArchiveModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded hover:bg-muted transition-colors text-sm "
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveOrg}
                className="flex-1 py-2 bg-red-600 text-primary-foreground rounded hover:bg-red-700 transition-colors text-sm "
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Unsuspend Modal */}
      {showUnsuspendModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg  text-foreground mb-2">Unsuspend Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to unsuspend <span className=" text-foreground">{selectedCompany?.name}</span>? This will allow all their users to log in again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnsuspendModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded hover:bg-muted transition-colors text-sm "
              >
                Cancel
              </button>
              <button
                onClick={handleUnsuspendOrg}
                className="flex-1 py-2 bg-green-600 text-primary-foreground rounded hover:bg-green-700 transition-colors text-sm "
              >
                Unsuspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive Modal */}
      {showUnarchiveModal && (
        <div className="fixed inset-0 bg-primary/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg  text-foreground mb-2">Unarchive Organisation?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to unarchive <span className=" text-foreground">{selectedCompany?.name}</span>? This will move the organisation back to the active list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnarchiveModal(false); setSelectedCompany(null); }}
                className="flex-1 py-2 border border-border text-muted-foreground rounded hover:bg-muted transition-colors text-sm "
              >
                Cancel
              </button>
              <button
                onClick={handleUnarchiveOrg}
                className="flex-1 py-2 bg-blue-600 text-primary-foreground rounded hover:bg-blue-700 transition-colors text-sm "
              >
                Unarchive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
