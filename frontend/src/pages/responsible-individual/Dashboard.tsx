import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { House, Risk, Escalation, DashboardStats } from '@/types';
import { apiClient } from '@/services/api';

const ResponsibleIndividualDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignedHouses, setAssignedHouses] = useState<House[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get all houses for the responsible individual (cross-site access)
        const housesResponse = await apiClient.getHouses();
        if (housesResponse.success) {
          setAssignedHouses(housesResponse.data || []);
        }

        const [risksResponse, escalationsResponse, statsResponse] = await Promise.all([
          apiClient.getRisks(),
          apiClient.getEscalations(),
          apiClient.getDashboardStats(),
        ]);

        if (risksResponse.success) {
          setRisks(risksResponse.data || []);
        }

        if (escalationsResponse.success) {
          // Filter for open escalations
          const openEscalations = (escalationsResponse.data || []).filter(esc => 
            esc.status === 'Open'
          );
          setEscalations(openEscalations);
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
        <h1 className="text-3xl font-bold text-gray-900">Responsible Individual Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
        <p className="text-sm text-gray-500 mt-1">Cross-site oversight for {assignedHouses.length} houses</p>
      </div>

      {/* Cross-Site Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Assigned Houses</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{assignedHouses.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Open Escalations</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">{escalations.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">High Priority Risks</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">
            {risks.filter(r => r.severity === 'High' || r.severity === 'Critical').length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Risks</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{risks.length}</p>
        </div>
      </div>

      {/* Open Escalations */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Open Escalations</h2>
          <button className="text-blue-600 hover:text-blue-900 text-sm">
            View All
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {escalations.map((escalation) => (
            <div key={escalation.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Escalation ID: {escalation.id.substring(0, 8)}</h4>
                <p className="text-sm text-red-600 mt-1">
                  Risk ID: {escalation.riskId.substring(0, 8)} • Status: {escalation.status}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  Escalated: {new Date(escalation.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                  Review
                </button>
                <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                  Resolve
                </button>
              </div>
            </div>
          ))}
          
          {escalations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No open escalations</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assigned Houses */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Assigned Houses</h2>
          </div>
          
          <div className="p-6 space-y-3">
            {assignedHouses.map((house) => {
              const houseRisks = risks.filter(r => r.houseId === house.id);
              const criticalRisks = houseRisks.filter(r => r.severity === 'Critical');
              
              return (
                <div key={house.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <h4 className="font-medium text-gray-900">{house.name}</h4>
                    <p className="text-sm text-gray-500">
                      {houseRisks.length} risks • {criticalRisks.length} critical
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">
                    View Details
                  </button>
                </div>
              );
            })}
            
            {assignedHouses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No houses assigned</p>
              </div>
            )}
          </div>
        </div>

        {/* High Priority Risks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">High Priority Risks</h2>
          </div>
          
          <div className="p-6 space-y-4">
            {risks
              .filter(r => r.severity === 'High' || r.severity === 'Critical')
              .slice(0, 5)
              .map((risk) => {
                const house = assignedHouses.find(h => h.id === risk.houseId);
                
                return (
                  <div key={risk.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <h4 className="font-medium text-gray-900">{risk.title}</h4>
                      <p className="text-sm text-gray-500">
                        {house?.name || 'Unknown House'} • {risk.severity}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      risk.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {risk.severity}
                    </span>
                  </div>
                );
              })}
            
            {risks.filter(r => r.severity === 'High' || r.severity === 'Critical').length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No high priority risks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Review Escalations
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Cross-Site Reports
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Risk Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponsibleIndividualDashboard;
