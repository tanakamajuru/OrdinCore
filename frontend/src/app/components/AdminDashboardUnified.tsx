import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  AdminPageHeader, 
  AdminStatsCard, 
  AdminDataTable,
  AdminPagination,
  getStatusBadge 
} from './shared/AdminLayout';
import { Users, Building, Activity, AlertTriangle, TrendingUp, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalHouses: number;
  activeHouses: number;
  occupancyRate: number;
  totalPulses: number;
  pendingReviews: number;
  activeRisks: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'house' | 'pulse' | 'risk' | 'review';
  description: string;
  timestamp: string;
  user: string;
}

const AdminDashboardUnified: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [userStatsResponse, houseStatsResponse, pulseStatsResponse, riskStatsResponse] = await Promise.all([
          fetch('/api/admin/users/stats/summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/admin/houses/stats/summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/admin/pulses/stats/summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/admin/risks/stats/summary', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ]);

        if (userStatsResponse.ok && houseStatsResponse.ok && pulseStatsResponse.ok && riskStatsResponse.ok) {
          const userStats = await userStatsResponse.json();
          const houseStats = await houseStatsResponse.json();
          const pulseStats = await pulseStatsResponse.json();
          const riskStats = await riskStatsResponse.json();
          
          setStats({
            totalUsers: userStats.data.total,
            activeUsers: userStats.data.active,
            totalHouses: houseStats.data.total,
            activeHouses: houseStats.data.active,
            occupancyRate: houseStats.data.occupancyRate,
            totalPulses: pulseStats.data.total,
            pendingReviews: pulseStats.data.pending,
            activeRisks: riskStats.data.active
          });
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: <Users className="h-8 w-8 text-blue-600" />,
      action: () => navigate('/admin-users'),
      stats: `${stats?.totalUsers || 0} total users`
    },
    {
      title: 'House Management',
      description: 'Manage care homes and facilities',
      icon: <Building className="h-8 w-8 text-green-600" />,
      action: () => navigate('/admin-houses'),
      stats: `${stats?.totalHouses || 0} total houses`
    },
    {
      title: 'Pulse Management',
      description: 'Monitor and manage governance pulses',
      icon: <Activity className="h-8 w-8 text-purple-600" />,
      action: () => navigate('/admin-pulses'),
      stats: `${stats?.totalPulses || 0} total pulses`
    },
    {
      title: 'Risk Management',
      description: 'Track and manage risk activities',
      icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
      action: () => navigate('/admin-risks'),
      stats: `${stats?.activeRisks || 0} active risks`
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <AdminPageHeader 
        title="Admin Dashboard" 
        description="System overview and quick access to administrative functions"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={<Users className="h-6 w-6" />}
          change={stats?.activeUsers ? ((stats.activeUsers / stats.totalUsers) * 100) - 100 : 0}
          changeType="increase"
        />
        <AdminStatsCard
          title="Total Houses"
          value={stats?.totalHouses || 0}
          icon={<Building className="h-6 w-6" />}
          change={stats?.activeHouses ? ((stats.activeHouses / stats.totalHouses) * 100) - 100 : 0}
          changeType="increase"
        />
        <AdminStatsCard
          title="Occupancy Rate"
          value={`${stats?.occupancyRate || 0}%`}
          icon={<Activity className="h-6 w-6" />}
          change={0}
          changeType="neutral"
        />
        <AdminStatsCard
          title="Active Risks"
          value={stats?.activeRisks || 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          change={0}
          changeType="neutral"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-2 border-black p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">
            Access key administrative functions and manage system resources
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <div 
                key={index}
                className="bg-white border-2 border-black p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={action.action}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  {action.icon}
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                  <div className="text-sm font-medium text-blue-600">{action.stats}</div>
                  <Button variant="outline" className="w-full">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border-2 border-black p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">System Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>API Health</span>
              {getStatusBadge('Healthy')}
            </div>
            <div className="flex justify-between items-center">
              <span>Database</span>
              {getStatusBadge('Connected')}
            </div>
            <div className="flex justify-between items-center">
              <span>Last Sync</span>
              <span className="text-sm text-gray-600">2 mins ago</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-gray-600">{activity.timestamp}</p>
                  </div>
                  <span className={`text-sm ${getStatusColor(activity.type)}`}>
                    {activity.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">System Settings</h3>
          </div>
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/admin-settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              System Configuration
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/admin-logs')}
            >
              <Activity className="h-4 w-4 mr-2" />
              View System Logs
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/admin-backup')}
            >
              <Building className="h-4 w-4 mr-2" />
              Backup & Restore
            </Button>
          </div>
        </div>
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin-settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                System Configuration
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin-logs')}
              >
                <Activity className="h-4 w-4 mr-2" />
                View System Logs
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/admin-backup')}
              >
                <Building className="h-4 w-4 mr-2" />
                Backup & Restore
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardUnified;
