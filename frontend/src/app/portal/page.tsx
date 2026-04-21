"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ClipboardList, TrendingUp, DollarSign, Users, Bell } from "lucide-react";

export default function PortalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/portal/dashboard").then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading your dashboard...</div>;
  if (!data) return <div className="p-8 text-slate-400">Could not load dashboard.</div>;

  const stats = data.stats || {};

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {data.name?.split(" ")[0]}</h1>
        <p className="text-slate-500 mt-1">
          {data.class_name ? "Class " + data.class_name : ""}{data.roll_number ? " · Roll No. " + data.roll_number : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Attendance", value: (stats.attendance_rate || 0) + "%", icon: Users, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Work", value: stats.pending_assignments || 0, icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Results", value: stats.total_results || 0, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending Fees", value: stats.pending_fees || 0, icon: DollarSign, color: stats.pending_fees > 0 ? "text-red-600" : "text-green-600", bg: stats.pending_fees > 0 ? "bg-red-50" : "bg-green-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={"w-10 h-10 rounded-xl " + bg + " flex items-center justify-center mb-3"}>
              <Icon size={20} className={color}/>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-4">Assignments</h2>
          {(data.assignments || []).length === 0 ? <p className="text-slate-400 text-sm">No assignments</p>
            : (data.assignments || []).slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-slate-900 text-sm font-medium">{a.title}</p>
                  {a.due_date && <p className="text-slate-400 text-xs">Due {new Date(a.due_date).toLocaleDateString()}</p>}
                </div>
                <span className={"px-2 py-1 rounded-lg text-xs font-medium " + (a.submitted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                  {a.submitted ? (a.grade ? a.grade + "/" + a.total_marks + " pts" : "Submitted") : "Pending"}
                </span>
              </div>
            ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2"><Bell size={16} className="text-blue-600"/> Notices</h2>
          {(data.notices || []).length === 0 ? <p className="text-slate-400 text-sm">No notices</p>
            : (data.notices || []).map((n: any, i: number) => (
              <div key={i} className="py-3 border-b border-slate-50 last:border-0">
                <p className="text-slate-900 text-sm font-medium">{n.title}</p>
                <p className="text-slate-400 text-xs capitalize">{n.type} · {new Date(n.date).toLocaleDateString()}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
