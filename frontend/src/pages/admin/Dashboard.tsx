import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { House, User, Risk, Incident, DashboardStats } from '@/types';
import { apiClient } from '@/services/api';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [housesResponse, usersResponse, statsResponse] = await Promise.all([
          apiClient.getHouses(),
          apiClient.getUsers(),
          apiClient.getDashboardStats(),
        ]);

        if (housesResponse.success) {
          setHouses(housesResponse.data || []);
        }

        if (usersResponse.success) {
          setUsers(usersResponse.data?.data || []);
        }

        if (statsResponse.success) {
          setStats(statsResponse.data || null);
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
        <h1 className="text-3xl  text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
      </div>

      {/* Organization Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm  text-muted-foreground">Total Houses</h3>
          <p className="text-2xl  text-foreground mt-2">{houses.length}</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm  text-muted-foreground">Total Users</h3>
          <p className="text-2xl  text-foreground mt-2">{users.length}</p>
        </div>
        
        {stats && (
          <>
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-sm  text-muted-foreground">Open Risks</h3>
              <p className="text-2xl  text-foreground mt-2">{stats.openRisks}</p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-sm  text-muted-foreground">Critical Risks</h3>
              <p className="text-2xl  text-red-600 mt-2">{stats.criticalRisks}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Houses Table */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg  text-foreground">Houses</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {houses.slice(0, 5).map((house) => (
                  <tr key={house.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm  text-foreground">
                      {house.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {house.capacity || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {house.currentOccupancy || '0'} / {house.capacity || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm ">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {houses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No houses found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Users Table */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg  text-foreground">Recent Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs  text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm  text-foreground">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {user.role.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm ">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg  text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-600 text-primary-foreground px-4 py-2 rounded hover:bg-blue-700">
            Add New House
          </button>
          <button className="bg-green-600 text-primary-foreground px-4 py-2 rounded hover:bg-green-700">
            Add New User
          </button>
          <button className="bg-purple-600 text-primary-foreground px-4 py-2 rounded hover:bg-purple-700">
            Generate Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
