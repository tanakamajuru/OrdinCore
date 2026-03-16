import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  AdminPageHeader, 
  AdminStatsCard, 
  getStatusBadge 
} from './shared/AdminLayout';
import { Users, Building, Activity, AlertTriangle, TrendingUp, Settings, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

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

const getStatusColor = (type: string) => {
  switch (type) {
    case 'user': return 'text-primary';
    case 'house': return 'text-success';
    case 'pulse': return 'text-primary';
    case 'risk': return 'text-destructive';
    case 'review': return 'text-warning';
    default: return 'text-muted-foreground';
  }
};

const AdminDashboardUnified: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [userStatsRes, houseStatsRes, pulseStatsRes, riskStatsRes] = await Promise.all([
          apiClient.get('/admin/users/stats/summary'),
          apiClient.get('/admin/houses/stats/summary'),
          apiClient.get('/admin/pulses/stats/summary'),
          apiClient.get('/admin/risks/stats/summary')
        ]);

        setStats({
          totalUsers: userStatsRes.data.data.total,
          activeUsers: userStatsRes.data.data.active,
          totalHouses: houseStatsRes.data.data.total,
          activeHouses: houseStatsRes.data.data.active,
          occupancyRate: houseStatsRes.data.data.occupancyRate || 0,
          totalPulses: pulseStatsRes.data.data.total,
          pendingReviews: pulseStatsRes.data.data.pending,
          activeRisks: riskStatsRes.data.data.active
        });
        
        // Mock recent activity for now if endpoint doesn't exist
        setRecentActivity([
          { id: '1', type: 'user', description: 'New user registered: John Doe', timestamp: '5 mins ago', user: 'Admin' },
          { id: '2', type: 'house', description: 'House status updated: Sunshine Care', timestamp: '1 hour ago', user: 'Admin' },
          { id: '3', type: 'risk', description: 'High severity risk flagged at Site A', timestamp: '2 hours ago', user: 'System' }
        ]);
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
      icon: <Users className="h-8 w-8 text-primary" />,
      action: () => navigate('/admin-users'),
      stats: `${stats?.totalUsers || 0} total users`
    },
    {
      title: 'House Management',
      description: 'Manage care homes and facilities',
      icon: <Building className="h-8 w-8 text-success" />,
      action: () => navigate('/admin-houses'),
      stats: `${stats?.totalHouses || 0} total houses`
    },
    {
      title: 'Pulse Management',
      description: 'Monitor and manage governance pulses',
      icon: <Activity className="h-8 w-8 text-primary" />,
      action: () => navigate('/admin-pulses'),
      stats: `${stats?.totalPulses || 0} total pulses`
    },
    {
      title: 'Risk Management',
      description: 'Track and manage risk activities',
      icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
      action: () => navigate('/admin-risks'),
      stats: `${stats?.activeRisks || 0} active risks`
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <AdminPageHeader 
        title="Admin Dashboard" 
        description="System overview and quick access to administrative functions"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={<Users className="h-6 w-6 text-primary" />}
          change={stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}
          changeType="increase"
        />
        <AdminStatsCard
          title="Total Houses"
          value={stats?.totalHouses || 0}
          icon={<Building className="h-6 w-6 text-success" />}
          change={stats?.totalHouses ? Math.round((stats.activeHouses / stats.totalHouses) * 100) : 0}
          changeType="increase"
        />
        <AdminStatsCard
          title="Occupancy Rate"
          value={`${stats?.occupancyRate || 0}%`}
          icon={<Activity className="h-6 w-6 text-primary" />}
          change={0}
          changeType="neutral"
        />
        <AdminStatsCard
          title="Active Risks"
          value={stats?.activeRisks || 0}
          icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
          change={0}
          changeType="neutral"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border-2 border-border p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-primary">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">
            Access key administrative functions and manage system resources
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <div 
                key={index}
                className="bg-background border-2 border-border p-6 hover:border-primary/50 transition-all cursor-pointer shadow-sm group"
                onClick={action.action}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-muted rounded-full group-hover:bg-primary/5 transition-colors">
                    {action.icon}
                  </div>
                  <h3 className="font-bold text-foreground text-lg">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                  <div className="text-sm font-bold text-primary">{action.stats}</div>
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* System Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-primary">System Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground font-medium">API Health</span>
              {getStatusBadge('good')}
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground font-medium">Database</span>
              {getStatusBadge('active')}
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-foreground font-medium">Last Sync</span>
              <span className="text-sm text-muted-foreground">2 mins ago</span>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">Recent Activity</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No recent activity detected</p>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-start py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors px-2 rounded -mx-2">
                  <div>
                    <p className="font-medium text-foreground text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted ${getStatusColor(activity.type)}`}>
                    {activity.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-primary">System Control</h3>
          </div>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start border-border hover:border-primary/30"
              onClick={() => navigate('/admin-settings')}
            >
              <Settings className="h-4 w-4 mr-3 text-primary" />
              System Configuration
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-border hover:border-primary/30"
              onClick={() => navigate('/admin-logs')}
            >
              <FileText className="h-4 w-4 mr-3 text-primary" />
              View System Logs
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-border hover:border-primary/30"
              onClick={() => navigate('/admin-backup')}
            >
              <Building className="h-4 w-4 mr-3 text-primary" />
              Backup & Restore
            </Button>
            <Button 
              className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate('/reports')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Global Analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardUnified;
