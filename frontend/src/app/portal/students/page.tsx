"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Users } from "lucide-react";

type Student = {
  id: string;
  full_name: string;
  father_name: string | null;
  roll_number: string | null;
  class_name: string | null;
  section: string | null;
  phone: string | null;
};

export default function PortalStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    api.get("/api/v1/portal/my-students")
      .then(r => {
        setStudents(r.data.students);
        setClasses(r.data.classes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? students : students.filter(s => `${s.class_name}${s.section}` === filter);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Students</h1>
        <p className="text-slate-500 mt-1">{students.length} students in your assigned classes</p>
      </div>

      {classes.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (filter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
          >
            All
          </button>
          {classes.map(cls => (
            <button
              key={cls}
              onClick={() => setFilter(cls)}
              className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (filter === cls ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              Class {cls}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">No students found in your assigned classes</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Name", "Roll No.", "Class", "Father's Name", "Phone"].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{s.roll_number || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                      {s.class_name}{s.section ? ` – ${s.section}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{s.father_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{s.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
