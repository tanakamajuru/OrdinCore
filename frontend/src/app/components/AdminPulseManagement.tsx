import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  AdminPageHeader, 
  AdminStatsCard, 
  AdminDataTable,
  AdminSearchBar,
  AdminPagination,
  getStatusBadge,
  AdminFormField,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast
} from './shared/AdminLayout';
import { Activity, Calendar, Filter, Plus, Edit, Trash2, Search, AlertTriangle } from 'lucide-react';

interface GovernancePulse {
  id: string;
  pulse_id: string;
  house_id: string;
  house_name: string;
  house_code: string;
  pulse_date: string;
  submitted_by: string;
  submitted_by_name: string;
  submitted_by_email: string;
  status: string;
  completed_at?: string;
  staffing_adequate: boolean;
  medication_management: boolean;
  safeguarding_concerns: boolean;
  maintenance_issues: boolean;
  overall_status: string;
  emerging_risk: boolean;
  risk_movement: boolean;
  safeguarding_signals: boolean;
  escalation_required: boolean;
  additional_observations: string;
  risk_areas_identified: string[];
  created_at: string;
  updated_at: string;
}

interface PulseStats {
  total: number;
  pending: number;
  submitted: number;
  missed: number;
  overdue: number;
}

const AdminPulseManagement: React.FC = () => {
  const navigate = useNavigate();
  const [pulses, setPulses] = useState<GovernancePulse[]>([]);
  const [stats, setStats] = useState<PulseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [houseFilter, setHouseFilter] = useState<string | undefined>(undefined);
  const [selectedPulse, setSelectedPulse] = useState<GovernancePulse | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [houses, setHouses] = useState<any[]>([]);

  // Fetch pulses
  const fetchPulses = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(houseFilter && houseFilter !== 'all' && { houseId: houseFilter })
      });

      const response = await fetch(`/api/v1/admin/pulses?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPulses(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to fetch pulses');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/pulses/stats/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pulse stats:', error);
    }
  };

  // Fetch houses for dropdown
  const fetchHouses = async () => {
    try {
      const response = await fetch('/api/admin/houses?limit=100', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHouses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch houses:', error);
    }
  };

  // Update pulse
  const handleUpdatePulse = async () => {
    if (!selectedPulse) return;

    try {
      const response = await fetch(`/api/v1/admin/pulses/${selectedPulse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: selectedPulse.status,
          overall_status: selectedPulse.overall_status,
          escalation_required: selectedPulse.escalation_required,
          additional_observations: selectedPulse.additional_observations
        })
      });

      if (response.ok) {
        toast.success('Pulse updated successfully');
        setIsEditDialogOpen(false);
        setSelectedPulse(null);
        fetchPulses();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update pulse');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };


  useEffect(() => {
    fetchPulses();
    fetchStats();
    fetchHouses();
  }, []);

  const statusOptions: Array<{ value: string | undefined; label: string }> = [
    { value: undefined, label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'missed', label: 'Missed' },
    { value: 'overdue', label: 'Overdue' }
  ];

  return (
    <div className="p-6 space-y-6 bg-muted min-h-screen">
      <AdminPageHeader 
        title="Pulse Management" 
        description="Monitor and manage governance pulses across all facilities"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <AdminStatsCard
          title="Total Pulses"
          value={stats?.total || 0}
          icon={<Activity className="h-6 w-6" />}
        />
        <AdminStatsCard
          title="Pending"
          value={stats?.pending || 0}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
        />
        <AdminStatsCard
          title="Submitted"
          value={stats?.submitted || 0}
          icon={<Activity className="h-6 w-6 text-green-600" />}
        />
        <AdminStatsCard
          title="Overdue"
          value={stats?.overdue || 0}
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
        />
      </div>

      {/* Search and Filters */}
      <AdminSearchBar
        search={searchTerm}
        onSearch={setSearchTerm}
        placeholder="Search pulses..."
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={houseFilter} onValueChange={setHouseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by house" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Houses</SelectItem>
                {houses.map(house => (
                  <SelectItem key={house.id} value={house.id}>
                    {house.name} ({house.house_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Pulses Table */}
      <AdminDataTable
        headers={['Pulse ID', 'House', 'Date', 'Submitted By', 'Status', 'Overall Status', 'Actions']}
        loading={loading}
      >
        {pulses.map((pulse) => (
          <TableRow key={pulse.id}>
            <TableCell className="font-mono">{pulse.pulse_id}</TableCell>
            <TableCell>
              <div>
                <div className="">{pulse.house_name}</div>
                <div className="text-sm text-muted-foreground">{pulse.house_code}</div>
              </div>
            </TableCell>
            <TableCell>{new Date(pulse.pulse_date).toLocaleDateString()}</TableCell>
            <TableCell>
              <div>
                <div className="">{pulse.submitted_by_name}</div>
                <div className="text-sm text-muted-foreground">{pulse.submitted_by_email}</div>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(pulse.status)}</TableCell>
            <TableCell>{getStatusBadge(pulse.overall_status)}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPulse(pulse);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </AdminDataTable>

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Governance Pulse</DialogTitle>
            <DialogDescription>
              Update pulse status and observations
            </DialogDescription>
          </DialogHeader>
          {selectedPulse && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField label="Pulse ID">
                  <Input value={selectedPulse.pulse_id} disabled />
                </AdminFormField>
                <AdminFormField label="House">
                  <Input value={`${selectedPulse.house_name} (${selectedPulse.house_code})`} disabled />
                </AdminFormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField label="Status">
                  <Select value={selectedPulse.status} onValueChange={(value) => setSelectedPulse({...selectedPulse, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </AdminFormField>
                <AdminFormField label="Overall Status">
                  <Select value={selectedPulse.overall_status} onValueChange={(value) => setSelectedPulse({...selectedPulse, overall_status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="concerns">Concerns</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                    </SelectContent>
                  </Select>
                </AdminFormField>
              </div>
              <AdminFormField label="Escalation Required">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedPulse.escalation_required}
                    onCheckedChange={(checked) => setSelectedPulse({...selectedPulse, escalation_required: checked})}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedPulse.escalation_required ? 'Yes' : 'No'}
                  </span>
                </div>
              </AdminFormField>
              <AdminFormField label="Additional Observations">
                <Input
                  value={selectedPulse.additional_observations || ''}
                  onChange={(e) => setSelectedPulse({...selectedPulse, additional_observations: e.target.value})}
                  placeholder="Enter any additional observations..."
                  className="min-h-[100px]"
                />
              </AdminFormField>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsEditDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleUpdatePulse}>
              Update Pulse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default AdminPulseManagement;
