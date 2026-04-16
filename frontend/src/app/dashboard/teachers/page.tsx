"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Search, Users, Brain, Loader2 } from "lucide-react";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  salary: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", subject: "", qualification: "", salary: "" });

  const load = async () => {
    try {
      const { data } = await api.get("/api/v1/teachers/");
      setTeachers(data);
    } catch { toast.error("Failed to load teachers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/teachers/", form);
      toast.success("Teacher added!");
      setShowForm(false);
      setForm({ full_name: "", email: "", phone: "", subject: "", qualification: "", salary: "" });
      load();
    } catch { toast.error("Failed to add teacher"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this teacher?")) return;
    try {
      await api.delete("/api/v1/teachers/" + id);
      toast.success("Removed");
      load();
    } catch { toast.error("Failed"); }
  };

  const getAIInsight = async () => {
    setAiLoading(true);
    try {
      const summary = "Total teachers: " + teachers.length + ". Subjects: " + [...new Set(teachers.map(t => t.subject).filter(Boolean))].join(", ");
      const { data } = await api.post("/api/v1/ai/analyze", {
        prompt: "Analyze this teacher data for a Pakistani school: " + summary + ". Provide insights on staff coverage, missing subjects, and hiring recommendations.",
        type: "academic"
      });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  const filtered = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Teachers</h1>
          <p className="text-slate-400">{teachers.length} staff members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={getAIInsight} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-300 text-sm font-medium border border-blue-500/20">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI Insights
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            <Plus size={16} /> Add Teacher
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">AI Analysis</span>
            <button onClick={() => setAiInsight("")} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">dismiss</button>
          </div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Total Staff</p>
          <p className="text-3xl font-bold text-white">{teachers.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Subjects Covered</p>
          <p className="text-3xl font-bold text-blue-400">{[...new Set(teachers.map(t => t.subject).filter(Boolean))].length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
          <p className="text-slate-400 text-sm">Avg Salary</p>
          <p className="text-3xl font-bold text-green-400">
            {teachers.filter(t => t.salary).length > 0
              ? Math.round(teachers.filter(t => t.salary).reduce((a, t) => a + parseInt(t.salary || "0"), 0) / teachers.filter(t => t.salary).length).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">New Teacher</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(form).map((key) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1 capitalize">{key.replace("_", " ")}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key === "full_name"}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or subject..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {["Name", "Email", "Phone", "Subject", "Qualification", "Salary", ""].map((h) => (
                <th key={h} className="text-left text-xs text-slate-400 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center text-slate-500 py-12">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12"><Users size={32} className="mx-auto text-slate-600 mb-2" /><p className="text-slate-500 text-sm">No teachers yet</p></td></tr>
              : filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-white text-sm font-medium">{t.full_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{t.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{t.phone || "—"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs">{t.subject || "—"}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{t.qualification || "—"}</td>
                  <td className="px-4 py-3 text-green-400 text-sm font-medium">{t.salary ? "PKR " + parseInt(t.salary).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(t.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={15} /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
