"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Save, Brain, Loader2 } from "lucide-react";

interface AttendanceRecord { student_id: string; student_name: string; roll_number: string; class_name: string; status: string; }

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [classFilter, setClassFilter] = useState("");

  const load = async (d: string) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/attendance/report?date=" + d);
      setRecords(data.records);
      setSummary({ total: data.total, present: data.present, absent: data.absent, late: data.late });
      const map: Record<string, string> = {};
      data.records.forEach((r: AttendanceRecord) => { map[r.student_id] = r.status === "not_marked" ? "present" : r.status; });
      setAttendance(map);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(date); }, [date]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/v1/attendance/mark", {
        date, records: Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
      });
      toast.success("Attendance saved!");
      load(date);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const markAll = (status: string) => {
    const newMap = { ...attendance };
    filteredRecords.forEach(r => { newMap[r.student_id] = status; });
    setAttendance(newMap);
  };

  const getAIInsight = async () => {
    setAiLoading(true);
    try {
      const absent = records.filter(r => attendance[r.student_id] === "absent").map(r => r.student_name);
      const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
      const { data } = await api.post("/api/v1/ai/analyze", {
        prompt: "Attendance for " + date + ": Total: " + summary.total + ", Present: " + summary.present + ", Absent: " + summary.absent + ", Late: " + summary.late + ". Rate: " + rate + "%. Absent: " + (absent.join(", ") || "none") + ". Provide insights.",
        type: "attendance"
      });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  const classes = [...new Set(records.map(r => r.class_name).filter(Boolean))];
  const filteredRecords = records.filter(r => !classFilter || r.class_name === classFilter);
  const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
  const statusColor = (s: string) => s === "present" ? "bg-green-500/20 text-green-400 border-green-500/30" : s === "absent" ? "bg-red-500/20 text-red-400 border-red-500/30" : s === "late" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-slate-700 text-slate-400 border-slate-600";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Attendance</h1><p className="text-slate-400">{rate}% rate today</p></div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none" />
          <button onClick={getAIInsight} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-300 text-sm border border-blue-500/20">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-blue-400" /><span className="text-blue-400 text-sm font-medium">AI Analysis</span><button onClick={() => setAiInsight("")} className="ml-auto text-slate-500 text-xs">dismiss</button></div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[{ label: "Total", value: summary.total, color: "text-white" }, { label: "Present", value: summary.present, color: "text-green-400" }, { label: "Absent", value: summary.absent, color: "text-red-400" }, { label: "Late", value: summary.late, color: "text-amber-400" }, { label: "Rate", value: rate + "%", color: rate >= 90 ? "text-green-400" : rate >= 75 ? "text-amber-400" : "text-red-400" }].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4"><p className="text-slate-400 text-sm">{label}</p><p className={"text-3xl font-bold " + color}>{value}</p></div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <button onClick={() => markAll("present")} className="px-3 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-sm">Mark All Present</button>
        <button onClick={() => markAll("absent")} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm">Mark All Absent</button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-700">{["Roll No", "Name", "Class", "Status"].map(h => <th key={h} className="text-left text-xs text-slate-400 font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="text-center text-slate-500 py-12">Loading...</td></tr>
              : filteredRecords.map((r) => (
                <tr key={r.student_id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-blue-400 text-sm font-mono">{r.roll_number || "—"}</td>
                  <td className="px-4 py-3 text-white text-sm font-medium">{r.student_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{r.class_name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {["present", "absent", "late", "leave"].map(s => (
                        <button key={s} onClick={() => setAttendance({ ...attendance, [r.student_id]: s })}
                          className={"px-3 py-1 rounded-lg text-xs border font-medium capitalize transition-all " + (attendance[r.student_id] === s ? statusColor(s) : "bg-slate-700/30 text-slate-500 border-slate-700 hover:border-slate-500")}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
