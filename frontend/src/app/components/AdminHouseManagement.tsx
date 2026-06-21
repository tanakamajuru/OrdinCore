import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Switch } from "./ui/switch";
import {
  Building, Home, Edit, Trash2, Search, Users, ShieldCheck,
  UserPlus, UserMinus, X, ChevronRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
});

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface ServiceUser {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  is_active: boolean;
}

interface HouseStats {
  total: number;
  active: number;
  withManager: number;
}

// ─── House Form (reused for create/edit) ────────────────────────────────────

const HouseForm = ({
  formData,
  managers,
  onChange,
}: {
  formData: any;
  managers: any[];
  onChange: (field: string, value: any) => void;
}) => (
  <div className="grid gap-4 py-4">
    <div className="grid gap-2">
      <Label htmlFor="name" className="flex items-center gap-1">
        Service Name <span className="text-destructive">*</span>
      </Label>
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
      <Label htmlFor="address">
        Address <span className="text-destructive">*</span>
      </Label>
      <Input
        id="address"
        placeholder="Street address"
        value={formData.address}
        onChange={(e) => onChange("address", e.target.value)}
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="city">
          City <span className="text-destructive">*</span>
        </Label>
        <Input id="city" value={formData.city} onChange={(e) => onChange("city", e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="postcode">
          Postcode <span className="text-destructive">*</span>
        </Label>
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
        <Input
          id="capacity"
          type="number"
          value={formData.capacity}
          onChange={(e) => onChange("capacity", e.target.value)}
        />
      </div>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="sector">Sector (drives the signal library &amp; thresholds)</Label>
      <Select value={formData.sector} onValueChange={(val) => onChange("sector", val)}>
        <SelectTrigger id="sector">
          <SelectValue placeholder="Select a sector" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SUPPORTED_LIVING">Supported Living</SelectItem>
          <SelectItem value="DOMICILIARY">Domiciliary Care</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="grid gap-2">
      <Label htmlFor="managerId">Assigned Manager</Label>
      <Select value={formData.managerId} onValueChange={(val) => onChange("managerId", val)}>
        <SelectTrigger id="managerId">
          <SelectValue placeholder="Select a manager" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No manager assigned</SelectItem>
          {managers.map((m: any) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center justify-between p-3 border-2 border-border rounded-md mt-2">
      <div className="space-y-0.5">
        <Label>Operational Status</Label>
        <p className="text-xs text-muted-foreground">
          {formData.isActive ? "Active - Service is operational" : "Inactive - Service is archived"}
        </p>
      </div>
      <Switch checked={formData.isActive} onCheckedChange={(val) => onChange("isActive", val)} />
    </div>
  </div>
);

// ─── Patient / Service-User Drawer ───────────────────────────────────────────

const PatientDrawer = ({
  house,
  onClose,
}: {
  house: House;
  onClose: () => void;
}) => {
  const [patients, setPatients] = useState<ServiceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<ServiceUser | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/houses/${house.id}/service-users`, { headers: getHeaders() });
      const data = await res.json();
      setPatients(data?.data || []);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  }, [house.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/houses/${house.id}/service-users`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ first_name: form.first_name.trim(), last_name: form.last_name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add patient");
      }
      toast.success(`Patient added to ${house.name}`);
      setForm({ first_name: "", last_name: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (patient: ServiceUser) => {
    setDeactivating(patient.id);
    try {
      const res = await fetch(`${API}/service-users/${patient.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) throw new Error("Deactivation failed");
      toast.success(`${patient.display_name} removed from active roster`);
      setConfirmDeactivate(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeactivating(null);
    }
  };

  return (
    <>
      {/* Backdrop – pointer-events only on the backdrop itself, not the drawer */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        style={{ pointerEvents: 'auto' }}
      />

      {/* Slide-over panel – stop propagation so backdrop never captures drawer clicks */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col bg-background border-l-2 border-border shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b-2 border-border bg-card">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <h2 className="text-xl font-semibold tracking-tight">Patients</h2>
            </div>
            <p className="text-sm text-muted-foreground font-medium">{house.name}</p>
            {house.address && (
              <p className="text-xs text-muted-foreground mt-0.5">{[house.address, house.city, house.postcode].filter(Boolean).join(", ")}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add patient form */}
        <div className="px-6 py-5 border-b border-border bg-primary/5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add New Patient
          </h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="drawer-first-name" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="drawer-first-name"
                  placeholder="e.g. Thomas"
                  value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                  className="border-2 border-border focus:border-primary"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="drawer-last-name" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="drawer-last-name"
                  placeholder="e.g. Muller"
                  value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                  className="border-2 border-border focus:border-primary"
                  autoComplete="off"
                />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full mt-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding Patient…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Add Patient to {house.name}
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              The patient's name is stored as a privacy-safe display name (e.g. "T Muller") for use in signal forms.
            </p>
          </form>
        </div>

        {/* Patient list */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Active Patients
            </h3>
            {!isLoading && (
              <Badge variant="outline" className="text-xs">
                {patients.length} registered
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-lg">
              <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No patients registered yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the form above to add the first patient.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(p.display_name || `${p.first_name} ${p.last_name}`).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.display_name || `${p.first_name} ${p.last_name}`}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">ID: {p.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDeactivate(p)}
                    disabled={deactivating === p.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-50"
                    title="Remove patient from active roster"
                  >
                    {deactivating === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deactivate confirm */}
      <AlertDialog open={!!confirmDeactivate} onOpenChange={(open) => !open && setConfirmDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove patient from active roster?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDeactivate?.display_name}</strong> will be deactivated and will no longer appear in signal forms for {house.name}.
              Existing governance records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
            >
              Remove Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const [patientDrawerHouse, setPatientDrawerHouse] = useState<House | null>(null);

  const emptyForm = {
    name: "", registration_number: "", address: "", city: "",
    county: "", postcode: "", phone: "", email: "",
    capacity: "0", managerId: "", isActive: true, sector: "SUPPORTED_LIVING",
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
        ["REGISTERED_MANAGER", "TEAM_LEADER"].includes((u.role || "").toUpperCase())
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
        active: houses.filter((h) => h.is_active).length,
        withManager: houses.filter((h) => h.manager_id).length,
      });
    }
  }, [houses]);

  const validateForm = () => {
    if (!formData.name.trim()) { toast.error("Service name is required"); return false; }
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
          sector: formData.sector,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create site. It may already exist.");
      }
      toast.success("Service created successfully");
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
          sector: formData.sector,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Service updated successfully");
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
      toast.success("Service archived");
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
      sector: (house as any).sector || "SUPPORTED_LIVING",
    });
    setIsEditDialogOpen(true);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl text-primary">Service Management</h1>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Home className="mr-2 h-4 w-4" /> Add Service
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <div className="flex justify-between mb-2">
                <span className="text-sm">Total Services</span>
                <Building className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl">{stats.total}</div>
            </div>
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-success">Active Services</span>
                <ShieldCheck className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl text-success">{stats.active}</div>
            </div>
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <div className="flex justify-between mb-2">
                <span className="text-sm">With Managers</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl">{stats.withManager}</div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card shadow-sm border-2 border-border">
          <div className="p-6">
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by service name or location…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Reg Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Registered Manager</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {houses.map((house) => (
                  <TableRow key={house.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{house.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {house.registration_number || "—"}
                    </TableCell>
                    <TableCell>{[house.city, house.postcode].filter(Boolean).join(", ")}</TableCell>
                    <TableCell>
                      {house.manager_first_name ? (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {house.manager_first_name} {house.manager_last_name}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{house.capacity} Beds</TableCell>
                    <TableCell>
                      <Badge
                        variant={house.is_active ? "default" : "secondary"}
                        className={house.is_active ? "bg-success" : ""}
                      >
                        {house.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Wrap in div – applying flex directly on td causes hit-test issues */}
                      <div className="flex items-center gap-2">
                        {/* ── Manage Patients ── */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1.5 text-primary border-primary/40 hover:bg-primary/10 hover:border-primary"
                          onClick={() => setPatientDrawerHouse(house)}
                          title="Manage patients for this service"
                        >
                          <span>Patients</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                        {/* ── Edit ── */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(house)}
                          title="Edit service details"
                        >
                          <Edit size={14} />
                        </Button>
                        {/* ── Archive ── */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => { setSelectedHouse(house); setIsDeleteDialogOpen(true); }}
                          title="Archive site"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {houses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No services found. Create a new service to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex justify-between mt-4 text-sm text-muted-foreground">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Patient drawer ── */}
      {patientDrawerHouse && (
        <PatientDrawer
          house={patientDrawerHouse}
          onClose={() => setPatientDrawerHouse(null)}
        />
      )}

      {/* ── Create dialog ── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Add New Governance Service
            </DialogTitle>
            <DialogDescription>
              Initialise a new care service with strict governance oversight.
            </DialogDescription>
          </DialogHeader>
          <HouseForm formData={formData} managers={managers} onChange={(f, v) => setFormData((p) => ({ ...p, [f]: v }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateHouse} disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Service Records</DialogTitle>
            <DialogDescription>
              Edit the details for this governance service. All changes are saved immediately.
            </DialogDescription>
          </DialogHeader>
          <HouseForm formData={formData} managers={managers} onChange={(f, v) => setFormData((p) => ({ ...p, [f]: v }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateHouse} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Archive confirm ── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this service?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving will preserve governance records but block new pulse submissions for this service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHouse}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminHouseManagement;