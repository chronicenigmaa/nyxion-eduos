"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CheckCircle, XCircle, Clock, Save } from "lucide-react";

type StudentRow = {
  id: string;
  full_name: string;
  roll_number: string | null;
  class_name: string | null;
  section: string | null;
  status: string;
};

const STATUS_CYCLE = ["present", "absent", "late"];

function statusLabel(s: string) {
  if (s === "present") return { label: "Present", cls: "bg-green-100 text-green-700", icon: CheckCircle };
  if (s === "absent")  return { label: "Absent",  cls: "bg-red-100 text-red-700",   icon: XCircle };
  if (s === "late")    return { label: "Late",    cls: "bg-yellow-100 text-yellow-700", icon: Clock };
  return { label: "—", cls: "bg-slate-100 text-slate-400", icon: Clock };
}

export default function PortalAttendancePage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
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
        const initial: Record<string, string> = {};
        for (const s of r.data.students) initial[s.id] = s.status;
        setStatuses(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(date); }, [date]);

  const toggle = (id: string) => {
    setStatuses(prev => {
      const cur = prev[id];
      const idx = STATUS_CYCLE.indexOf(cur);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...prev, [id]: next };
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    const records = students
      .filter(s => statuses[s.id] && statuses[s.id] !== "not_marked")
      .map(s => ({ student_id: s.id, status: statuses[s.id] }));
    try {
      await api.post("/api/v1/attendance/mark", { date, records });
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  const filtered = filter === "all" ? students : students.filter(s => `${s.class_name}${s.section || ""}` === filter);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">Mark attendance for your students</p>
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
            disabled={saving || students.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <Save size={15} />
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {classes.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (filter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
          >All</button>
          {classes.map(cls => (
            <button key={cls} onClick={() => setFilter(cls)}
              className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (filter === cls ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              Class {cls}
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
                {["Roll No.", "Name", "Class", "Status"].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const st = statuses[s.id] || "not_marked";
                const { label, cls, icon: Icon } = statusLabel(st);
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 text-sm">{s.roll_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-900 text-sm font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {s.class_name}{s.section ? ` – ${s.section}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(s.id)}
                        className={"flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all " + cls}>
                        <Icon size={13} />
                        {label}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-3">Click a status badge to cycle: Present → Absent → Late</p>
    </div>
  );
}
