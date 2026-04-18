"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardList, DollarSign, MessageSquare, Brain,
  Building2, LogOut, ChevronRight, FileText, TrendingUp,
  BookMarked, Calendar
} from "lucide-react";

const navItems = [
  { href: "/dashboard",               label: "Dashboard",    icon: LayoutDashboard },
  { href: "/dashboard/students",      label: "Students",     icon: GraduationCap },
  { href: "/dashboard/teachers",      label: "Teachers",     icon: Users },
  { href: "/dashboard/attendance",    label: "Attendance",   icon: ClipboardList },
  { href: "/dashboard/assignments",   label: "Assignments",  icon: FileText },
  { href: "/dashboard/results",       label: "Results",      icon: TrendingUp },
  { href: "/dashboard/coursebooks",   label: "Course Books", icon: BookOpen },
  { href: "/dashboard/academics",     label: "Academics",    icon: BookMarked },
  { href: "/dashboard/timetable",     label: "Timetable",    icon: Calendar },
  { href: "/dashboard/finance",       label: "Finance",      icon: DollarSign },
  { href: "/dashboard/communication", label: "WhatsApp",     icon: MessageSquare },
  { href: "/dashboard/ai",            label: "AI Tools",     icon: Brain },
  { href: "/dashboard/schools",       label: "Schools",      icon: Building2, superAdminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = navItems.filter(item => !item.superAdminOnly || user?.role === "super_admin");

  return (
    <aside className="w-64 bg-white min-h-screen flex flex-col border-r border-slate-200">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <p className="text-slate-900 font-bold text-sm">Nyxion EduOS</p>
            <p className="text-slate-400 text-xs">{user?.school_name || "All Schools"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          user?.role === "super_admin"  ? "bg-purple-100 text-purple-700" :
          user?.role === "school_admin" ? "bg-blue-100 text-blue-700" :
          "bg-green-100 text-green-700"
        }`}>
          {user?.role?.replace("_", " ").toUpperCase()}
        </span>
        <p className="text-slate-700 text-sm font-medium mt-1.5">{user?.full_name}</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}>
              <Icon size={17} className={active ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
              <span className="flex-1 font-medium">{label}</span>
              {active && <ChevronRight size={14} className="text-blue-200" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full">
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
