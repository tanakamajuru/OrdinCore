import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  last_login: string | null;
  company_id: string;
  profile?: {
    phone?: string;
    job_title?: string;
    avatar_url?: string;
  };
}

interface HouseInfo {
  id: string;
  name: string;
  address: string;
}

const ROLE_LABELS: Record<string, string> = {
  REGISTERED_MANAGER: 'Registered Manager',
  RESPONSIBLE_INDIVIDUAL: 'Responsible Individual',
  DIRECTOR: 'Director',
  ADMIN: 'Company Admin',
  SUPER_ADMIN: 'Super Admin',
};

const RM_PERMISSIONS = [
  'Dashboard Access',
  'Governance Pulse Submission',
  'Risk Register Management',
  'Serious Incident Reporting',
  'Reports & Analytics',
];

export function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [houses, setHouses] = useState<HouseInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    loadHouses();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const data = res.data as any;
      setUser(data.data || data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } finally {
      setIsLoading(false);
    }
  };

  const loadHouses = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      if (!userId) return;
      const res = await apiClient.get(`/users/${userId}/houses`);
      const data = res.data as any;
      setHouses(data.data || data || []);
    } catch (err) {
      // ignore
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('Image is too large. Please select an image under 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      await apiClient.patch('/auth/profile', {
        avatar_url: tempAvatar,
      });
      toast.success('Profile picture updated successfully');
      loadProfile();
      setTempAvatar(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setIsChangingPassword(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  );

  const displayUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = `${displayUser.first_name || ''} ${displayUser.last_name || ''}`.trim();

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Profile</h1>
          <p className="text-gray-600 mt-1">Your account information and settings</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white border-2 border-black p-6">
            <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b-2 border-gray-100">
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-gray-100 flex items-center justify-center relative group">
                  {(tempAvatar || displayUser.profile?.avatar_url) ? (
                    <img src={tempAvatar || displayUser.profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl font-bold text-gray-400">
                       {(displayUser.first_name?.[0] || '') + (displayUser.last_name?.[0] || '')}
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
                    CHANGE
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                </div>
                {tempAvatar && (
                  <button 
                    onClick={handleUpdateProfile} 
                    disabled={isUpdatingProfile}
                    className="text-xs bg-black text-white px-2 py-1 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save New Picture'}
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-4 text-black">User Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-300 text-black">{fullName || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Role</label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-300 text-black capitalize">
                      {ROLE_LABELS[displayUser.role] || displayUser.role?.replace(/_/g, ' ').toLowerCase() || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-300 text-black">{displayUser.email || '—'}</div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Status</label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-300 text-black capitalize">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${displayUser.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {displayUser.status || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {houses.length > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Assigned Sites</h2>
              <div className="space-y-2">
                {houses.map((h: any) => (
                  <div key={h.id} className="flex justify-between items-center p-3 border border-gray-300">
                    <div>
                      <p className="font-medium text-black">{h.name}</p>
                      <p className="text-sm text-gray-600">{h.address}</p>
                    </div>
                    <span className="text-xs bg-black text-white px-2 py-1">Assigned</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Activity</h2>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Login</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 text-black">
                {formatDate(displayUser.last_login)}
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Permissions</h2>
            <div className="space-y-2">
              {RM_PERMISSIONS.map(perm => (
                <div key={perm} className="flex items-center justify-between p-3 border border-gray-300">
                  <span className="text-black">{perm}</span>
                  <span className="text-green-600 font-semibold">✓ Granted</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Account Actions</h2>
            </div>
            {!isChangingPassword ? (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPass}
                    onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {pwLoading ? 'Saving...' : 'Save Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsChangingPassword(false); setPasswordForm({ current: '', newPass: '', confirm: '' }); }}
                    className="flex-1 py-2 px-4 border-2 border-black hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
