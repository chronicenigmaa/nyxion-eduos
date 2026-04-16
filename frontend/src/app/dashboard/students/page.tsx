"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Search, GraduationCap } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  father_name: string;
  roll_number: string;
  class_name: string;
  section: string;
  phone: string;
  is_active: boolean;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "", father_name: "", roll_number: "",
    class_name: "", section: "", phone: ""
  });

  const load = async () => {
    try {
      const { data } = await api.get("/api/v1/students/");
      setStudents(data);
    } catch { toast.error("Failed to load students"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/students/", form);
      toast.success("Student added!");
      setShowForm(false);
      setForm({ full_name: "", father_name: "", roll_number: "", class_name: "", section: "", phone: "" });
      load();
    } catch { toast.error("Failed to add student"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this student?")) return;
    try {
      await api.delete(`/api/v1/students/${id}`);
      toast.success("Student removed");
      load();
    } catch { toast.error("Failed to remove student"); }
  };

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-slate-400">{students.length} enrolled</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium transition-all"
        >
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">New Student</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(form).map((key) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1 capitalize">{key.replace("_", " ")}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key === "full_name"}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or roll number..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {["Roll No", "Name", "Father's Name", "Class", "Section", "Phone", ""].map((h) => (
                <th key={h} className="text-left text-xs text-slate-400 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-slate-500 py-12">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12">
                <GraduationCap size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-slate-500 text-sm">No students yet</p>
              </td></tr>
            ) : filtered.map((s) => (
              <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-all">
                <td className="px-4 py-3 text-purple-400 text-sm font-mono">{s.roll_number || "—"}</td>
                <td className="px-4 py-3 text-white text-sm font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-slate-400 text-sm">{s.father_name || "—"}</td>
                <td className="px-4 py-3 text-slate-300 text-sm">{s.class_name || "—"}</td>
                <td className="px-4 py-3 text-slate-300 text-sm">{s.section || "—"}</td>
                <td className="px-4 py-3 text-slate-400 text-sm">{s.phone || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(s.id)} className="text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}