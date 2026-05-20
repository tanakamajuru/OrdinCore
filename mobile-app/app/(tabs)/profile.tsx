import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Shield, Bell, Settings, LogOut, ChevronRight } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* Header / User Card */}
        <View className="items-center py-8 bg-white rounded-[32] shadow-sm border border-gray-100 mb-8">
          <View className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center mb-4">
            <User size={48} color="#3b82f6" />
          </View>
          <Text className="text-2xl font-bold text-primary">{user?.name}</Text>
          <Text className="text-gray-500 font-medium">{user?.role?.replace('_', ' ')}</Text>
          <View className="mt-4 px-4 py-1 bg-primary/5 rounded-full border border-primary/10">
            <Text className="text-primary text-xs font-bold">{user?.email}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="space-y-4">
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest ml-2 mb-2">Account Settings</Text>
          
          <ProfileMenuItem 
            icon={<Shield size={20} color="#64748b" />} 
            title="Privacy & Security" 
            subtitle="Manage your credentials"
          />
          <ProfileMenuItem 
            icon={<Bell size={20} color="#64748b" />} 
            title="Notifications" 
            subtitle="Configure alert preferences"
          />
          <ProfileMenuItem 
            icon={<Settings size={20} color="#64748b" />} 
            title="System Settings" 
            subtitle="App version and cache"
          />

          <View className="h-4" />

          <TouchableOpacity 
            onPress={logout}
            className="flex-row items-center bg-red-50 p-5 rounded-2xl border border-red-100"
          >
            <View className="bg-red-100 w-10 h-10 rounded-xl items-center justify-center mr-4">
              <LogOut size={20} color="#ef4444" />
            </View>
            <Text className="text-red-600 font-bold text-lg">Log Out</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-12 items-center">
          <Text className="text-gray-300 text-xs">OrdinCore Mobile v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ProfileMenuItem({ icon, title, subtitle }: any) {
  return (
    <TouchableOpacity className="flex-row items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-3">
      <View className="mr-4">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-primary">{title}</Text>
        <Text className="text-gray-400 text-xs">{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );
}
