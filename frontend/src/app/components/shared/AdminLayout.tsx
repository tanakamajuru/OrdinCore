import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

// Re-export all UI components for consistency
export {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Badge, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger,
  toast
};

// Common layout components
export const AdminPageHeader: React.FC<{ title: string; description?: string; children?: React.ReactNode }> = ({ title, description, children }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {description && <p className="text-gray-600 mt-1">{description}</p>}
    </div>
    {children}
  </div>
);

export const AdminStatsCard: React.FC<{ title: string; value: string | number; icon?: React.ReactNode; change?: number; changeType?: 'increase' | 'decrease' | 'neutral' }> = ({ 
  title, value, icon, change, changeType = 'neutral' 
}) => {
  const changeColor = changeType === 'increase' ? 'text-green-600' : changeType === 'decrease' ? 'text-red-600' : 'text-gray-600';
  
  return (
    <div className="bg-white border-2 border-black p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm ${changeColor}`}>
              {changeType === 'increase' ? '+' : changeType === 'decrease' ? '-' : ''}{change}%
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
};

export const AdminDataTable: React.FC<{ 
  children: React.ReactNode;
  headers: string[];
  loading?: boolean;
  empty?: string;
}> = ({ children, headers, loading = false, empty = "No data available" }) => (
  <div className="bg-white border-2 border-black shadow-sm overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header, index) => (
            <TableHead key={index} className="font-semibold text-gray-900">
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={headers.length} className="text-center py-8">
              Loading...
            </TableCell>
          </TableRow>
        ) : children}
      </TableBody>
    </Table>
    {!loading && React.Children.count(children) === 0 && (
      <div className="text-center py-8 text-gray-500">
        {empty}
      </div>
    )}
  </div>
);

export const AdminSearchBar: React.FC<{
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  filters?: React.ReactNode;
}> = ({ search, onSearch, placeholder = "Search...", filters }) => (
  <div className="flex gap-4 mb-6">
    <div className="flex-1">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="max-w-md"
      />
    </div>
    {filters && <div className="flex gap-2">{filters}</div>}
  </div>
);

export const AdminPagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      {pages.map(page => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  );
};

// Common status badge colors
export const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
    inactive: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' },
    pending: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
    completed: { variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
    overdue: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
    good: { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
    concerns: { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' },
    serious: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' };
  
  return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
};

// Common form field wrapper
export const AdminFormField: React.FC<{
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, error, required = false, children }) => (
  <div className="space-y-2">
    <Label className={required ? "required" : ""}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);
