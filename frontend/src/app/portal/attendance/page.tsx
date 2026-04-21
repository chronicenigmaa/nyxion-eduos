"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Save } from "lucide-react";

type StudentRow = {
  id: string;
  full_name: string;
  roll_number: string | null;
  class_name: string | null;
  section: string | null;
  status: string;
};

const STATUSES = ["present", "absent", "late", "leave"] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLE: Record<Status, string> = {
  present: "bg-green-100 text-green-700 border-green-300",
  absent:  "bg-red-100 text-red-700 border-red-300",
  late:    "bg-yellow-100 text-yellow-700 border-yellow-300",
  leave:   "bg-blue-100 text-blue-700 border-blue-300",
};

export default function PortalAttendancePage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status | "">>({});
  const [classes, setClasses] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = (d: string) => {
    setLoading(true);
    setSaved(false);
    api.get(`/api/v1/portal/attendance?attendance_date=${d}`)
      .then(r => {
        setStudents(r.data.students);
        setClasses(r.data.classes);
        const initial: Record<string, Status | ""> = {};
        for (const s of r.data.students) {
          initial[s.id] = STATUSES.includes(s.status as Status) ? (s.status as Status) : "";
        }
        setStatuses(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(date); }, [date]);

  const mark = (id: string, status: Status | "") => {
    setStatuses(prev => ({ ...prev, [id]: status }));
    setSaved(false);
  };

  const markAll = (status: Status) => {
    const next: Record<string, Status | ""> = {};
    for (const s of filtered) next[s.id] = status;
    setStatuses(prev => ({ ...prev, ...next }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    const records = students
      .filter(s => statuses[s.id])
      .map(s => ({ student_id: s.id, status: statuses[s.id] }));
    try {
      await api.post("/api/v1/attendance/mark", { date, records });
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  const filtered = filter === "all" ? students : students.filter(s => `${s.class_name}${s.section || ""}` === filter);
  const markedCount = filtered.filter(s => statuses[s.id]).length;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">{markedCount}/{filtered.length} marked</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={save}
            disabled={saving || markedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <Save size={15} />
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {classes.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button onClick={() => setFilter("all")}
            className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (filter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
            All
          </button>
          {classes.map(cls => (
            <button key={cls} onClick={() => setFilter(cls)}
              className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (filter === cls ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              Class {cls}
            </button>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex gap-2 mb-4">
          <span className="text-xs text-slate-500 self-center mr-1">Mark all:</span>
          {STATUSES.map(s => (
            <button key={s} onClick={() => markAll(s)}
              className="px-3 py-1 rounded-lg text-xs font-medium border capitalize transition-all hover:opacity-80 bg-slate-50 text-slate-600 border-slate-200">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No students found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Roll No.</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Class</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const cur = statuses[s.id] || "";
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 text-sm font-mono">{s.roll_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-900 text-sm font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {s.class_name}{s.section ? ` – ${s.section}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={cur}
                        onChange={e => mark(s.id, e.target.value as Status)}
                        className={"px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer " +
                          (cur ? STATUS_STYLE[cur as Status] : "bg-white text-slate-400 border-slate-200")}
                      >
                        <option value="">— Not marked</option>
                        {STATUSES.map(st => (
                          <option key={st} value={st} className="bg-white text-slate-700 capitalize">{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
