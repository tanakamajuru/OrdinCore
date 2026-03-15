import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Building, Home, Edit, Trash2, Search, Users, Key } from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
});

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
  is_active: boolean;
}

interface HouseStats {
  total: number;
  active: number;
  withManager: number;
  occupancyRate: number;
}

const AdminHouseManagement: React.FC = () => {
  const [houses, setHouses] = useState<House[]>([]);
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

  const emptyForm = {
    name: "", houseCode: "", address: "", city: "",
    county: "", postcode: "", phone: "", email: "",
    capacity: "", currentOccupancy: "", managerId: "", isActive: true,
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchHouses = async () => {
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: "20" });
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("is_active", statusFilter === "active" ? "true" : "false");

      const res = await fetch(`${API}/houses?${params}`, { headers: getHeaders() });
      if (!res.ok) { toast.error("Failed to fetch houses"); return; }
      const data = await res.json();
      const list = data.data?.houses ?? data.data ?? [];
      setHouses(Array.isArray(list) ? list : []);
      setTotalPages(data.data?.totalPages ?? data.meta?.pages ?? 1);
    } catch (err) {
      toast.error("Network error loading houses");
    }
  };

  const computeStats = (list: House[]) => {
    setStats({
      total: list.length,
      active: list.filter(h => h.is_active).length,
      withManager: list.filter(h => h.manager_id).length,
      occupancyRate: list.length > 0
        ? Math.round(list.reduce((sum, h) => sum + (h.capacity > 0 ? (h.current_occupancy / h.capacity) * 100 : 0), 0) / list.length)
        : 0,
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchHouses();
      setLoading(false);
    };
    load();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    computeStats(houses);
  }, [houses]);

  const resetForm = () => setFormData(emptyForm);

  const handleCreateHouse = async () => {
    try {
      const res = await fetch(`${API}/houses`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: formData.name,
          house_code: formData.houseCode,
          address: formData.address,
          city: formData.city,
          county: formData.county,
          postcode: formData.postcode,
          phone: formData.phone,
          email: formData.email,
          capacity: parseInt(formData.capacity) || 0,
          current_occupancy: parseInt(formData.currentOccupancy) || 0,
          is_active: formData.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create house");
      }
      toast.success("House created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchHouses();
    } catch (err: any) {
      toast.error(err.message || "Failed to create house");
    }
  };

  const handleUpdateHouse = async () => {
    if (!selectedHouse) return;
    try {
      const res = await fetch(`${API}/houses/${selectedHouse.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          name: formData.name,
          house_code: formData.houseCode,
          address: formData.address,
          city: formData.city,
          county: formData.county,
          postcode: formData.postcode,
          phone: formData.phone,
          email: formData.email,
          capacity: parseInt(formData.capacity) || 0,
          is_active: formData.isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("House updated");
      setIsEditDialogOpen(false);
      fetchHouses();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDeleteHouse = async () => {
    if (!selectedHouse) return;
    try {
      const res = await fetch(`${API}/houses/${selectedHouse.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success("House deleted");
      setIsDeleteDialogOpen(false);
      fetchHouses();
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
      phone: house.phone || "",
      email: house.email || "",
      capacity: String(house.capacity),
      currentOccupancy: String(house.current_occupancy),
      managerId: house.manager_id || "",
      isActive: house.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const occupancyColor = (rate: number) =>
    rate >= 90 ? "text-red-600" : rate >= 75 ? "text-yellow-600" : "text-green-600";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
    </div>
  );

  const HouseForm = () => (
    <div className="grid gap-4 py-4">
      {[
        { id: "name", label: "House Name", placeholder: "e.g. Oakwood House", field: "name" },
        { id: "houseCode", label: "House Code", placeholder: "e.g. OAK001", field: "houseCode" },
        { id: "address", label: "Address", placeholder: "Street address", field: "address" },
        { id: "city", label: "City", placeholder: "City", field: "city" },
        { id: "county", label: "County", placeholder: "County", field: "county" },
        { id: "postcode", label: "Postcode", placeholder: "Postcode", field: "postcode" },
        { id: "phone", label: "Phone", placeholder: "Phone number", field: "phone" },
        { id: "email", label: "Email", placeholder: "Contact email", field: "email" },
      ].map(({ id, label, placeholder, field }) => (
        <div key={id} className="grid gap-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            placeholder={placeholder}
            value={(formData as any)[field]}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" type="number" placeholder="Max capacity" value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currentOccupancy">Current Occupancy</Label>
          <Input id="currentOccupancy" type="number" placeholder="0" value={formData.currentOccupancy}
            onChange={(e) => setFormData({ ...formData, currentOccupancy: e.target.value })} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <Key className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold">House Management</h1>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Home className="mr-2 h-4 w-4" /> Add House
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard title="Total Houses" value={stats.total} icon={Building} />
          <StatCard title="Active Houses" value={stats.active} icon={Building} />
          <StatCard title="Managers Assigned" value={stats.withManager} icon={Users} />
          <StatCard title="Avg Occupancy" value={`${stats.occupancyRate}%`} icon={Users} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-black p-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4" />
              <Input className="pl-8" placeholder="Search house..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
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
        {houses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No houses yet</p>
            <p className="text-sm">Click "Add House" to create the first care home</p>
          </div>
        ) : (
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
                const rate = house.capacity > 0
                  ? Math.round((house.current_occupancy / house.capacity) * 100) : 0;
                return (
                  <TableRow key={house.id}>
                    <TableCell className="font-medium">{house.name}</TableCell>
                    <TableCell><Badge variant="outline">{house.house_code}</Badge></TableCell>
                    <TableCell>{[house.city, house.county].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>{house.manager_name || <Badge variant="secondary">None</Badge>}</TableCell>
                    <TableCell>
                      <span className={occupancyColor(rate)}>{house.current_occupancy}/{house.capacity}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={house.is_active ? "default" : "secondary"}>
                        {house.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(house)}><Edit size={14} /></Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedHouse(house); setIsDeleteDialogOpen(true); }}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-between mt-4">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
            <Button size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New House</DialogTitle>
            <DialogDescription>Create a new care home or facility for your organisation</DialogDescription>
          </DialogHeader>
          <HouseForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateHouse}>Create House</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit House</DialogTitle>
          </DialogHeader>
          <HouseForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateHouse}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete House?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHouse} className="bg-red-600">Delete</AlertDialogAction>
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