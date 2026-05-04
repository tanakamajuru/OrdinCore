import React from 'react';
import { Button } from './ui/button';
import { Settings, Shield, Database, Bell } from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings: React.FC = () => {
  const comingSoon = () => toast.info("This administrative feature is currently in development.");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl ">Admin Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4 border-b border-border pb-4">
            <h3 className="text-lg  flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              Security Settings
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              Manage security policies and access controls
            </p>
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm ">Password Policy</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm ">Session Timeout</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm ">Two-Factor Auth</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
            </div>
        </div>

        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4 border-b border-border pb-4">
            <h3 className="text-lg  flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              System Configuration
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              Manage system settings and configurations
            </p>
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm ">Database Settings</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm ">API Configuration</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm ">Backup Settings</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
            </div>
        </div>

        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4 border-b border-border pb-4">
            <h3 className="text-lg  flex items-center gap-2 text-primary">
              <Bell className="h-5 w-5" />
              Notification Settings
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              Configure system notifications and alerts
            </p>
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm ">Email Notifications</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm ">Alert Thresholds</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm ">System Alerts</span>
                <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
              </div>
            </div>
        </div>

        <div className="bg-card border-2 border-border p-6 shadow-sm">
          <div className="mb-4 border-b border-border pb-4">
            <h3 className="text-lg  flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" />
              General Settings
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              General system administration settings
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm ">System Maintenance</span>
              <Button variant="outline" size="sm" onClick={comingSoon}>Configure</Button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm ">System Logs</span>
              <Button variant="outline" size="sm" onClick={comingSoon}>View</Button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm ">System Status</span>
              <Button variant="outline" size="sm" onClick={comingSoon}>View</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border-2 border-border p-6">
        <div className="mb-4">
          <h2 className="text-xl ">System Information</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Current system status and information
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border-2 border-border">
            <h3 className=" mb-2">Version</h3>
            <p className="text-2xl  text-blue-600">v1.0.0</p>
            <p className="text-sm text-muted-foreground">Current version</p>
          </div>
          <div className="text-center p-4 border-2 border-border">
            <h3 className=" mb-2">Status</h3>
            <p className="text-2xl  text-green-600">Online</p>
            <p className="text-sm text-muted-foreground">System operational</p>
          </div>
          <div className="text-center p-4 border-2 border-border">
            <h3 className=" mb-2">Uptime</h3>
            <p className="text-2xl  text-purple-600">99.9%</p>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
