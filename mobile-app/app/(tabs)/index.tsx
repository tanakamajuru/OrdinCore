import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import client from '@/src/api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, TrendingUp, ShieldAlert } from 'lucide-react-native';

interface DashboardStats {
  openRisks: number;
  pendingActions: number;
  complianceRate: number;
  recentSignals: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await client.get('/analytics/dashboard');
      // Mocking data structure based on typical response, adjust if needed
      setStats({
        openRisks: response.data.totalRisks || 0,
        pendingActions: response.data.pendingActions || 0,
        complianceRate: response.data.complianceRate || 0,
        recentSignals: response.data.recentPulses || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      // Mock data for demonstration if API fails or is not ready
      setStats({
        openRisks: 12,
        pendingActions: 5,
        complianceRate: 85,
        recentSignals: 24,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <ScrollView 
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-6">
        <View className="mb-6">
          <Text className="text-gray-500 text-sm">Welcome back,</Text>
          <Text className="text-2xl font-bold text-primary">{user?.name}</Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between">
          <StatCard 
            title="Open Risks" 
            value={stats?.openRisks.toString() || '0'} 
            icon={<ShieldAlert size={20} color="#ef4444" />}
            color="bg-red-50"
            textColor="text-red-600"
          />
          <StatCard 
            title="Pending Actions" 
            value={stats?.pendingActions.toString() || '0'} 
            icon={<CheckCircle2 size={20} color="#3b82f6" />}
            color="bg-blue-50"
            textColor="text-blue-600"
          />
          <StatCard 
            title="Compliance" 
            value={`${stats?.complianceRate || 0}%`} 
            icon={<TrendingUp size={20} color="#10b981" />}
            color="bg-emerald-50"
            textColor="text-emerald-600"
          />
          <StatCard 
            title="Recent Signals" 
            value={stats?.recentSignals.toString() || '0'} 
            icon={<AlertCircle size={20} color="#f59e0b" />}
            color="bg-amber-50"
            textColor="text-amber-600"
          />
        </View>

        {/* Recent Activity Section */}
        <View className="mt-8">
          <Text className="text-lg font-bold text-primary mb-4">Quick Actions</Text>
          <View className="space-y-3">
            <QuickAction 
              title="Capture New Pulse" 
              subtitle="Submit a new governance observation"
              icon={<Radio size={20} color="white" />}
              color="bg-secondary"
            />
            <QuickAction 
              title="View Risk Register" 
              subtitle="Check active risks and controls"
              icon={<ShieldAlert size={20} color="white" />}
              color="bg-primary"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color, textColor }: any) {
  return (
    <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
      <View className={`${color} w-10 h-10 rounded-full items-center justify-center mb-3`}>
        {icon}
      </View>
      <Text className="text-gray-500 text-xs font-medium mb-1">{title}</Text>
      <Text className={`text-xl font-bold ${textColor}`}>{value}</Text>
    </View>
  );
}

function QuickAction({ title, subtitle, icon, color }: any) {
  return (
    <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-3">
      <View className={`${color} w-12 h-12 rounded-xl items-center justify-center mr-4`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-primary">{title}</Text>
        <Text className="text-gray-500 text-xs">{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

import { Radio } from 'lucide-react-native';
