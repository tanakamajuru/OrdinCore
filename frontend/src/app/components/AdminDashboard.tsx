import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { Users, UserPlus, Activity, Building, TrendingUp, LogOut } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organization: string;
  assigned_house?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: { role: string; count: string }[];
  totalSites: number;
  recentPulses: number;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: '',
    organization: '',
    assignedHouse: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status, response.statusText);
        setUsers([]);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setIsCreateDialogOpen(false);
        resetForm();
        fetchUsers();
        fetchStats();
      } else {
        console.error('Error creating user:', data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/v1/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          organization: formData.organization,
          assignedHouse: formData.assignedHouse || null,
          isActive: formData.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditingUser(null);
        resetForm();
        fetchUsers();
        fetchStats();
      } else {
        console.error('Error updating user:', data.error);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
        fetchStats();
      } else {
        console.error('Error deleting user:', data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
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
      isActive: true
    });
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      organization: user.organization,
      assignedHouse: user.assigned_house || '',
      isActive: user.is_active
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      director: 'bg-purple-100 text-purple-800',
      'registered-manager': 'bg-blue-100 text-blue-800',
      'responsible-individual': 'bg-green-100 text-green-800',
      'clinical-director': 'bg-pink-100 text-pink-800',
      'operations-manager': 'bg-orange-100 text-orange-800',
      'quality-manager': 'bg-teal-100 text-teal-800',
      'safeguarding-lead': 'bg-yellow-100 text-yellow-800',
      'facilities-manager': 'bg-muted text-foreground'
    };
    return colors[role] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return users.slice(start, start + itemsPerPage);
  }, [users, currentPage]);

  const totalPages = Math.ceil(users.length / itemsPerPage);

  const usersTable = useMemo(() => (
    <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role.replace('-', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{user.organization}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground bg-muted p-2 rounded border border-gray-100">
            <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, users.length)} of {users.length} entries</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
    </>
  ), [paginatedUsers, currentPage, totalPages, users.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl ">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </Button>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={resetForm}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive an email with login instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="registered-manager">Registered Manager</SelectItem>
                  <SelectItem value="responsible-individual">Responsible Individual</SelectItem>
                  <SelectItem value="clinical-director">Clinical Director</SelectItem>
                  <SelectItem value="operations-manager">Operations Manager</SelectItem>
                  <SelectItem value="quality-manager">Quality Manager</SelectItem>
                  <SelectItem value="safeguarding-lead">Safeguarding Lead</SelectItem>
                  <SelectItem value="facilities-manager">Facilities Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="Organization name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border-2 border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-foreground">Total Users</h2>
              <Users className="h-4 w-4 text-foreground" />
            </div>
            <div className="text-2xl  text-foreground">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </div>
          <div className="bg-card border-2 border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-foreground">Active Users</h2>
              <Activity className="h-4 w-4 text-foreground" />
            </div>
            <div className="text-2xl  text-foreground">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </div>
          <div className="bg-card border-2 border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-foreground">Total Sites</h2>
              <Building className="h-4 w-4 text-foreground" />
            </div>
            <div className="text-2xl  text-foreground">{stats.totalSites ?? (stats as any).totalHouses ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered sites
            </p>
          </div>
          <div className="bg-card border-2 border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm  text-foreground">Recent Pulses</h2>
              <TrendingUp className="h-4 w-4 text-foreground" />
            </div>
            <div className="text-2xl  text-foreground">{stats.recentPulses}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-card border-2 border-border p-6">
        <div className="mb-4">
          <h2 className="text-xl  text-foreground mb-2">User Management</h2>
          <p className="text-muted-foreground">Manage all users in the system. Create, edit, and delete user accounts.</p>
        </div>
        {usersTable}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="registered-manager">Registered Manager</SelectItem>
                  <SelectItem value="responsible-individual">Responsible Individual</SelectItem>
                  <SelectItem value="clinical-director">Clinical Director</SelectItem>
                  <SelectItem value="operations-manager">Operations Manager</SelectItem>
                  <SelectItem value="quality-manager">Quality Manager</SelectItem>
                  <SelectItem value="safeguarding-lead">Safeguarding Lead</SelectItem>
                  <SelectItem value="facilities-manager">Facilities Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-organization">Organization</Label>
              <Input
                id="edit-organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
