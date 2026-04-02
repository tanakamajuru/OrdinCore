import React from "react";
import { AlertCircle } from "lucide-react";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newAdmin: any;
  setNewAdmin: (admin: any) => void;
  companies: any[];
  selectedCompany: any;
  formError: string;
  isSubmitting: boolean;
}

export default function CreateAdminModal({
  isOpen,
  onClose,
  onSubmit,
  newAdmin,
  setNewAdmin,
  companies,
  selectedCompany,
  formError,
  isSubmitting,
}: CreateAdminModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create Company Admin</h3>
            <p className="text-sm text-gray-500">
              {selectedCompany ? `Creating admin for ${selectedCompany.name}` : 'Create a new company administrator account'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded text-sm border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={newAdmin.first_name}
                onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={newAdmin.last_name}
                onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="admin@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              required
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation *</label>
            <select
              required
              value={newAdmin.company_id}
              onChange={(e) => setNewAdmin({ ...newAdmin, company_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
            >
              <option value="">Select organisation...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Admin Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
