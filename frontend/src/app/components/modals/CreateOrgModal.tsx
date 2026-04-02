import React from "react";
import { AlertCircle } from "lucide-react";

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newOrg: { name: string; contactEmail: string; plan: string };
  setNewOrg: (org: any) => void;
  formError: string;
  isSubmitting: boolean;
}

export default function CreateOrgModal({
  isOpen,
  onClose,
  onSubmit,
  newOrg,
  setNewOrg,
  formError,
  isSubmitting,
}: CreateOrgModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create Organisation</h3>
            <p className="text-sm text-gray-500">Add a new company to the OrdinCore platform</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name *</label>
            <input
              type="text"
              required
              value={newOrg.name}
              onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
              placeholder="e.g. Oakwood Care Group"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
            <input
              type="email"
              required
              value={newOrg.contactEmail}
              onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })}
              placeholder="admin@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              value={newOrg.plan}
              onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
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
              {isSubmitting ? "Creating..." : "Create Organisation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
