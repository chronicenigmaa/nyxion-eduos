"use client";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { GraduationCap, Users, Building2, Brain, TrendingUp, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [studentsRes, schoolsRes] = await Promise.all([
          api.get("/api/v1/students/"),
          api.get("/api/v1/schools/"),
        ]);
        setStats({
          students: studentsRes.data.length,
          teachers: 0,
          schools: schoolsRes.data.length,
        });
      } catch {}
    };
    load();
  }, []);

  const cards = [
    { label: "Total Students", value: stats.students, icon: GraduationCap, color: "purple" },
    { label: "Active Schools", value: stats.schools, icon: Building2, color: "blue" },
    { label: "AI Requests Today", value: "24", icon: Brain, color: "green" },
    { label: "Attendance Rate", value: "94%", icon: TrendingUp, color: "amber" },
  ];

  const colorMap: Record<string, string> = {
    purple: "bg-blue-600/10 text-blue-500 border-blue-600/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good morning, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1">
          {user?.school_name ? `${user.school_name} — ` : ""}
          {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-2xl border p-6 ${colorMap[color]}`}>
            <div className="flex items-center justify-between mb-4">
              <Icon size={22} />
              <span className="text-xs opacity-60">This month</span>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm mt-1 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Student", href: "/dashboard/students" },
              { label: "Generate Exam", href: "/dashboard/ai" },
              { label: "Mark Attendance", href: "/dashboard/attendance" },
              { label: "Send Notice", href: "/dashboard/communication" },
            ].map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="p-4 rounded-xl bg-slate-700/50 hover:bg-blue-600/10 border border-slate-600 hover:border-blue-600/30 text-slate-300 hover:text-blue-400 text-sm font-medium transition-all"
              >
                {a.label} →
              </a>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-white font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { label: "API", status: "online" },
              { label: "Database", status: "online" },
              { label: "AI Engine", status: "online" },
              { label: "WhatsApp", status: "demo" },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  status === "online" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}