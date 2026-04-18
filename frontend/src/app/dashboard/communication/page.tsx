"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2, MessageSquare, Send, TrendingUp, AlertCircle, Lightbulb, Users } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";

interface Notice { id: string; title: string; message: string; type: string; sent_via_whatsapp: boolean; created_at: string; }

export default function CommunicationPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ title:"", message:"", type:"general" });
  const [aiPrompt, setAiPrompt] = useState("");

  const load = async () => {
    try { const { data } = await api.get("/api/v1/communication/notices"); setNotices(data); }
    catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/communication/notices", form); toast.success("Posted!"); setShowForm(false); setForm({title:"",message:"",type:"general"}); load(); }
    catch { toast.error("Failed"); }
  };

  const sendWA = async (id: string) => {
    try { await api.post("/api/v1/communication/notices/"+id+"/send-whatsapp"); toast.success("Sent!"); load(); }
    catch { toast.error("Failed"); }
  };

  const generateAI = async () => {
    if (!aiPrompt) return toast.error("Enter what the notice is about");
    setGenerating(true);
    try {
      const { data } = await api.post("/api/v1/ai/generate", { prompt: "Write a professional school notice in English and Urdu about: "+aiPrompt+". Keep it concise and formal.", type: "announcement" });
      const lines = data.response.split("\n");
      setForm({ ...form, title: lines[0].replace(/^[#*]+\s*/,"").trim()||aiPrompt, message: data.response });
      setShowForm(true); toast.success("Generated!");
    } catch { toast.error("AI unavailable"); }
    finally { setGenerating(false); }
  };

  const aiOptions = [
    { label: "Fee Reminder", icon: AlertCircle, type: "announcement", prompt: "Write a professional fee payment reminder in English and Urdu for parents of a Pakistani school. Polite but firm." },
    { label: "Exam Notice", icon: TrendingUp, type: "announcement", prompt: "Write an exam schedule announcement for parents and students of a Pakistani school. Include preparation tips." },
    { label: "Parent Meeting", icon: Users, type: "announcement", prompt: "Write a parent-teacher meeting invitation in English and Urdu. Saturday 10am. Mention importance of attendance." },
    { label: "Holiday Notice", icon: Lightbulb, type: "announcement", prompt: "Write a school holiday announcement in English and Urdu for Pakistani school. Warm and festive tone." },
  ];

  const typeColor = (t: string) => ({urgent:"bg-red-100 text-red-700",fee:"bg-amber-100 text-amber-700",exam:"bg-blue-100 text-blue-700",holiday:"bg-green-100 text-green-700"}[t]||"bg-slate-100 text-slate-600");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Communication</h1><p className="text-slate-500">{notices.length} notices</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16}/> New Notice
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-blue-600"/><span className="text-slate-900 font-semibold text-sm">AI Notice Generator</span></div>
        <div className="flex gap-3">
          <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="e.g. Parent-teacher meeting this Saturday at 10am..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <button onClick={generateAI} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-all">
            {generating?<Loader2 size={16} className="animate-spin"/>:<Brain size={16}/>} Generate
          </button>
        </div>
      </div>

      <AIInsightsPanel options={aiOptions} title="Quick Notice Templates" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Post Notice</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-slate-500 mb-1">Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
              <div><label className="block text-xs text-slate-500 mb-1">Type</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                  {["general","fee","exam","holiday","urgent"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div><label className="block text-xs text-slate-500 mb-1">Message</label>
              <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} required rows={5} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/></div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Post</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading?<p className="text-slate-400 text-center py-8">Loading...</p>
          :notices.length===0?<div className="text-center py-12 bg-white rounded-2xl border border-slate-200"><MessageSquare size={32} className="mx-auto text-slate-300 mb-2"/><p className="text-slate-400 text-sm">No notices yet</p></div>
          :notices.map(n=>(
            <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={"px-2 py-1 rounded-lg text-xs font-medium capitalize "+typeColor(n.type)}>{n.type}</span>
                  <h3 className="text-slate-900 font-semibold text-sm">{n.title}</h3>
                </div>
                {n.sent_via_whatsapp?<span className="text-xs text-green-600 flex items-center gap-1 font-medium"><Send size={12}/> Sent</span>
                  :<button onClick={()=>sendWA(n.id)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs hover:bg-green-100 border border-green-200"><Send size={12}/> WhatsApp</button>}
              </div>
              <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{n.message}</p>
              <p className="text-slate-300 text-xs mt-3">{new Date(n.created_at).toLocaleDateString()}</p>
            </div>
          ))}
      </div>
    </div>
  );
}