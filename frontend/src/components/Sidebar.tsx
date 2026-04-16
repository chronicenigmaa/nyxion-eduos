"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardList, DollarSign, MessageSquare, Brain,
  Building2, LogOut, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: GraduationCap },
  { href: "/dashboard/teachers", label: "Teachers", icon: Users },
  { href: "/dashboard/academics", label: "Academics", icon: BookOpen },
  { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
  { href: "/dashboard/finance", label: "Finance", icon: DollarSign },
  { href: "/dashboard/communication", label: "WhatsApp", icon: MessageSquare },
  { href: "/dashboard/ai", label: "AI Tools", icon: Brain },
  { href: "/dashboard/schools", label: "Schools", icon: Building2, superAdminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = navItems.filter(item =>
    !item.superAdminOnly || user?.role === "super_admin"
  );

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col border-r border-slate-800">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Nyxion EduOS</p>
            <p className="text-slate-400 text-xs">{user?.school_name || "All Schools"}</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b border-slate-800">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          user?.role === "super_admin" ? "bg-purple-500/20 text-purple-300" :
          user?.role === "school_admin" ? "bg-blue-500/20 text-blue-300" :
          "bg-green-500/20 text-green-300"
        }`}>
          {user?.role?.replace("_", " ").toUpperCase()}
        </span>
        <p className="text-slate-300 text-sm font-medium mt-1">{user?.full_name}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                active
                  ? "bg-purple-500 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}