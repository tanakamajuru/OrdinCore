import { useState } from "react";
import { Navigation } from "./Navigation";

export function Profile() {
  const [user] = useState({
    name: "Dr. Sarah Mitchell",
    role: "Governance Chair",
    email: "sarah.mitchell@caresignal.com",
    organization: "CareSignal Health Group",
    lastLogin: "2026-02-22 09:15 AM",
  });

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information</p>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">User Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <div className="px-4 py-2 bg-white border-2 border-black text-black">
                  {user.name}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Role</label>
                <div className="px-4 py-2 bg-white border-2 border-black text-black">
                  {user.role}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <div className="px-4 py-2 bg-white border-2 border-black text-black">
                  {user.email}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Organization</label>
                <div className="px-4 py-2 bg-white border-2 border-black text-black">
                  {user.organization}
                </div>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Activity</h2>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Login</label>
              <div className="px-4 py-2 bg-white border-2 border-black text-black">
                {user.lastLogin}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Permissions</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-black">Dashboard Access</span>
                <span className="text-black font-semibold">Granted</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-black">Governance Pulse Submission</span>
                <span className="text-black font-semibold">Granted</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-black">Risk Register Management</span>
                <span className="text-black font-semibold">Granted</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-black">Escalation Log View</span>
                <span className="text-black font-semibold">Granted</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-300">
                <span className="text-black">Trends & Analytics</span>
                <span className="text-black font-semibold">Granted</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Account Actions</h2>
            <div className="space-y-3">
              <button className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors">
                Change Password
              </button>
              <button className="w-full py-2 px-4 border-2 border-black text-black hover:bg-gray-100 transition-colors">
                Update Email Preferences
              </button>
              <button className="w-full py-2 px-4 border-2 border-black text-black hover:bg-gray-100 transition-colors">
                Download Activity Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
