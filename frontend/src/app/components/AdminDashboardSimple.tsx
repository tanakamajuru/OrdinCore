import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Users, Building, Activity, TrendingUp, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { apiClient } from '@/services/api';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalHouses: number;
  activeHouses: number;
  occupancyRate: number;
}

const AdminDashboardSimple: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalHouses: 0,
    activeHouses: 0,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [userStatsRes, houseStatsRes] = await Promise.all([
          apiClient.getAdminUserStats(),
          apiClient.getAdminHouseStats(),
        ]);

        if (userStatsRes.success && houseStatsRes.success) {
          setStats({
            totalUsers: userStatsRes.data?.total || 0,
            activeUsers: userStatsRes.data?.active || 0,
            totalHouses: houseStatsRes.data?.total || 0,
            activeHouses: houseStatsRes.data?.active || 0,
            occupancyRate: houseStatsRes.data?.occupancyRate || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl ">Admin Dashboard</h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border-2 border-border p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm ">Total Users</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl ">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeUsers} active</p>
          </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm ">Total Sites</h3>
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl ">{stats.totalHouses}</div>
            <p className="text-xs text-muted-foreground">{stats.activeHouses} active</p>
          </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm ">Occupancy Rate</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl ">{stats.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">Across all sites</p>
          </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm ">System Health</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl  text-green-600">Good</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border-2 border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg ">User Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Users</span>
              <span className="">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Users</span>
              <span className=" text-green-600">{stats.activeUsers}</span>
            </div>
            <Button onClick={() => navigate('/admin-users')} className="w-full">
              Manage Users
            </Button>
          </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg ">Site Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage care homes and facilities
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Sites</span>
              <span className="">{stats.totalHouses}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Sites</span>
              <span className=" text-green-600">{stats.activeHouses}</span>
            </div>
            <Button onClick={() => navigate('/admin-houses')} className="w-full">
              Manage Sites
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSimple;
