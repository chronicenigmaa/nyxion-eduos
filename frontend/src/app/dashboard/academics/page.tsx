"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2 } from "lucide-react";

export default function AcademicsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ name: "", class_name: "", teacher_id: "", description: "" });

  const load = async () => {
    try {
      const [s, cl, t, st] = await Promise.all([
        api.get("/api/v1/academics/subjects"),
        api.get("/api/v1/academics/classes"),
        api.get("/api/v1/teachers/"),
        api.get("/api/v1/students/")
      ]);
      setSubjects(s.data); setClasses(cl.data); setTeachers(t.data); setStudents(st.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/academics/subjects", form);
      toast.success("Subject added!");
      setShowForm(false);
      setForm({ name: "", class_name: "", teacher_id: "", description: "" });
      load();
    } catch { toast.error("Failed"); }
  };

  const getAIInsight = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("/api/v1/ai/analyze", {
        prompt: "Academic structure: Students: " + students.length + ", Classes: " + classes.map((c: any) => "Class " + c.class_name).join(", ") + ", Subjects: " + subjects.map((s: any) => s.name).join(", ") + ", Teachers: " + teachers.length + ". Analyze and provide recommendations.",
        type: "academic"
      });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Academics</h1><p className="text-slate-400">{classes.length} classes · {subjects.length} subjects</p></div>
        <div className="flex gap-2">
          <button onClick={getAIInsight} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-300 text-sm border border-blue-500/20">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI Analysis
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            <Plus size={16} /> Add Subject
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-blue-400" /><span className="text-blue-400 text-sm font-medium">AI Academic Analysis</span><button onClick={() => setAiInsight("")} className="ml-auto text-slate-500 text-xs">dismiss</button></div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4"><p className="text-slate-400 text-sm">Total Students</p><p className="text-3xl font-bold text-white">{students.length}</p></div>
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4"><p className="text-slate-400 text-sm">Classes</p><p className="text-3xl font-bold text-blue-400">{classes.length}</p></div>
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4"><p className="text-slate-400 text-sm">Subjects</p><p className="text-3xl font-bold text-green-400">{subjects.length}</p></div>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Add Subject</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-xs text-slate-400 mb-1">Subject Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Class</label><input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                <option value="">Select teacher</option>
                {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-white font-semibold mb-4">Classes</h2>
          {loading ? <p className="text-slate-500 text-sm">Loading...</p>
            : classes.length === 0 ? <p className="text-slate-500 text-sm">No classes yet — add students first</p>
            : classes.map((cl: any) => (
              <div key={cl.class_name} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                <div><p className="text-white text-sm font-medium">Class {cl.class_name}</p><p className="text-slate-400 text-xs">Sections: {cl.sections?.join(", ") || "—"}</p></div>
                <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs">{students.filter((s: any) => s.class_name === cl.class_name).length} students</span>
              </div>
            ))}
        </div>
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-white font-semibold mb-4">Subjects</h2>
          {loading ? <p className="text-slate-500 text-sm">Loading...</p>
            : subjects.length === 0 ? <p className="text-slate-500 text-sm">No subjects yet</p>
            : subjects.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                <div><p className="text-white text-sm font-medium">{s.name}</p><p className="text-slate-400 text-xs">{s.description || "No description"}</p></div>
                <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs">Class {s.class_name || "All"}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
