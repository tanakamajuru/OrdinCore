import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, Key, ShieldCheck, ShieldAlert,
  Edit, Trash2, CheckCircle, AlertCircle, X
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  is_active: boolean;
  company_id: string;
  company_name?: string;
}

interface ManageAdminsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string | null;
  companyName?: string;
}

const ManageAdminsModal: React.FC<ManageAdminsModalProps> = ({ isOpen, onClose, companyId, companyName }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const trimmedSearch = searchTerm.trim();
      const params = new URLSearchParams();
      params.append('role', 'ADMIN');
      params.append('limit', '100');
      
      if (trimmedSearch) params.append('search', trimmedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (companyId) params.append('company_id', companyId);

      const url = `/users?${params.toString()}`;
      const response = await apiClient.get<any>(url);
      
      if (response && response.success) {
        setAdmins(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchAdmins();
      }, 500); // Increased debounce for better stability
      return () => clearTimeout(timer);
    }
  }, [isOpen, statusFilter, companyId, searchTerm]);



  const toggleAdminStatus = async (admin: AdminUser) => {
    const newStatus = admin.status === 'active' ? 'suspend' : 'activate';
    try {
      const response = await apiClient.patch<any>(`/users/${admin.id}/${newStatus}`, {});
      if (response.success) {
        toast.success(`Admin ${newStatus}d successfully`);
        fetchAdmins();
      }
    } catch (error) {
      toast.error(`Failed to ${newStatus} admin`);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin || !newPassword) return;
    if (newPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await apiClient.patch<any>(`/users/${selectedAdmin.id}/password`, { password: newPassword });
      if (response.success) {
        toast.success('Password reset successfully');
        setShowPasswordReset(false);
        setNewPassword('');
        setSelectedAdmin(null);
      }
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl  text-foreground">
                {companyName ? `Admins for ${companyName}` : 'Manage Company Admins'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {companyName ? `Managing administrative access for this organisation` : 'Platform-wide administrative control'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted/80 rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-border flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="text-xs  text-muted-foreground uppercase tracking-wider mb-1 block">Search Admins</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer z-10 bg-muted hover:bg-muted/80 rounded-full"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-48">
            <label className="text-xs  text-muted-foreground uppercase tracking-wider mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <button 
            onClick={fetchAdmins}
            className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-border mb-4" />
              <p>Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-20 bg-muted rounded-xl border border-dashed border-border">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg  text-foreground">No admins found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground  uppercase text-[10px] tracking-widest border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Admin Details</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/5 rounded-full flex items-center justify-center  text-foreground text-xs">
                            {admin.first_name[0]}{admin.last_name[0]}
                          </div>
                          <div>
                            <p className=" text-foreground">{admin.first_name} {admin.last_name}</p>
                            <p className="text-xs text-muted-foreground">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]  uppercase tracking-wider ${
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
                             <span className="text-[10px]  text-muted-foreground uppercase tracking-tighter mb-0.5">Activate / Deactivate</span>
                             <Switch 
                                checked={admin.status === 'active'} 
                                onCheckedChange={() => toggleAdminStatus(admin)}
                             />
                          </div>
                          <div className="h-8 w-[1px] bg-muted mx-1" />
                          <button
                            onClick={() => { setSelectedAdmin(admin); setShowPasswordReset(true); }}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
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

      {/* Password Reset Modal Overlay */}
      {showPasswordReset && selectedAdmin && (
        <div className="fixed inset-0 bg-primary/40 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 border border-border">
            <h3 className="text-lg  text-foreground mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-foreground" />
              Reset Admin Password
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Enter a new password for <span className=" text-foreground">{selectedAdmin.first_name}</span>. They will need to use this to log in immediately.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="New Password (min 8 chars)"
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPasswordReset(false); setNewPassword(''); }}
                  className="flex-1 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm "
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isSubmitting || newPassword.length < 8}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-[#008394] transition-colors text-sm  disabled:opacity-50"
                >
                  {isSubmitting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdminsModal;
