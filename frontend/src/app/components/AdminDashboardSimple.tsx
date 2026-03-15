import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Users, Building, Activity, TrendingUp, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalHouses: number;
  activeHouses: number;
  occupancyRate: number;
}

const AdminDashboardSimple: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [userStatsResponse, houseStatsResponse] = await Promise.all([
          fetch('/api/admin/users/stats/summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/admin/houses/stats/summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ]);

        if (userStatsResponse.ok && houseStatsResponse.ok) {
          const userStats = await userStatsResponse.json();
          const houseStats = await houseStatsResponse.json();
          
          setStats({
            totalUsers: userStats.data.total,
            activeUsers: userStats.data.active,
            totalHouses: houseStats.data.total,
            activeHouses: houseStats.data.active,
            occupancyRate: houseStats.data.occupancyRate
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
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
        <div className="bg-white border-2 border-black p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Users</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers || 0} active
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Houses</h3>
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.totalHouses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeHouses || 0} active
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Occupancy Rate</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.occupancyRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Across all houses
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">System Health</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">Good</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-black p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">User Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Users</span>
              <span className="font-bold">{stats?.totalUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Users</span>
              <span className="font-bold text-green-600">{stats?.activeUsers || 0}</span>
            </div>
            <Button 
              onClick={() => navigate('/admin-users')}
              className="w-full"
            >
              Manage Users
            </Button>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">House Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage care homes and facilities
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Houses</span>
              <span className="font-bold">{stats?.totalHouses || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Houses</span>
              <span className="font-bold text-green-600">{stats?.activeHouses || 0}</span>
            </div>
            <Button 
              onClick={() => navigate('/admin-houses')}
              className="w-full"
            >
              Manage Houses
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity
      <div className="bg-white border-2 border-black p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Admin Overview</h3>
          <p className="text-sm text-muted-foreground">
            System status and quick access to admin functions
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border-2 border-black">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-semibold">{stats?.totalUsers || 0}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div className="text-center p-4 border-2 border-black">
            <Building className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-semibold">{stats?.totalHouses || 0}</div>
            <p className="text-sm text-muted-foreground">Total Houses</p>
          </div>
          <div className="text-center p-4 border-2 border-black">
            <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-lg font-semibold">{stats?.occupancyRate || 0}%</div>
            <p className="text-sm text-muted-foreground">Avg Occupancy</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Button 
            onClick={() => navigate('/admin-users')}
            className="w-full"
          >
            Manage Users
          </Button>
          <Button 
            onClick={() => navigate('/admin-houses')}
            className="w-full"
          >
            Manage Houses
          </Button>
          <Button 
            onClick={() => navigate('/admin-pulses')}
            className="w-full"
          >
            View Pulses
          </Button>
        </div>
      </div> */}
    </div>
  );
};

export default AdminDashboardSimple;    
