import React from 'react';
import { Button } from './ui/button';
import { Settings, Shield, Database, Bell } from 'lucide-react';

const AdminSettings: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border-2 border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Manage security policies and access controls
            </p>
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Password Policy</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span>Session Timeout</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span>Two-Factor Auth</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Configuration
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Manage system settings and configurations
            </p>
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Database Settings</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span>API Configuration</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span>Backup Settings</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Configure system notifications and alerts
            </p>
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Email Notifications</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span>Alert Thresholds</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span>System Alerts</span>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
        </div>

        <div className="bg-card border-2 border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              General system administration settings
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>System Maintenance</span>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex justify-between items-center">
              <span>System Logs</span>
              <Button variant="outline" size="sm">View</Button>
            </div>
            <div className="flex justify-between items-center">
              <span>System Status</span>
              <Button variant="outline" size="sm">View</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border-2 border-border p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">System Information</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Current system status and information
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border-2 border-border">
            <h3 className="font-semibold mb-2">Version</h3>
            <p className="text-2xl font-bold text-blue-600">v1.0.0</p>
            <p className="text-sm text-muted-foreground">Current version</p>
          </div>
          <div className="text-center p-4 border-2 border-border">
            <h3 className="font-semibold mb-2">Status</h3>
            <p className="text-2xl font-bold text-green-600">Online</p>
            <p className="text-sm text-muted-foreground">System operational</p>
          </div>
          <div className="text-center p-4 border-2 border-border">
            <h3 className="font-semibold mb-2">Uptime</h3>
            <p className="text-2xl font-bold text-purple-600">99.9%</p>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
