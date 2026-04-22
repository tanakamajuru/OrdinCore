import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { House, Risk, Incident, DashboardStats } from '@/types';
import { apiClient } from '@/services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const trendData = [
  { date: 'Mon', signals: 12, incidents: 2 },
  { date: 'Tue', signals: 19, incidents: 1 },
  { date: 'Wed', signals: 15, incidents: 4 },
  { date: 'Thu', signals: 22, incidents: 0 },
  { date: 'Fri', signals: 30, incidents: 3 },
  { date: 'Sat', signals: 10, incidents: 1 },
  { date: 'Sun', signals: 8, incidents: 0 },
];

const domainData = [
  { name: 'Clinical', failures: 14 },
  { name: 'Staffing', failures: 8 },
  { name: 'Env', failures: 12 },
  { name: 'Health/Safety', failures: 5 },
  { name: 'Medication', failures: 19 },
];

const DirectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [housesResponse, risksResponse, incidentsResponse, statsResponse] = await Promise.all([
          apiClient.getHouses(),
          apiClient.getRisks(),
          apiClient.getIncidents(),
          apiClient.getDashboardStats(),
        ]);

        if (housesResponse.success) {
          setHouses(housesResponse.data || []);
        }

        if (risksResponse.success) {
          setRisks(risksResponse.data || []);
        }

        if (incidentsResponse.success) {
          setIncidents(incidentsResponse.data || []);
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

  // Calculate strategic metrics
  const criticalRisks = risks.filter(r => r.severity === 'Critical');
  const highSeverityIncidents = incidents.filter(i => i.severity === 'Critical' || i.severity === 'High');
  const totalOccupancy = houses.reduce((sum, house) => sum + (house.currentOccupancy || 0), 0);
  const totalCapacity = houses.reduce((sum, house) => sum + (house.capacity || 0), 0);
  const occupancyRate = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Director Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
        <p className="text-sm text-gray-500 mt-1">Strategic oversight for the organization</p>
      </div>

      {/* Strategic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Houses</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{houses.length}</p>
          <p className="text-xs text-gray-500 mt-1">Across organization</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Occupancy Rate</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{occupancyRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{totalOccupancy}/{totalCapacity} beds</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Critical Risks</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">{criticalRisks.length}</p>
          <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">High Severity Incidents</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">{highSeverityIncidents.length}</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Risk Analysis</h2>
          <button className="text-blue-600 hover:text-blue-900 text-sm">
            Full Report
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{criticalRisks.length}</div>
              <div className="text-sm text-gray-500">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {risks.filter(r => r.severity === 'High').length}
              </div>
              <div className="text-sm text-gray-500">High</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {risks.filter(r => r.severity === 'Medium').length}
              </div>
              <div className="text-sm text-gray-500">Medium</div>
            </div>
          </div>
          
          {/* Top Critical Risks */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">Top Critical Risks</h3>
            <div className="space-y-3">
              {criticalRisks.slice(0, 3).map((risk) => {
                const house = houses.find(h => h.id === risk.houseId);
                return (
                  <div key={risk.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                    <div>
                      <h4 className="font-medium text-red-800">{risk.title}</h4>
                      <p className="text-sm text-red-600">
                        {house?.name || 'Unknown House'} • {risk.status}
                      </p>
                    </div>
                    <button className="text-red-600 hover:text-red-900 text-sm">
                      Review
                    </button>
                  </div>
                );
              })}
              
              {criticalRisks.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500">No critical risks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Panel 3: 7-Day Signal Trend */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">7-Day Signal Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="signals" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="incidents" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 5: Domain Weakness Analysis */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Domain Weakness Analysis</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="failures" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* House Performance */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">House Performance</h2>
          </div>
          
          <div className="p-6 space-y-3">
            {houses.map((house) => {
              const houseRisks = risks.filter(r => r.houseId === house.id);
              const houseIncidents = incidents.filter(i => i.houseId === house.id);
              const criticalCount = houseRisks.filter(r => r.severity === 'Critical').length;
              
              return (
                <div key={house.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <h4 className="font-medium text-gray-900">{house.name}</h4>
                    <p className="text-sm text-gray-500">
                      {houseRisks.length} risks • {houseIncidents.length} incidents
                    </p>
                  </div>
                  <div className="text-right">
                    {criticalCount > 0 && (
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 mb-1">
                        {criticalCount} Critical
                      </span>
                    )}
                    <div className="text-sm text-gray-500">
                      {house.currentOccupancy || 0}/{house.capacity || 0} occupied
                    </div>
                  </div>
                </div>
              );
            })}
            
            {houses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No houses found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent High Severity Incidents</h2>
          </div>
          
          <div className="p-6 space-y-4">
            {highSeverityIncidents.slice(0, 5).map((incident) => {
              const house = houses.find(h => h.id === incident.houseId);
              return (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {incident.description.substring(0, 60)}...
                    </h4>
                    <p className="text-sm text-gray-500">
                      {house?.name || 'Unknown House'} • {incident.severity}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    incident.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {incident.severity}
                  </span>
                </div>
              );
            })}
            
            {highSeverityIncidents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No high severity incidents</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Strategic Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Generate Strategic Reports
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Risk Assessment Review
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Performance Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectorDashboard;
