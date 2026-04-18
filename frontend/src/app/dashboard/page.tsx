"use client";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { GraduationCap, Users, Building2, TrendingUp, ClipboardList, DollarSign, BookOpen, Brain } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, sc] = await Promise.all([
          api.get("/api/v1/students/"),
          api.get("/api/v1/teachers/"),
          api.get("/api/v1/schools/"),
        ]);
        setStats({ students: s.data.length, teachers: t.data.length, schools: sc.data.length });
      } catch {}
    };
    load();
  }, []);

  const cards = [
    { label: "Total Students",  value: stats.students, icon: GraduationCap, bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
    { label: "Total Teachers",  value: stats.teachers, icon: Users,         bg: "bg-green-50",  text: "text-green-600", border: "border-green-100" },
    { label: "Active Schools",  value: stats.schools,  icon: Building2,     bg: "bg-purple-50", text: "text-purple-600",border: "border-purple-100" },
    { label: "Attendance Rate", value: "94%",           icon: TrendingUp,    bg: "bg-amber-50",  text: "text-amber-600", border: "border-amber-100" },
  ];

  const quickLinks = [
    { label: "Add Student",     href: "/dashboard/students",    icon: GraduationCap, color: "bg-blue-600" },
    { label: "Mark Attendance", href: "/dashboard/attendance",  icon: ClipboardList, color: "bg-green-600" },
    { label: "Manage Fees",     href: "/dashboard/finance",     icon: DollarSign,    color: "bg-amber-500" },
    { label: "AI Tools",        href: "/dashboard/ai",          icon: Brain,         color: "bg-purple-600" },
    { label: "Assignments",     href: "/dashboard/assignments", icon: BookOpen,      color: "bg-rose-500" },
    { label: "Results",         href: "/dashboard/results",     icon: TrendingUp,    color: "bg-teal-600" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Good morning, {user?.full_name?.split(" ")[0]}</h1>
        <p className="text-slate-500 mt-1">
          {user?.school_name ? user.school_name + "  -  " : ""}
          {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, bg, text, border }) => (
          <div key={label} className={"bg-white rounded-2xl border " + border + " p-6"}>
            <div className={"w-10 h-10 rounded-xl " + bg + " flex items-center justify-center mb-4"}>
              <Icon size={20} className={text} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickLinks.map(({ label, href, icon: Icon, color }) => (
              <Link key={label} href={href} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                <div className={"w-9 h-9 rounded-lg " + color + " flex items-center justify-center flex-shrink-0"}>
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-slate-700 text-sm font-medium group-hover:text-blue-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-5">System Status</h2>
          <div className="space-y-3">
            {[
              { label: "API Server", status: "online" },
              { label: "Database",   status: "online" },
              { label: "AI Engine",  status: "online" },
              { label: "WhatsApp",   status: "demo" },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-600 text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <div className={"w-1.5 h-1.5 rounded-full " + (status === "online" ? "bg-green-500" : "bg-amber-500")} />
                  <span className={"text-xs font-medium " + (status === "online" ? "text-green-600" : "text-amber-600")}>{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
