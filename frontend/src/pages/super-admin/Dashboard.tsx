import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Company, User, DashboardStats } from '@/types';
import { apiClient } from '@/services/api';

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesResponse, statsResponse] = await Promise.all([
          apiClient.getCompanies(),
          apiClient.getDashboardStats(),
        ]);

        if (companiesResponse.success) {
          setCompanies(companiesResponse.data || []);
        }

        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Total Companies</h3>
          <p className="text-2xl font-bold text-foreground mt-2">{companies.length}</p>
        </div>
        
        {stats && (
          <>
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Total Risks</h3>
              <p className="text-2xl font-bold text-foreground mt-2">{stats.totalRisks}</p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Open Incidents</h3>
              <p className="text-2xl font-bold text-foreground mt-2">{stats.openIncidents}</p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Open Escalations</h3>
              <p className="text-2xl font-bold text-foreground mt-2">{stats.openEscalations}</p>
            </div>
          </>
        )}
      </div>

      {/* Companies Table */}
      <div className="bg-card shadow rounded-lg">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Companies</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {company.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {company.contactEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      View
                    </button>
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {companies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No companies found</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-600 text-primary-foreground px-4 py-2 rounded hover:bg-blue-700">
            Create New Company
          </button>
          <button className="bg-green-600 text-primary-foreground px-4 py-2 rounded hover:bg-green-700">
            View Platform Reports
          </button>
          <button className="bg-purple-600 text-primary-foreground px-4 py-2 rounded hover:bg-purple-700">
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
