"use client";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  GraduationCap, Users, Building2, TrendingUp, ClipboardList,
  DollarSign, BookOpen, Brain, Settings, ChevronRight, Sparkles
} from "lucide-react";
import Link from "next/link";
import ExportButton from "@/components/ExportButton";

type SchoolSummary = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  package: string;
  features: Record<string, boolean>;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, teachers: 0, schools: 0 });
  const [schools, setSchools] = useState<SchoolSummary[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentsRes, teachersRes, schoolsRes] = await Promise.allSettled([
          api.get("/api/v1/students/"),
          api.get("/api/v1/teachers/"),
          api.get("/api/v1/schools/"),
        ]);
        const nextStudents = studentsRes.status === "fulfilled" ? studentsRes.value.data.length : 0;
        const nextTeachers = teachersRes.status === "fulfilled" ? teachersRes.value.data.length : 0;
        const nextSchools = schoolsRes.status === "fulfilled" ? schoolsRes.value.data.length : 0;

        setStats({ students: nextStudents, teachers: nextTeachers, schools: nextSchools });
        if (schoolsRes.status === "fulfilled") {
          setSchools(schoolsRes.value.data as SchoolSummary[]);
        }
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
    { label: "Manage Students", href: "/dashboard/students",    icon: Users,         color: "bg-sky-600" },
    { label: "Mark Attendance", href: "/dashboard/attendance",  icon: ClipboardList, color: "bg-green-600" },
    { label: "Manage Fees",     href: "/dashboard/finance",     icon: DollarSign,    color: "bg-amber-500" },
    { label: "AI Tools",        href: "/dashboard/ai",          icon: Brain,         color: "bg-purple-600" },
    { label: "Assignments",     href: "/dashboard/assignments", icon: BookOpen,      color: "bg-rose-500" },
    { label: "Results",         href: "/dashboard/results",     icon: TrendingUp,    color: "bg-teal-600" },
  ];
  const superAdminQuickLinks = [
    { label: "School Info", href: "/dashboard/schools", icon: Building2, color: "bg-slate-900" },
    { label: "Feature Toggles", href: "/dashboard/schools", icon: Settings, color: "bg-indigo-600" },
    { label: "Admin Users", href: "/dashboard/users?role=school_admin", icon: Users, color: "bg-blue-700" },
  ];
  const quickActions = user?.role === "super_admin" ? [...quickLinks, ...superAdminQuickLinks] : quickLinks;
  const featuredSchools = schools.slice(0, 3);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good morning, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-1">
            {user?.school_name ? user.school_name + "  -  " : ""}
            {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <ExportButton
          title="Dashboard Overview"
          filename="dashboard-overview"
          data={[
            { metric: "Total Students", value: stats.students },
            { metric: "Total Teachers", value: stats.teachers },
            { metric: "Active Schools", value: stats.schools },
            { metric: "Attendance Rate", value: "94%" },
          ]}
        />
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
            {quickActions.map(({ label, href, icon: Icon, color }) => (
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

      {user?.role === "super_admin" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 mt-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-slate-900 font-semibold">School Info</h2>
                <p className="text-slate-500 text-sm mt-1">Latest schools, packages, and contact details</p>
              </div>
              <Link href="/dashboard/schools" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                Manage
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {featuredSchools.map((school) => (
                <div key={school.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-slate-900 font-semibold">{school.name}</p>
                      <p className="text-slate-500 text-sm mt-1">{school.code} · {school.email || "No email set"}</p>
                    </div>
                    <span className={"px-2 py-1 rounded-full text-xs font-medium capitalize border " + (
                      school.package === "elite"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : school.package === "growth"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-green-50 text-green-700 border-green-200"
                    )}>
                      {school.package}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Phone</p>
                      <p className="text-slate-700 mt-1">{school.phone || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Enabled Features</p>
                      <p className="text-slate-700 mt-1">
                        {Object.values(school.features || {}).filter(Boolean).length}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!featuredSchools.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500 text-sm">
                  No schools available yet.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Sparkles size={18} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-slate-900 font-semibold">Feature Toggles</h2>
                <p className="text-slate-500 text-sm mt-1">Snapshot of AI access across your network</p>
              </div>
            </div>
            <div className="space-y-3">
              {featuredSchools.map((school) => {
                const enabledCount = Object.values(school.features || {}).filter(Boolean).length;
                return (
                  <Link
                    key={school.id}
                    href="/dashboard/schools"
                    className="block rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-slate-900 font-semibold">{school.name}</p>
                        <p className="text-slate-500 text-sm mt-1">{enabledCount} features enabled</p>
                      </div>
                      <Settings size={18} className="text-slate-400" />
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/dashboard/schools"
                className="flex items-center justify-between rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-medium hover:bg-slate-800 transition-all"
              >
                Open school controls
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
