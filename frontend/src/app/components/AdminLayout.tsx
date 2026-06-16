import React from "react";
import AdminSidebar from "./shared/AdminSidebar";

// Wraps admin management pages with the fixed AdminSidebar so the navbar is
// always present (pages render their own content with internal padding).
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-64 min-h-screen">{children}</div>
    </div>
  );
}

export default AdminLayout;
