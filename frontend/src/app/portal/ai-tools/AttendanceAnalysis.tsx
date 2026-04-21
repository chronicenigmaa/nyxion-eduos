"use client";
import { useState } from "react";
import api from "@/lib/api";
import { BarChart2, Sparkles, Loader2 } from "lucide-react";

type StudentRow = {
  id: string;
  full_name: string;
  roll_number: string | null;
  class_name: string | null;
  section: string | null;
  status: string;
};

export default function AttendanceAnalysis({ onBack }: { onBack: () => void }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [summary, setSummary] = useState<{ total: number; present: number; absent: number; late: number } | null>(null);
  const [error, setError] = useState("");

  const analyse = async () => {
    setLoading(true); setError(""); setResult(""); setSummary(null);

    // Collect attendance for each day in range
    const days: string[] = [];
    const cur = new Date(fromDate);
    const end = new Date(toDate);
    while (cur <= end) {
      days.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
    if (days.length > 31) { setError("Please select a range of 31 days or less."); setLoading(false); return; }

    try {
      // Fetch attendance for each day
      const allRecords: Record<string, StudentRow[]> = {};
      for (const day of days) {
        const r = await api.get(`/api/v1/portal/attendance?attendance_date=${day}`);
        if (r.data.students?.length > 0) allRecords[day] = r.data.students;
      }

      if (Object.keys(allRecords).length === 0) {
        setError("No attendance records found for this date range.");
        setLoading(false);
        return;
      }

      // Aggregate per student
      const studentStats: Record<string, { name: string; present: number; absent: number; late: number; leave: number; total: number }> = {};
      let totalPresent = 0, totalAbsent = 0, totalLate = 0;

      for (const [, students] of Object.entries(allRecords)) {
        for (const s of students) {
          if (!studentStats[s.id]) studentStats[s.id] = { name: s.full_name, present: 0, absent: 0, late: 0, leave: 0, total: 0 };
          const st = studentStats[s.id];
          st.total++;
          if (s.status === "present") { st.present++; totalPresent++; }
          else if (s.status === "absent") { st.absent++; totalAbsent++; }
          else if (s.status === "late") { st.late++; totalLate++; }
          else if (s.status === "leave") st.leave++;
        }
      }

      const totalDays = Object.keys(allRecords).length;
      const studentList = Object.values(studentStats);
      setSummary({ total: studentList.length, present: totalPresent, absent: totalAbsent, late: totalLate });

      const atRisk = studentList
        .filter(s => s.total > 0 && (s.absent / s.total) >= 0.3)
        .map(s => `${s.name}: ${s.absent} absent, ${s.late} late out of ${s.total} days`);

      const prompt = `Analyze attendance data for my class from ${fromDate} to ${toDate} (${totalDays} school days recorded).

Student-wise summary:
${studentList.map(s => `- ${s.name}: Present ${s.present}, Absent ${s.absent}, Late ${s.late}, Leave ${s.leave} (out of ${s.total} days, rate: ${s.total > 0 ? Math.round((s.present/s.total)*100) : 0}%)`).join("\n")}

At-risk students (≥30% absence rate):
${atRisk.length > 0 ? atRisk.join("\n") : "None"}

Provide:
1. Overall attendance summary
2. Students needing immediate attention (with specific concerns)
3. Patterns or trends noticed
4. Recommended actions for the teacher
5. Suggested parent communication for at-risk students`;

      const r = await api.post("/api/v1/ai/analyze", { prompt, type: "attendance" });
      setResult(r.data.response);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to analyse attendance");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 mb-6">← Back to AI Tools</button>
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900">Attendance Analysis</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 space-y-4">
        <p className="text-sm text-slate-500">Select a date range to analyse attendance patterns across your assigned students.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={analyse} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Analysing…" : "Analyse Attendance"}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Students", value: summary.total, color: "bg-slate-50 text-slate-700" },
            { label: "Present", value: summary.present, color: "bg-green-50 text-green-700" },
            { label: "Absent", value: summary.absent, color: "bg-red-50 text-red-700" },
            { label: "Late", value: summary.late, color: "bg-yellow-50 text-yellow-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs mt-0.5 opacity-70">{label}</p>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Sparkles size={13} className="text-blue-500" />
            <span className="text-sm font-medium text-slate-700">AI Analysis</span>
          </div>
          <div className="p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  );
}
