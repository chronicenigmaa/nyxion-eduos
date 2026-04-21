"use client";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, ClipboardList, TrendingUp, Calendar, BookOpen, LogOut, ChevronRight } from "lucide-react";

const nav = [
  { href: "/portal",             label: "Home",        icon: LayoutDashboard },
  { href: "/portal/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/portal/results",     label: "Results",     icon: TrendingUp },
  { href: "/portal/timetable",   label: "Timetable",   icon: Calendar },
  { href: "/portal/resources",   label: "Resources",   icon: BookOpen },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <Image src="/logo-light.svg" alt="Nyxion" width={110} height={34} priority/>
          <p className="text-slate-400 text-xs mt-2">{user.role === "teacher" ? "Teacher Portal" : "Student Portal"}</p>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-slate-900 text-sm font-medium">{user.full_name}</p>
          <p className="text-slate-400 text-xs capitalize">{user.role.replace("_"," ")}</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all " + (active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                <Icon size={17} className={active ? "text-white" : "text-slate-400"}/>
                <span className="flex-1 font-medium">{label}</span>
                {active && <ChevronRight size={13} className="text-blue-200"/>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          {user.role !== "teacher" && (
            <a href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-50 mb-1">
              Back to Admin
            </a>
          )}
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full">
            <LogOut size={16}/> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}