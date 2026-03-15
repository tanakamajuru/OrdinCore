import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Switch } from "./ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

import { Building, Home, Edit, Trash2, Search, Users, Key } from "lucide-react";
import { toast } from "sonner";

interface House {
  id: string;
  name: string;
  house_code: string;
  address: string;
  city: string;
  county: string;
  postcode: string;
  phone: string;
  email: string;
  capacity: number;
  current_occupancy: number;
  manager_id?: string;
  manager_name?: string;
  manager_email?: string;
  is_active: boolean;
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface HouseStats {
  total: number;
  active: number;
  withManager: number;
  occupancyRate: number;
}

const AdminHouseManagement: React.FC = () => {
  const [houses, setHouses] = useState<House[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [stats, setStats] = useState<HouseStats | null>(null);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    houseCode: "",
    address: "",
    city: "",
    county: "",
    postcode: "",
    phone: "",
    email: "",
    capacity: "",
    currentOccupancy: "",
    managerId: "",
    isActive: true,
  });

  const token = localStorage.getItem("token");

  const fetchHouses = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all")
        params.append("isActive", statusFilter === "active" ? "true" : "false");

      const res = await fetch(`/api/admin/houses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      setHouses(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(`Failed to fetch houses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchManagers = async () => {
    // TODO: Re-enable when backend compilation issues are resolved
    // Currently disabled to prevent 500 errors from non-functional backend
    setManagers([]);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/houses/stats/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setStats(data.data);
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Fetch houses and stats first (critical data)
      await Promise.all([fetchHouses(), fetchStats()]);
      // Fetch managers separately (non-critical data) - completely silent
      fetchManagers();
      setLoading(false);
    };

    load();
  }, [currentPage, searchTerm, statusFilter]);

  const resetForm = () => {
    setFormData({
      name: "",
      houseCode: "",
      address: "",
      city: "",
      county: "",
      postcode: "",
      phone: "",
      email: "",
      capacity: "",
      currentOccupancy: "",
      managerId: "",
      isActive: true,
    });
  };

  const handleCreateHouse = async () => {
    try {
      const res = await fetch("/api/admin/houses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity),
          currentOccupancy: parseInt(formData.currentOccupancy) || 0,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Create house error:', errorData);
        throw new Error(errorData.error || 'Failed to create house');
      }

      toast.success("House created");

      setIsCreateDialogOpen(false);
      resetForm();
      fetchHouses();
      fetchStats();
    } catch (error) {
      console.error('Create house failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create house');
    }
  };

  const handleUpdateHouse = async () => {
    if (!selectedHouse) return;

    try {
      const res = await fetch(`/api/admin/houses/${selectedHouse.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success("House updated");

      setIsEditDialogOpen(false);
      fetchHouses();
      fetchStats();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDeleteHouse = async () => {
    if (!selectedHouse) return;

    try {
      const res = await fetch(`/api/admin/houses/${selectedHouse.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      toast.success("House deleted");

      setIsDeleteDialogOpen(false);
      fetchHouses();
      fetchStats();
    } catch {
      toast.error("Delete failed");
    }
  };

  const openEditDialog = (house: House) => {
    setSelectedHouse(house);

    setFormData({
      name: house.name,
      houseCode: house.house_code,
      address: house.address,
      city: house.city,
      county: house.county,
      postcode: house.postcode,
      phone: house.phone,
      email: house.email,
      capacity: String(house.capacity),
      currentOccupancy: String(house.current_occupancy),
      managerId: house.manager_id || "",
      isActive: house.is_active,
    });

    setIsEditDialogOpen(true);
  };

  const getOccupancyRateColor = (rate: number) => {
    if (rate >= 90) return "text-red-600";
    if (rate >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            <Key className="mr-2 h-4 w-4" />
            Back
          </Button>

          <h1 className="text-3xl font-bold">House Management</h1>
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Home className="mr-2 h-4 w-4" />
          Add House
        </Button>
      </div>

      {/* Stats */}

      {stats && (
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard title="Total Houses" value={stats.total} icon={Building} />
          <StatCard
            title="Active Houses"
            value={stats.active}
            icon={Building}
          />
          <StatCard
            title="Managers Assigned"
            value={stats.withManager}
            icon={Users}
          />
          <StatCard
            title="Occupancy Rate"
            value={`${stats.occupancyRate}%`}
            icon={Users}
          />
        </div>
      )}

      {/* Filters */}

      <div className="bg-white border-2 border-black p-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4" />
              <Input
                className="pl-8"
                placeholder="Search house..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}

      <div className="bg-white border-2 border-black p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Occupancy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {houses.map((house) => {
              const rate =
                house.capacity > 0
                  ? Math.round(
                      (house.current_occupancy / house.capacity) * 100
                    )
                  : 0;

              return (
                <TableRow key={house.id}>
                  <TableCell>{house.name}</TableCell>

                  <TableCell>
                    <Badge variant="outline">{house.house_code}</Badge>
                  </TableCell>

                  <TableCell>
                    {house.city} / {house.county}
                  </TableCell>

                  <TableCell>
                    {house.manager_name || (
                      <Badge variant="secondary">None</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className={getOccupancyRateColor(rate)}>
                      {house.current_occupancy}/{house.capacity}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={house.is_active ? "default" : "secondary"}
                    >
                      {house.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(house)}
                    >
                      <Edit size={14} />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedHouse(house);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}

        <div className="flex justify-between mt-4">
          <span>
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>

            <Button
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create Dialog */}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create House</DialogTitle>
            <DialogDescription>
              Add a new facility
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">House Name</Label>
              <Input
                id="name"
                placeholder="House name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="houseCode">House Code</Label>
              <Input
                id="houseCode"
                placeholder="House code"
                value={formData.houseCode}
                onChange={(e) =>
                  setFormData({ ...formData, houseCode: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Full address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                placeholder="County"
                value={formData.county}
                onChange={(e) =>
                  setFormData({ ...formData, county: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                placeholder="Postcode"
                value={formData.postcode}
                onChange={(e) =>
                  setFormData({ ...formData, postcode: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Contact email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="Maximum capacity"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentOccupancy">Current Occupancy</Label>
              <Input
                id="currentOccupancy"
                type="number"
                placeholder="Current occupancy"
                value={formData.currentOccupancy}
                onChange={(e) =>
                  setFormData({ ...formData, currentOccupancy: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreateHouse}>
              Create House
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete House?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteHouse}
              className="bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon }: any) => (
  <div className="bg-white border-2 border-black p-6">
    <div className="flex justify-between mb-2">
      <span className="text-sm">{title}</span>
      <Icon size={16} />
    </div>

    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default AdminHouseManagement;