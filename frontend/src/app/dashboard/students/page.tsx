"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Search, GraduationCap, TrendingUp, AlertCircle, Lightbulb, Users, Pencil } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import ExportButton from "@/components/ExportButton";

interface Student {
  id: string;
  full_name: string;
  father_name: string;
  roll_number: string;
  class_name: string;
  section: string;
  phone: string;
}

type ApiError = { response?: { data?: { detail?: string } } };

type StudentForm = {
  full_name: string;
  father_name: string;
  roll_number: string;
  class_name: string;
  section: string;
  phone: string;
};

const emptyForm: StudentForm = {
  full_name: "",
  father_name: "",
  roll_number: "",
  class_name: "",
  section: "",
  phone: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const load = async () => {
    try {
      const { data } = await api.get("/api/v1/students/");
      setStudents(data);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingStudentId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudentId) {
        await api.put(`/api/v1/students/${editingStudentId}`, form);
        toast.success("Student updated");
      } else {
        await api.post("/api/v1/students/", form);
        toast.success("Student added");
      }
      resetForm();
      await load();
    } catch (error: unknown) {
      const message = (error as ApiError)?.response?.data?.detail || "Failed to save student";
      toast.error(message);
    }
  };

  const handleEdit = (student: Student) => {
    setForm({
      full_name: student.full_name || "",
      father_name: student.father_name || "",
      roll_number: student.roll_number || "",
      class_name: student.class_name || "",
      section: student.section || "",
      phone: student.phone || "",
    });
    setEditingStudentId(student.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this student?")) return;
    try {
      await api.delete(`/api/v1/students/${id}`);
      toast.success("Removed");
      await load();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed");
    }
  };

  const classes = [...new Set(students.map((s) => s.class_name).filter(Boolean))];
  const summary =
    `Total: ${students.length} students. Classes: ${classes.join(", ")}. Distribution: ` +
    classes.map((c) => `Class ${c}: ${students.filter((s) => s.class_name === c).length} students`).join(", ");

  const aiOptions = [
    { label: "Enrollment Analysis", icon: TrendingUp, type: "academic", prompt: `Analyze enrollment for a Pakistani school. ${summary}. Give insights on trends and class sizes.` },
    { label: "Class Distribution", icon: Users, type: "academic", prompt: `Are classes balanced? ${summary}. Provide recommendations for better distribution.` },
    { label: "At-Risk Students", icon: AlertCircle, type: "academic", prompt: `Based on enrollment: ${summary}. Which groups need attention? Provide early intervention recommendations.` },
    { label: "Growth Strategy", icon: Lightbulb, type: "academic", prompt: `Based on student data: ${summary}. Provide 5 recommendations for school growth and student retention in Pakistan.` },
  ];

  const filtered = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500">{students.length} enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton title="Students Report" data={filtered} filename="students-report" />
          <button
            onClick={() => {
              setShowForm((prev) => !prev);
              if (showForm) {
                resetForm();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
          >
            <Plus size={16} /> {editingStudentId ? "Edit Student" : "Add Student"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Students</p><p className="text-3xl font-bold text-slate-900 mt-1">{students.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Classes</p><p className="text-3xl font-bold text-blue-600 mt-1">{classes.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Avg Class Size</p><p className="text-3xl font-bold text-green-600 mt-1">{classes.length > 0 ? Math.round(students.length / classes.length) : 0}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Largest Class</p><p className="text-3xl font-bold text-amber-600 mt-1">{classes.length > 0 ? Math.max(...classes.map((c) => students.filter((s) => s.class_name === c).length)) : 0}</p></div>
      </div>

      <AIInsightsPanel options={aiOptions} title="Student AI Analysis" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">{editingStudentId ? "Update Student Info" : "New Student"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.keys(form).map((key) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1 capitalize">{key.replace("_", " ")}</label>
                <input
                  value={form[key as keyof StudentForm]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key === "full_name"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or roll number..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Roll No", "Name", "Father Name", "Class", "Section", "Phone", "", ""].map((h) => (
                <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-slate-400 py-12">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12"><GraduationCap size={32} className="mx-auto text-slate-300 mb-2" /><p className="text-slate-400 text-sm">No students yet</p></td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-blue-600 text-sm font-mono font-medium">{s.roll_number || "-"}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{s.father_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm">{s.class_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm">{s.section || "-"}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{s.phone || "-"}</td>
                  <td className="px-4 py-3"><button onClick={() => handleEdit(s)} className="text-slate-300 hover:text-blue-500 transition-all"><Pencil size={15} /></button></td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={15} /></button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
