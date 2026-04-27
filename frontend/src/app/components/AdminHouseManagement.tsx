import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Switch } from "./ui/switch";
import { Building, Home, Edit, Trash2, Search, Users, Key, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
});

interface House {
  id: string;
  name: string;
  registration_number: string;
  address: string;
  city: string;
  county: string;
  postcode: string;
  phone: string;
  email: string;
  capacity: number;
  manager_id?: string;
  manager_name?: string;
  manager_first_name?: string;
  manager_last_name?: string;
  is_active: boolean;
}

interface HouseStats {
  total: number;
  active: number;
  withManager: number;
}

const HouseForm = ({ formData, managers, onChange }: { formData: any, managers: any[], onChange: (field: string, value: any) => void }) => (
  <div className="grid gap-4 py-4">
    <div className="grid gap-2">
      <Label htmlFor="name" className="flex items-center gap-1">Site Name <span className="text-destructive">*</span></Label>
      <Input
        id="name"
        placeholder="e.g. Oakwood Care Home"
        value={formData.name}
        onChange={(e) => onChange("name", e.target.value)}
        className="border-2 border-border focus:ring-primary"
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="reg_num">Registration Number (e.g. CQC ID)</Label>
      <Input
        id="reg_num"
        placeholder="Unique ID or Registration Number"
        value={formData.registration_number}
        onChange={(e) => onChange("registration_number", e.target.value)}
        className="border-2 border-border focus:ring-primary"
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
      <Input
        id="address"
        placeholder="Street address"
        value={formData.address}
        onChange={(e) => onChange("address", e.target.value)}
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
        <Input id="city" value={formData.city} onChange={(e) => onChange("city", e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="postcode">Postcode <span className="text-destructive">*</span></Label>
        <Input id="postcode" value={formData.postcode} onChange={(e) => onChange("postcode", e.target.value)} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
       <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={formData.phone} onChange={(e) => onChange("phone", e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="capacity">Capacity (Beds)</Label>
        <Input id="capacity" type="number" value={formData.capacity} onChange={(e) => onChange("capacity", e.target.value)} />
      </div>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="managerId">Assigned Manager</Label>
      <Select 
        value={formData.managerId} 
        onValueChange={(val) => onChange("managerId", val)}
      >
        <SelectTrigger id="managerId">
          <SelectValue placeholder="Select a manager" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No manager assigned</SelectItem>
          {managers.map((m: any) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center justify-between p-3 border-2 border-border rounded-md mt-2">
        <div className="space-y-0.5">
          <Label>Operational Status</Label>
          <p className="text-xs text-muted-foreground">{formData.isActive ? 'Active - Site is operational' : 'Inactive - Site is archived'}</p>
        </div>
        <Switch checked={formData.isActive} onCheckedChange={(val) => onChange("isActive", val)} />
    </div>
  </div>
);

const AdminHouseManagement: React.FC = () => {
  const [houses, setHouses] = useState<House[]>([]);
  const [stats, setStats] = useState<HouseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);

  const emptyForm = {
    name: "", registration_number: "", address: "", city: "",
    county: "", postcode: "", phone: "", email: "",
    capacity: "0", managerId: "", isActive: true,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [managers, setManagers] = useState<any[]>([]);
  
  const fetchManagers = async () => {
    try {
      const res = await fetch(`${API}/users?limit=100`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const allUsers = data.data?.users ?? data.data ?? [];
      const eligibleManagers = allUsers.filter((u: any) => 
        ['REGISTERED_MANAGER', 'TEAM_LEADER'].includes((u.role || '').toUpperCase())
      );
      setManagers(eligibleManagers);
    } catch (err) {
      console.error("Failed to fetch managers", err);
    }
  };

  const fetchHouses = async () => {
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: "20" });
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("is_active", statusFilter === "active" ? "true" : "false");

      const res = await fetch(`${API}/houses?${params}`, { headers: getHeaders() });
      if (!res.ok) { toast.error("Failed to fetch sites"); return; }
      const data = await res.json();
      const list = data.data?.houses ?? data.data ?? [];
      setHouses(Array.isArray(list) ? list : []);
      setTotalPages(data.meta?.pages ?? 1);
    } catch (err) {
      toast.error("Network error loading sites");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchHouses(), fetchManagers()]);
      setLoading(false);
    };
    load();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (houses.length > 0) {
      setStats({
        total: houses.length,
        active: houses.filter(h => h.is_active).length,
        withManager: houses.filter(h => h.manager_id).length,
      });
    }
  }, [houses]);

  const validateForm = () => {
    if (!formData.name.trim()) { toast.error("Site name is required"); return false; }
    if (!formData.address.trim()) { toast.error("Address is required"); return false; }
    if (!formData.city.trim()) { toast.error("City is required"); return false; }
    if (!formData.postcode.trim()) { toast.error("Postcode is required"); return false; }
    return true;
  };

  const handleCreateHouse = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/houses`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: formData.name,
          registration_number: formData.registration_number,
          address: formData.address,
          city: formData.city,
          county: formData.county,
          postcode: formData.postcode,
          phone: formData.phone,
          email: formData.email,
          capacity: parseInt(formData.capacity) || 0,
          manager_id: formData.managerId === "none" ? null : formData.managerId || null,
          is_active: formData.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create site. It may already exist.");
      }
      toast.success("Site created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchHouses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateHouse = async () => {
    if (!selectedHouse || !validateForm()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/houses/${selectedHouse.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          name: formData.name,
          registration_number: formData.registration_number,
          address: formData.address,
          city: formData.city,
          county: formData.county,
          postcode: formData.postcode,
          phone: formData.phone,
          email: formData.email,
          capacity: parseInt(formData.capacity) || 0,
          manager_id: formData.managerId === "none" ? null : formData.managerId || null,
          is_active: formData.isActive,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Site updated successfully");
      setIsEditDialogOpen(false);
      fetchHouses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
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
      toast.success("Site archived");
      setIsDeleteDialogOpen(false);
      fetchHouses();
    } catch {
      toast.error("Archive failed");
    }
  };

  const resetForm = () => setFormData(emptyForm);

  const openEditDialog = (house: House) => {
    setSelectedHouse(house);
    setFormData({
      name: house.name,
      registration_number: house.registration_number || "",
      address: house.address,
      city: house.city,
      county: house.county || "",
      postcode: house.postcode,
      phone: house.phone || "",
      email: house.email || "",
      capacity: String(house.capacity),
      managerId: house.manager_id || "none",
      isActive: house.is_active,
    });
    setIsEditDialogOpen(true);
  };


  if (loading) return (
    <div className="p-6">Loading...</div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Site Management</h1>
        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
          <Home className="mr-2 h-4 w-4" /> Add Site
        </Button>
      </div>

      {stats && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Total Sites</span>
              <Building className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-success">Active Sites</span>
              <ShieldCheck className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </div>
          <div className="bg-card border-2 border-border p-6 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">With Managers</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.withManager}</div>
          </div>
        </div>
      )}

      <Card className="border-2 border-border">
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
               <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input className="pl-8" placeholder="Search by site name or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Site Name</TableHead>
                <TableHead className="font-bold">Reg Number</TableHead>
                <TableHead className="font-bold">Location</TableHead>
                <TableHead className="font-bold">Registered Manager</TableHead>
                <TableHead className="font-bold">Capacity</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {houses.map((house) => (
                <TableRow key={house.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{house.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{house.registration_number || '—'}</TableCell>
                  <TableCell>{[house.city, house.postcode].filter(Boolean).join(", ")}</TableCell>
                  <TableCell>
                    {house.manager_first_name ? (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {house.manager_first_name} {house.manager_last_name}</span>
                    ) : <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>}
                  </TableCell>
                  <TableCell>{house.capacity} Beds</TableCell>
                  <TableCell>
                    <Badge variant={house.is_active ? "default" : "secondary"} className={house.is_active ? "bg-success" : ""}>
                      {house.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(house)}><Edit size={14} /></Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => { setSelectedHouse(house); setIsDeleteDialogOpen(true); }}>
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
           <div className="flex justify-between mt-4 text-sm text-muted-foreground">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <Building className="w-5 h-5 text-primary" />
               Add New Governance Site
            </DialogTitle>
            <DialogDescription>Initialise a new care setting with strict governance oversight.</DialogDescription>
          </DialogHeader>
          <HouseForm formData={formData} managers={managers} onChange={(f, v) => setFormData(p => ({...p, [f]: v}))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateHouse} disabled={isSubmitting}>
               {isSubmitting ? 'Creating...' : 'Create Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Site Records</DialogTitle>
          </DialogHeader>
          <HouseForm formData={formData} managers={managers} onChange={(f, v) => setFormData(p => ({...p, [f]: v}))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateHouse} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this site?</AlertDialogTitle>
            <AlertDialogDescription>Archiving will preserve governance records but block new pulse submissions for this site.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHouse} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Archive Site</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Card = ({ children, className }: any) => <div className={`bg-card shadow-sm ${className}`}>{children}</div>;

export default AdminHouseManagement;