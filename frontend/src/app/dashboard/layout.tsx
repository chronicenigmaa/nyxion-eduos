"use client";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";

const isPortalRole = (role?: string) => role === "teacher" || role === "student" || role === "parent";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
    if (!loading && user && isPortalRole(user.role)) window.location.href = "/portal";
  }, [user, loading]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user || isPortalRole(user.role)) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
    </div>
  );
}
