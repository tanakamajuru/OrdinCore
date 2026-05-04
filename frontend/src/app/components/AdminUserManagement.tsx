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
import { Users, UserPlus, Edit, Trash2, Key, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ROLES } from '../../constants/roles';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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


  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: '',
    organization: '',
    assignedHouse: '',
    assignedHouses: [] as string[],
    pulseDays: [] as string[],
    isActive: true
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });



  // Fetch users
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
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
        setTotalPages(data.meta?.pages ?? 1);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  // Fetch user statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users?page=1&limit=100`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const list: any[] = data.data?.users ?? data.data ?? [];
        const total = list.length;
        const active = list.filter((u: any) => u.status === 'active' || u.is_active !== false).length;
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
        console.error('Error fetching sites:', error);
        setHouses([]);
      }
    };
    fetchHousesForDropdown();
  }, []);

  const validateForm = () => {
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.name || formData.name.trim().length < 2) {
      toast.error('Please enter a full name');
      return false;
    }
    if (!formData.role) {
      toast.error('Please select a user role');
      return false;
    }
    // Only require password on create
    if (isCreateDialogOpen) {
      if (!formData.password || formData.password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return false;
      }
      if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
        toast.error('Password must contain at least one letter and one number');
        return false;
      }
    }
    return true;
  };

  // Create user
  const handleCreateUser = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const backendRole = formData.role.toUpperCase().replace(/-/g, '_');
      const nameParts = formData.name.trim().split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const requestData: any = {
        email: formData.email.trim().toLowerCase(),
        first_name,
        last_name,
        password: formData.password,
        role: backendRole,
        status: formData.isActive ? 'active' : 'inactive',
      };
      if (formData.assignedHouses && formData.assignedHouses.length > 0) {
        requestData.house_ids = formData.assignedHouses;
        requestData.pulse_days = formData.pulseDays;
      } else if (formData.assignedHouse && formData.assignedHouse.trim()) {
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
      toast.error('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser || !validateForm()) return;
    setIsSubmitting(true);
    try {
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
          email: formData.email.trim().toLowerCase(),
          first_name,
          last_name,
          role: formData.role.toUpperCase().replace(/-/g, '_'),
          status: formData.isActive ? 'active' : 'inactive',
          house_ids: formData.assignedHouses,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser || passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (!/[a-zA-Z]/.test(passwordData.newPassword) || !/[0-9]/.test(passwordData.newPassword)) {
      toast.error('Password must contain at least one letter and one number');
      return;
    }
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive user (delete)
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        toast.success("User archived (set to inactive) successfully");
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        await Promise.all([fetchUsers(), fetchStats()]);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to archive user' }));
        toast.error(errorData.error || errorData.message || "Failed to archive user");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore user (set to active)
  const handleRestoreUser = async (user: User) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (response.ok) {
        toast.success("User restored successfully");
        await Promise.all([fetchUsers(), fetchStats()]);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to restore user' }));
        toast.error(errorData.error || errorData.message || "Failed to restore user");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setIsSubmitting(false);
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
      assignedHouses: [],
      pulseDays: [],
      isActive: true
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    const formattedRole = user.role.toUpperCase().replace(/-/g, '_');
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: formattedRole,
      organization: user.organization || '',
      assignedHouse: user.assigned_house_id || '',
      assignedHouses: user.assigned_house_id === 'all' ? houses.map(h => h.id) : (user.assigned_house_id ? [user.assigned_house_id] : []),
      pulseDays: Array.isArray(user.pulse_days) ? user.pulse_days : 
                 (typeof user.pulse_days === 'string' ? JSON.parse(user.pulse_days) : []),
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
    const r = role.toUpperCase();
    switch (r) {
      case ROLES.SUPER_ADMIN: return 'bg-red-200 text-red-900 border-red-300';
      case ROLES.ADMIN: return 'bg-red-100 text-red-800';
      case ROLES.DIRECTOR: return 'bg-purple-100 text-purple-800';
      case ROLES.REGISTERED_MANAGER: return 'bg-blue-100 text-blue-800';
      case ROLES.TEAM_LEADER: return 'bg-orange-100 text-orange-800';
      case ROLES.RESPONSIBLE_INDIVIDUAL: return 'bg-green-100 text-green-800';
      default: return 'bg-muted text-foreground';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl  text-primary">User Management</h1>
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
              <h2 className="text-sm  text-muted-foreground">Total Users</h2>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl  text-foreground">{stats.total}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-muted-foreground">Active Users</h2>
              <Users className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl  text-success">{stats.active}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-muted-foreground">Inactive Users</h2>
              <Users className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl  text-destructive">{stats.inactive}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-muted-foreground">Assigned to Sites</h2>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl  text-foreground">{stats.assignedToHouse}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border-2 border-border p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl  text-primary mb-2">Filters</h2>
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
              <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.DIRECTOR}>Director</option>
              <option value={ROLES.REGISTERED_MANAGER}>Registered Manager</option>
              <option value={ROLES.TEAM_LEADER}>Team Leader</option>
              <option value={ROLES.RESPONSIBLE_INDIVIDUAL}>Responsible Individual</option>
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
            <h2 className="text-xl  text-primary mb-1">Users</h2>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="text-primary ">Name</TableHead>
                  <TableHead className="text-primary ">Email</TableHead>
                  <TableHead className="text-primary ">Role</TableHead>
                  <TableHead className="text-primary ">Assigned Site</TableHead>
                  <TableHead className="text-primary ">Pulse Days</TableHead>
                  <TableHead className="text-primary ">Status</TableHead>
                  <TableHead className="text-primary ">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border hover:bg-muted/30">
                    <TableCell className=" text-foreground">{user.name}</TableCell>
                    <TableCell className="text-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(user.role)} shadow-sm border-none`}>
                        {user.role.toLowerCase().replace(/_|-/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{user.assigned_house_name || '-'}</TableCell>
                    <TableCell>
                      {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(user.role.toUpperCase()) && user.pulse_days ? (
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
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPasswordDialog(user)}
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        {user.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            className="text-orange-600 hover:text-orange-800"
                            title="Archive User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreUser(user)}
                            className="text-green-600 hover:text-green-800"
                            title="Restore User"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
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
            <DialogTitle className="flex items-center gap-2">
               <UserPlus className="w-5 h-5 text-primary" />
               Create New User
            </DialogTitle>
            <DialogDescription>
              Assign roles and sites to new members. Strict uniqueness enforced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-email">Work Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="email@organisation.co.uk"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border-2 border-border focus:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-2 border-border focus:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-password">Initial Password</Label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border-2 border-border focus:ring-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-role">System Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.DIRECTOR}>Director</SelectItem>
                  <SelectItem value={ROLES.REGISTERED_MANAGER}>Registered Manager</SelectItem>
                  <SelectItem value={ROLES.TEAM_LEADER}>Team Leader</SelectItem>
                  <SelectItem value={ROLES.RESPONSIBLE_INDIVIDUAL}>Responsible Individual</SelectItem>
                  <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(formData.role) && (
              <>
                <div className="grid gap-2">
                  <Label>Assigned Sites</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded">
                    {houses.map((house) => (
                      <div key={house.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`site-${house.id}`}
                          checked={formData.assignedHouses.includes(house.id)}
                          onCheckedChange={(checked) => {
                            const newSites = checked 
                              ? [...formData.assignedHouses, house.id]
                              : formData.assignedHouses.filter(id => id !== house.id);
                            setFormData({ ...formData, assignedHouses: newSites });
                          }}
                        />
                        <Label htmlFor={`site-${house.id}`} className="font-normal cursor-pointer">
                          {house.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Pulse Reporting Days</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={formData.pulseDays.includes(day)}
                          onCheckedChange={(checked) => {
                            const newDays = checked 
                              ? [...formData.pulseDays, day]
                              : formData.pulseDays.filter(d => d !== day);
                            setFormData({ ...formData, pulseDays: newDays });
                          }}
                        />
                        <Label htmlFor={`day-${day}`} className="font-normal">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Edit className="w-5 h-5 text-primary" />
               Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" value={formData.email} disabled className="bg-muted opacity-50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.DIRECTOR}>Director</SelectItem>
                  <SelectItem value={ROLES.REGISTERED_MANAGER}>Registered Manager</SelectItem>
                  <SelectItem value={ROLES.TEAM_LEADER}>Team Leader</SelectItem>
                  <SelectItem value={ROLES.RESPONSIBLE_INDIVIDUAL}>Responsible Individual</SelectItem>
                  <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 border-2 border-border rounded-md">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-xs text-muted-foreground">{formData.isActive ? 'Active - Can login' : 'Inactive - Login blocked'}</p>
                </div>
                <Switch checked={formData.isActive} onCheckedChange={(val) => setFormData({...formData, isActive: val})} />
            </div>

            {['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(formData.role) && (
              <div className="grid gap-2">
                <Label>Assigned Sites</Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded">
                  {houses.map((house) => (
                    <div key={house.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-site-${house.id}`}
                        checked={formData.assignedHouses?.includes(house.id)}
                        onCheckedChange={(checked) => {
                          const newSites = checked
                            ? [...(formData.assignedHouses || []), house.id]
                            : (formData.assignedHouses || []).filter(id => id !== house.id);
                          setFormData({ ...formData, assignedHouses: newSites });
                        }}
                      />
                      <Label htmlFor={`edit-site-${house.id}`} className="font-normal cursor-pointer">
                        {house.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleUpdateUser} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleResetPassword} disabled={isSubmitting}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Archive Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to archive this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the user to inactive. They will no longer be able to login, but their records will be preserved for governance compliance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Archive User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AdminUserManagement;
