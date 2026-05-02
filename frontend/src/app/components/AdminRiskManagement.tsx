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
import { AlertTriangle, Plus, Edit, Trash2, Search, TrendingUp, Activity } from 'lucide-react';

interface RiskActivity {
  id: string;
  activity_id: string;
  risk_id: string;
  house_id: string;
  house_name: string;
  house_code: string;
  performed_by: string;
  performed_by_name: string;
  performed_by_email: string;
  performed_at: string;
  activity_type: string;
  description: string;
  old_value: string;
  new_value: string;
  source: string;
  created_at: string;
}

interface RiskStats {
  total: number;
  created: number;
  updated: number;
  escalated: number;
  mitigated: number;
  reviewed: number;
  closed: number;
}

const AdminRiskManagement: React.FC = () => {
  const navigate = useNavigate();
  const [risks, setRisks] = useState<RiskActivity[]>([]);
  const [stats, setStats] = useState<RiskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string | undefined>(undefined);
  const [houseFilter, setHouseFilter] = useState<string | undefined>(undefined);
  const [selectedRisk, setSelectedRisk] = useState<RiskActivity | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [houses, setHouses] = useState<any[]>([]);

  // Fetch risks
  const fetchRisks = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(activityTypeFilter && { activityType: activityTypeFilter }),
        ...(houseFilter && houseFilter !== 'all' && { houseId: houseFilter })
      });

      const response = await fetch(`/api/admin/risks?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRisks(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error('Failed to fetch risk activities');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/risks/stats/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch risk stats:', error);
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

  // Create risk activity
  const handleCreateRisk = async () => {
    const formData = {
      risk_id: 'RISK_' + Date.now(),
      house_id: undefined as string | undefined,
      activity_type: 'created',
      description: undefined as string | undefined,
      old_value: undefined as string | undefined,
      new_value: undefined as string | undefined,
      source: 'manual'
    };

    try {
      const response = await fetch('/api/admin/risks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Risk activity created successfully');
        setIsCreateDialogOpen(false);
        fetchRisks();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create risk activity');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };


  useEffect(() => {
    fetchRisks();
    fetchStats();
    fetchHouses();
  }, []);

  const activityTypeOptions: Array<{ value: string | undefined; label: string }> = [
    { value: undefined, label: 'All Types' },
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'mitigated', label: 'Mitigated' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'closed', label: 'Closed' }
  ];

  const getActivityTypeColor = (type: string) => {
    const colors = {
      created: 'text-blue-600',
      updated: 'text-orange-600',
      escalated: 'text-red-600',
      mitigated: 'text-green-600',
      reviewed: 'text-purple-600',
      closed: 'text-muted-foreground'
    };
    return colors[type as keyof typeof colors] || 'text-muted-foreground';
  };

  return (
    <div className="p-6 space-y-6 bg-muted min-h-screen">
      <AdminPageHeader 
        title="Risk Management" 
        description="Track and manage risk activities across all facilities"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <AdminStatsCard
          title="Total Activities"
          value={stats?.total || 0}
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <AdminStatsCard
          title="Created"
          value={stats?.created || 0}
          icon={<Plus className="h-6 w-6 text-blue-600" />}
        />
        <AdminStatsCard
          title="Escalated"
          value={stats?.escalated || 0}
          icon={<TrendingUp className="h-6 w-6 text-red-600" />}
        />
        <AdminStatsCard
          title="Mitigated"
          value={stats?.mitigated || 0}
          icon={<Activity className="h-6 w-6 text-green-600" />}
        />
      </div>

      {/* Search and Filters */}
      <AdminSearchBar
        search={searchTerm}
        onSearch={setSearchTerm}
        placeholder="Search risk activities..."
        filters={
          <>
            <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {activityTypeOptions.map(option => (
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

      {/* Create Button */}
      <div className="mb-6">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Risk Activity
        </Button>
      </div>

      {/* Risks Table */}
      <AdminDataTable
        headers={['Activity ID', 'Risk ID', 'House', 'Performed By', 'Type', 'Description', 'Date', 'Actions']}
        loading={loading}
      >
        {risks.map((risk) => (
          <TableRow key={risk.id}>
            <TableCell className="font-mono">{risk.activity_id}</TableCell>
            <TableCell className="font-mono">{risk.risk_id}</TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{risk.house_name}</div>
                <div className="text-sm text-muted-foreground">{risk.house_code}</div>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{risk.performed_by_name}</div>
                <div className="text-sm text-muted-foreground">{risk.performed_by_email}</div>
              </div>
            </TableCell>
            <TableCell>
              <span className={`font-medium ${getActivityTypeColor(risk.activity_type)}`}>
                {risk.activity_type}
              </span>
            </TableCell>
            <TableCell className="max-w-xs truncate">{risk.description}</TableCell>
            <TableCell>{new Date(risk.performed_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                {/* Delete button removed due to No Hard Deletes governance override */}
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

      {/* Create Risk Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Risk Activity</DialogTitle>
            <DialogDescription>
              Log a new risk activity for tracking and management
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField label="Risk ID">
                <Input placeholder="Enter risk ID..." className="font-mono" />
              </AdminFormField>
              <AdminFormField label="House">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select house" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a house</SelectItem>
                    {houses.map(house => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.name} ({house.house_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AdminFormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField label="Activity Type">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="mitigated">Mitigated</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>
              <AdminFormField label="Source">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="imported">Imported</SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>
            </div>
            <AdminFormField label="Description">
              <Input
                placeholder="Describe the risk activity..."
                className="min-h-[100px]"
              />
            </AdminFormField>
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField label="Old Value">
                <Input
                  placeholder="Previous value (if applicable)..."
                  className="min-h-[80px]"
                />
              </AdminFormField>
              <AdminFormField label="New Value">
                <Input
                  placeholder="New value (if applicable)..."
                  className="min-h-[80px]"
                />
              </AdminFormField>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCreateDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleCreateRisk}>
              Create Risk Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default AdminRiskManagement;
