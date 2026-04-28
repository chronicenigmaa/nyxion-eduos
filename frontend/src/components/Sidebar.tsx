"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import {
  LayoutDashboard, Users, GraduationCap,
  ClipboardList, DollarSign, MessageSquare, Brain,
  Building2, LogOut, ChevronRight, FileText, TrendingUp,
  BookMarked, UserCog
} from "lucide-react";

const navItems = [
  { href: "/dashboard",               label: "Dashboard",    icon: LayoutDashboard },
  { href: "/dashboard/students",      label: "Students",     icon: GraduationCap },
  { href: "/dashboard/teachers",      label: "Teachers",     icon: Users },
  { href: "/dashboard/attendance",    label: "Attendance",   icon: ClipboardList },
  { href: "/dashboard/assignments",   label: "Assignments",  icon: FileText },
  { href: "/dashboard/results",       label: "Results",      icon: TrendingUp },
  { href: "/dashboard/academics",     label: "Academics",    icon: BookMarked },
  { href: "/dashboard/users",         label: "Manage Users", icon: UserCog, adminOnly: true },
  { href: "/dashboard/finance",       label: "Finance",      icon: DollarSign },
  { href: "/dashboard/communication", label: "WhatsApp",     icon: MessageSquare },
  { href: "/dashboard/ai",            label: "AI Tools",     icon: Brain },
  { href: "/dashboard/schools",       label: "Schools",      icon: Building2, superAdminOnly: true },
  { href: "/portal",                   label: "Student Portal", icon: GraduationCap },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = navItems.filter((item) => {
    const superAdminAllowed = !item.superAdminOnly || user?.role === "super_admin";
    const adminAllowed = !item.adminOnly || user?.role === "super_admin" || user?.role === "school_admin";
    return superAdminAllowed && adminAllowed;
  });

  return (
    <aside className="w-64 h-screen sticky top-0 bg-white flex flex-col border-r border-slate-200">
      <div className="p-5 border-b border-slate-100">
        <Image src="/logo-light.svg" alt="Nyxion Labs" width={120} height={37} priority />
        <p className="text-slate-400 text-xs mt-2">{user?.school_name || "All Schools"}</p>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <span className={"text-xs px-2 py-1 rounded-full font-medium " + (
          user?.role === "super_admin"  ? "bg-purple-100 text-purple-700" :
          user?.role === "school_admin" ? "bg-blue-100 text-blue-700" :
          "bg-green-100 text-green-700"
        )}>
          {user?.role?.replace("_", " ").toUpperCase()}
        </span>
        <p className="text-slate-700 text-sm font-medium mt-1.5">{user?.full_name}</p>
      </div>

      <nav className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group " + (
                active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}>
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
