"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SchoolsPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", email: "" });

  const load = async () => {
    try { const { data } = await api.get("/api/v1/schools/"); setSchools(data); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/schools/", form); toast.success("School added!"); setShowForm(false); setForm({ name: "", code: "", address: "", phone: "", email: "" }); load(); }
    catch { toast.error("Failed — only super admins can add schools"); }
  };

  const getAIInsight = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("/api/v1/ai/analyze", {
        prompt: "School network: " + schools.length + " schools: " + schools.map((s: any) => s.name).join(", ") + ". Provide growth insights and expansion recommendations.",
        type: "academic"
      });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  if (user?.role !== "super_admin") return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><Building2 size={48} className="mx-auto text-slate-600 mb-4" /><h1 className="text-xl font-bold text-white mb-2">Access Restricted</h1><p className="text-slate-400">Only super admins can manage schools.</p></div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Schools</h1><p className="text-slate-400">{schools.length} in network</p></div>
        <div className="flex gap-2">
          <button onClick={getAIInsight} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-300 text-sm border border-blue-500/20">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI Insights
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"><Plus size={16} /> Add School</button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-blue-400" /><span className="text-blue-400 text-sm font-medium">AI Network Analysis</span><button onClick={() => setAiInsight("")} className="ml-auto text-slate-500 text-xs">dismiss</button></div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Add School</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(form).map(key => (
              <div key={key}><label className="block text-xs text-slate-400 mb-1 capitalize">{key}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={["name","code"].includes(key)} className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-slate-500">Loading...</p>
          : schools.map((s: any) => (
            <div key={s.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"><Building2 size={20} className="text-blue-400" /></div>
                <span className="px-2 py-1 rounded-lg bg-slate-700 text-slate-400 text-xs font-mono">{s.code}</span>
              </div>
              <h3 className="text-white font-semibold mb-1">{s.name}</h3>
              <p className="text-slate-400 text-sm">{s.email || "—"}</p>
              <p className="text-slate-400 text-sm">{s.phone || "—"}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
