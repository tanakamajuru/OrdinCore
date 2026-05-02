import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { House, Risk, Incident, GovernancePulse } from '@/types';
import { apiClient } from '@/services/api';

const RegisteredManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [house, setHouse] = useState<House | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pendingPulses, setPendingPulses] = useState<GovernancePulse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get the manager's assigned house
        if (user?.assignedHouse) {
          const houseResponse = await apiClient.getHouse(user.assignedHouse);
          if (houseResponse.success) {
            setHouse(houseResponse.data || null);
          }
        }

        const [risksResponse, incidentsResponse, pulsesResponse] = await Promise.all([
          apiClient.getRisks(),
          apiClient.getIncidents(),
          apiClient.getGovernancePulses(1, 50, user?.id),
        ]);

        if (risksResponse.success) {
          // Filter risks for this manager's house
          const houseRisks = (risksResponse.data || []).filter((risk: any) => 
            risk.houseId === user?.assignedHouse
          );
          setRisks(houseRisks);
        }

        if (incidentsResponse.success) {
          // Filter incidents for this manager's house
          const houseIncidents = (incidentsResponse.data || []).filter((incident: any) => 
            incident.houseId === user?.assignedHouse
          );
          setIncidents(houseIncidents);
        }

        if (pulsesResponse.success) {
          // Filter pending pulses for this manager (assigned to them)
          const pending = (pulsesResponse.data || []).filter((pulse: any) => 
            pulse.assignedUserId === user?.id && (pulse.status === 'DRAFT' || pulse.status === 'pending')
          );
          setPendingPulses(pending);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.assignedHouse]);

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
        <h1 className="text-3xl font-bold text-foreground">Manager Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.name} 
          {house && ` - ${house.name}`}
        </p>
      </div>

      {/* House Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Active Risks</h3>
          <p className="text-2xl font-bold text-foreground mt-2">
            {risks.filter(r => r.status === 'Open').length}
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Open Incidents</h3>
          <p className="text-2xl font-bold text-foreground mt-2">
            {incidents.filter(i => i.status === 'Open').length}
          </p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Pending Pulses</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{pendingPulses.length}</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">Critical Issues</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {risks.filter(r => r.severity === 'Critical').length + 
             incidents.filter(i => i.severity === 'Critical').length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Risks */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-medium text-foreground">Recent Risks</h2>
            <button className="text-blue-600 hover:text-blue-900 text-sm">
              View All
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {risks.slice(0, 5).map((risk) => (
              <div key={risk.id} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <h4 className="font-medium text-foreground">{risk.title}</h4>
                  <p className="text-sm text-muted-foreground">{risk.severity} • {risk.status}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  risk.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                  risk.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                  risk.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {risk.severity}
                </span>
              </div>
            ))}
            
            {risks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No risks found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-card shadow rounded-lg">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-medium text-foreground">Recent Incidents</h2>
            <button className="text-blue-600 hover:text-blue-900 text-sm">
              View All
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <h4 className="font-medium text-foreground">
                    {incident.description.substring(0, 50)}...
                  </h4>
                  <p className="text-sm text-muted-foreground">{incident.severity} • {incident.status}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  incident.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                  incident.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                  incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {incident.severity}
                </span>
              </div>
            ))}
            
            {incidents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No incidents found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="bg-blue-600 text-primary-foreground px-4 py-2 rounded hover:bg-blue-700">
            Create Risk
          </button>
          <button className="bg-red-600 text-primary-foreground px-4 py-2 rounded hover:bg-red-700">
            Report Incident
          </button>
          <button className="bg-green-600 text-primary-foreground px-4 py-2 rounded hover:bg-green-700">
            Complete Pulse
          </button>
          <button className="bg-purple-600 text-primary-foreground px-4 py-2 rounded hover:bg-purple-700">
            Site Reports
          </button>
        </div>
      </div>

      {/* Pending Governance Pulses */}
      {pendingPulses.length > 0 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-4">
            Pending Governance Pulses
          </h3>
          <div className="space-y-3">
            {pendingPulses.map((pulse) => (
              <div key={pulse.id} className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-800">
                    Pulse for week of {new Date(pulse.weekStart || pulse.pulseDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-yellow-600">Status: {pulse.status}</p>
                </div>
                <button className="bg-yellow-600 text-primary-foreground px-4 py-2 rounded hover:bg-yellow-700">
                  Complete Pulse
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredManagerDashboard;
