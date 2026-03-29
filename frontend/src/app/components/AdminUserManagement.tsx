import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Users, UserPlus, Edit, Trash2, Key, Search } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  assigned_house?: string;
  assigned_house_id?: string;
  assigned_house_name?: string;
  pulse_days?: string[];
  organization?: string;
  created_at?: string;
  updated_at?: string;
}

interface House {
  id: string;
  name: string;
  house_code: string;
  address?: string;
  city?: string;
  county?: string;
  postcode?: string;
  manager_id?: string;
  manager_name?: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { [key: string]: number };
  assignedToHouse: number;
  monthlyRegistrations: Array<{ month: string; count: number }>;
}


const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: '',
    organization: '',
    assignedHouse: '',
    pulseDays: [] as string[],
    isActive: true
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // House reassignment state
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedNewManager, setSelectedNewManager] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter && statusFilter !== 'all' && { is_active: statusFilter === 'active' ? 'true' : 'false' })
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const users = data.data?.users ?? data.data ?? [];
        setUsers(Array.isArray(users) ? users : []);
        setTotalPages(data.data?.totalPages ?? data.pagination?.totalPages ?? 1);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  // Fetch user statistics — uses the users list to derive simple counts
  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users?page=1&limit=100`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const list: any[] = data.data?.users ?? data.data ?? [];
        const total = list.length;
        const active = list.filter((u: any) => u.is_active !== false).length;
        setStats({
          total,
          active,
          inactive: total - active,
          byRole: {},
          assignedToHouse: list.filter((u: any) => u.assigned_house_id || u.assigned_house || u.house_id).length,
          monthlyRegistrations: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  // Fetch current user info
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/auth/me`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchMe();
  }, []);

  // Fetch houses for dropdown
  useEffect(() => {
    const fetchHousesForDropdown = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/houses?limit=100`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
          const data = await response.json();
          const list = data.data?.houses ?? data.data ?? [];
          setHouses(Array.isArray(list) ? list : []);
        } else {
          setHouses([]);
        }
      } catch (error) {
        console.error('Error fetching houses:', error);
        setHouses([]);
      }
    };
    fetchHousesForDropdown();
  }, []);

  // Create user
  const handleCreateUser = async () => {
    try {
      // Derive backend role string (backend expects UPPER_CASE)
      const backendRole = formData.role.toUpperCase().replace(/-/g, '_');

      // Split name into first/last
      const nameParts = formData.name.trim().split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const requestData: any = {
        email: formData.email,
        first_name,
        last_name,
        password: formData.password,
        role: backendRole,
        is_active: formData.isActive,
      };
      if (formData.assignedHouse && formData.assignedHouse.trim()) {
        requestData.house_id = formData.assignedHouse;
        requestData.pulse_days = formData.pulseDays;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success('User created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchUsers();
        fetchStats();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create user' }));
        toast.error(errorData.message || errorData.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user failed:', error);
      toast.error('Network error occurred');
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      // Split name into first/last
      const nameParts = formData.name.trim().split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          email: formData.email,
          first_name,
          last_name,
          role: formData.role.toUpperCase().replace(/-/g, '_'),
          is_active: formData.isActive,
          house_id: formData.assignedHouse || null,
          pulse_days: formData.pulseDays,
        }),
      });
      if (response.ok) {
        toast.success('User updated successfully');
        setIsEditDialogOpen(false);
        resetForm();
        fetchUsers();
        fetchStats();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser || passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users/${selectedUser.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ password: passwordData.newPassword }),
      });
      if (response.ok) {
        toast.success('Password reset successfully');
        setIsPasswordDialogOpen(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        // Fetch fresh data to ensure table updates
        await Promise.all([fetchUsers(), fetchStats()]);
      } else {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Delete user error:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: 'Failed to delete user' };
        }

        // Check if error is about house management
        if (errorData && errorData.error && errorData.error.includes('managing a house')) {
          // Open reassignment dialog instead of showing error
          setUserToDelete(selectedUser);
          setIsDeleteDialogOpen(false);
          setIsReassignDialogOpen(true);
        } else {
          // Show detailed error information
          const errorMessage = errorData.error || errorData.message || "Failed to delete user";
          console.error('Detailed error:', errorData);
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Delete user failed:', error);
      toast.error("Network error occurred");
    }
  };

  // Direct delete user (for after house reassignment)
  const directDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        setUserToDelete(null);
        setSelectedNewManager('');
        // Fetch fresh data to ensure table updates
        await Promise.all([fetchUsers(), fetchStats()]);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error('Delete user failed:', error);
      toast.error("Network error occurred");
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: '',
      organization: '',
      assignedHouse: '',
      pulseDays: [],
      isActive: true
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    // Ensure role is in backend format (uppercase) for conditional UI fields
    const formattedRole = user.role.toUpperCase().replace(/-/g, '_');
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: formattedRole,
      organization: user.organization || '',
      assignedHouse: user.assigned_house_id || '',
      pulseDays: user.pulse_days || [],
      isActive: user.is_active
    });
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setIsPasswordDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    const r = role.toLowerCase().replace(/_/g, '-');
    switch (r) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'director': return 'bg-purple-100 text-purple-800';
      case 'registered-manager': return 'bg-blue-100 text-blue-800';
      case 'team-leader': return 'bg-orange-100 text-orange-800';
      case 'responsible-individual': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle house reassignment
  const handleReassignHouse = async () => {
    if (!userToDelete || !selectedNewManager || selectedNewManager === 'none') {
      toast.error('Please select a new manager');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/houses/${userToDelete.assigned_house}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          manager_id: selectedNewManager === 'none' ? null : selectedNewManager,
        }),
      });

      if (response.ok) {
        toast.success("House reassigned successfully");
        setIsReassignDialogOpen(false);
        setUserToDelete(null);
        setSelectedNewManager('');

        // Now delete the user directly
        await directDeleteUser(userToDelete.id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reassign house");
      }
    } catch (error) {
      console.error('Reassign house failed:', error);
      toast.error("Failed to reassign house");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center border-border text-foreground hover:bg-muted"
          >
            <Key className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-primary">User Management</h1>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Total Users</h2>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Active Users</h2>
              <Users className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Inactive Users</h2>
              <Users className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold text-destructive">{stats.inactive}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Assigned to Houses</h2>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.assignedToHouse}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border-2 border-border p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-primary mb-2">Filters</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search" className="text-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border-2 border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="role" className="text-foreground">Role</Label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
              <option value="registered-manager">Registered Manager</option>
              <option value="team-leader">Team Leader</option>
              <option value="responsible-individual">Responsible Individual</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="status" className="text-foreground">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-2 border-border bg-card shadow-sm">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-primary mb-1">Users</h2>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="text-primary font-bold">Name</TableHead>
                  <TableHead className="text-primary font-bold">Email</TableHead>
                  <TableHead className="text-primary font-bold">Role</TableHead>
                  <TableHead className="text-primary font-bold">Assigned House</TableHead>
                  <TableHead className="text-primary font-bold">Pulse Days</TableHead>
                  <TableHead className="text-primary font-bold">Status</TableHead>
                  <TableHead className="text-primary font-bold">Created</TableHead>
                  <TableHead className="text-primary font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                    <TableCell className="text-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(user.role)} shadow-sm border-none`}>
                        {user.role.toLowerCase().replace(/_|-/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{user.assigned_house_name || '-'}</TableCell>
                    <TableCell>
                      {['registered manager', 'team leader'].includes(user.role.toLowerCase().replace(/_|-/g, ' ')) && user.pulse_days ? (
                        <div className="flex flex-wrap gap-1">
                          {user.pulse_days.map((day) => (
                            <Badge key={day} variant="outline" className="text-[10px] border-border text-muted-foreground">
                              {day.slice(0, 3)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'} className={user.is_active ? "bg-success text-success-foreground" : ""}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {new Date(user.created_at || '').toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPasswordDialog(user)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECTOR">Director</SelectItem>
                  <SelectItem value="REGISTERED_MANAGER">Registered Manager</SelectItem>
                  <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                  <SelectItem value="RESPONSIBLE_INDIVIDUAL">Responsible Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentUser?.role === 'SUPER_ADMIN' ? (
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Enter organization ID"
                />
              </div>
            ) : (
              <div>
                <Label>Organization</Label>
                <div className="p-2 border-2 border-border rounded bg-muted text-muted-foreground">
                  {currentUser?.company_name || 'Your Organization'}
                </div>
              </div>
            )}
            {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(formData.role) && (
              <div>
                <Label htmlFor="assignedHouse">Assigned House</Label>
                <Select value={formData.assignedHouse} onValueChange={(value) => setFormData({ ...formData, assignedHouse: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select house" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No house assigned</SelectItem>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.name} ({house.house_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(formData.role) && (
              <div>
                <Label className="text-base font-medium">Pulse Days</Label>
                <p className="text-sm text-muted-foreground mb-3">Select the days when this manager should perform their governance pulse</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-${day}`}
                        checked={formData.pulseDays.includes(day)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              pulseDays: [...formData.pulseDays, day]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              pulseDays: formData.pulseDays.filter(d => d !== day)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`create-${day}`} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="DIRECTOR">Director</SelectItem>
                  <SelectItem value="REGISTERED_MANAGER">Registered Manager</SelectItem>
                  <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                  <SelectItem value="RESPONSIBLE_INDIVIDUAL">Responsible Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentUser?.role === 'SUPER_ADMIN' ? (
              <div>
                <Label htmlFor="edit-organization">Organization</Label>
                <Input
                  id="edit-organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Enter organization ID"
                />
              </div>
            ) : (
              <div>
                <Label>Organization</Label>
                <div className="p-2 border-2 border-border rounded bg-muted text-muted-foreground">
                  {currentUser?.company_name || 'Your Organization'}
                </div>
              </div>
            )}
            {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(formData.role) && (
              <div>
                <Label htmlFor="edit-assignedHouse">Assigned House</Label>
                <Select value={formData.assignedHouse} onValueChange={(value) => setFormData({ ...formData, assignedHouse: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select house" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No house assigned</SelectItem>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.name} ({house.house_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(formData.role) && (
              <div>
                <Label className="text-base font-medium">Pulse Days</Label>
                <p className="text-sm text-muted-foreground mb-3">Select the days when this manager should perform their governance pulse</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${day}`}
                        checked={formData.pulseDays.includes(day)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              pulseDays: [...formData.pulseDays, day]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              pulseDays: formData.pulseDays.filter(d => d !== day)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`edit-${day}`} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              for {selectedUser?.name} ({selectedUser?.email}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-800">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* House Reassignment Dialog */}
      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign House Manager</DialogTitle>
            <DialogDescription>
              {userToDelete?.name} is currently managing a house. Please select a new manager before deleting this user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newManager">New Manager</Label>
              <Select value={selectedNewManager} onValueChange={setSelectedNewManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a new manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users
                    .filter(user => {
                      // Don't show the user being deleted
                      if (user.id === userToDelete?.id) return false;

                      // Only show users who can be managers (registered-manager, team-leader or higher)
                      return ['REGISTERED_MANAGER', 'TEAM_LEADER', 'ADMIN', 'DIRECTOR'].includes(user.role.toUpperCase().replace(/-/g, '_'));
                    })
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.role}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassignHouse}>
              Reassign & Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
