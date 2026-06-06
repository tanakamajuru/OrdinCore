import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "../components/RoleBasedNavigation";
import apiClient from "@/services/apiClient";
import { toast } from "sonner";
import { UserPlus, Shield, Users, UserMinus } from "lucide-react";

interface House {
  id: string;
  name: string;
}

interface ServiceUser {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  is_active: boolean;
}

export function AdminServiceUsers() {
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<string>('');
  const [serviceUsers, setServiceUsers] = useState<ServiceUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: ''
  });

  useEffect(() => {
    fetchHouses();
  }, []);

  useEffect(() => {
    if (selectedHouse) {
      fetchServiceUsers(selectedHouse);
    } else {
      setServiceUsers([]);
    }
  }, [selectedHouse]);

  const fetchHouses = async () => {
    try {
      const res = await apiClient.get('/houses');
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : (data.houses || []);
      setHouses(list);
    } catch (err) {
      toast.error('Failed to load houses');
    }
  };

  const fetchServiceUsers = async (houseId: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/houses/${houseId}/service-users`);
      setServiceUsers(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load service users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouse) return toast.error("Please select a house first.");
    if (!formData.first_name.trim() || !formData.last_name.trim()) return toast.error("First and last name are required.");

    setIsSubmitting(true);
    try {
      await apiClient.post(`/houses/${selectedHouse}/service-users`, formData);
      toast.success("Service user added successfully");
      setFormData({ first_name: '', last_name: '' });
      fetchServiceUsers(selectedHouse);
    } catch (err) {
      toast.error("Failed to add service user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm("Are you sure you want to deactivate this user?")) return;
    try {
      await apiClient.patch(`/service-users/${id}`, { is_active: false });
      toast.success("Service user deactivated");
      fetchServiceUsers(selectedHouse);
    } catch (err) {
      toast.error("Failed to deactivate user");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 md:px-12 pt-28 max-w-6xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-primary pb-6">
          <div>
            <h1 className="text-4xl text-primary flex items-center gap-3 tracking-tighter uppercase">
              <Shield className="w-8 h-8" /> Service Users (Admin)
            </h1>
            <p className="text-muted-foreground mt-2 uppercase tracking-widest text-sm">
              Manage silent linking for pattern detection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card p-6 border-2 border-border">
              <h2 className="text-xl text-primary flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" /> Select Service
              </h2>
              <select 
                value={selectedHouse}
                onChange={e => setSelectedHouse(e.target.value)}
                className="w-full bg-background border-2 border-border p-3 focus:border-primary outline-none"
              >
                <option value="">Select Service...</option>
                {houses.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {selectedHouse && (
              <div className="bg-card p-6 border-2 border-primary/20">
                <h2 className="text-xl text-primary flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5" /> Add Patient
                </h2>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase text-muted-foreground mb-1 block">First Name</label>
                    <input 
                      type="text" 
                      value={formData.first_name}
                      onChange={e => setFormData(prev => ({...prev, first_name: e.target.value}))}
                      className="w-full bg-background border-2 border-border p-3 focus:border-primary outline-none"
                      placeholder="e.g. Thomas"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-muted-foreground mb-1 block">Last Name</label>
                    <input 
                      type="text" 
                      value={formData.last_name}
                      onChange={e => setFormData(prev => ({...prev, last_name: e.target.value}))}
                      className="w-full bg-background border-2 border-border p-3 focus:border-primary outline-none"
                      placeholder="e.g. Muller"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary text-primary-foreground uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Patient'}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Note: Names are securely hashed/truncated for UI display.
                  </p>
                </form>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card p-6 border-2 border-border min-h-[400px]">
              <h2 className="text-xl text-primary mb-6">Active Patients</h2>
              
              {!selectedHouse ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border">
                  Select a service to view and manage patients.
                </div>
              ) : isLoading ? (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                </div>
              ) : serviceUsers.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border">
                  No active patients registered for this service.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b-2 border-border text-xs uppercase tracking-widest text-muted-foreground">
                      <tr>
                        <th className="pb-3 px-4">Display Name (System Format)</th>
                        <th className="pb-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceUsers.map(user => (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4 font-mono text-sm">{user.display_name}</td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => handleDeactivate(user.id)}
                              className="text-xs text-destructive uppercase tracking-widest hover:underline flex items-center gap-1 justify-end w-full"
                            >
                              <UserMinus className="w-3 h-3" /> Deactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
