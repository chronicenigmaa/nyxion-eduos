"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Search, Users, TrendingUp, AlertCircle, Lightbulb, BarChart2 } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";

interface Teacher { id: string; full_name: string; email: string; phone: string; subject: string; qualification: string; salary: string; }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name:"", email:"", phone:"", subject:"", qualification:"", salary:"" });

  const load = async () => {
    try { const { data } = await api.get("/api/v1/teachers/"); setTeachers(data); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/teachers/", form); toast.success("Added!"); setShowForm(false); setForm({ full_name:"",email:"",phone:"",subject:"",qualification:"",salary:"" }); load(); }
    catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove?")) return;
    try { await api.delete("/api/v1/teachers/"+id); toast.success("Removed"); load(); }
    catch { toast.error("Failed"); }
  };

  const subjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))];
  const summary = "Total: "+teachers.length+" teachers. Subjects: "+subjects.join(", ")+". Staff: "+teachers.map(t=>t.full_name+" ("+t.subject+")").join(", ");

  const aiOptions = [
    { label: "Staff Coverage", icon: BarChart2, type: "academic", prompt: "Analyze teacher coverage for a Pakistani school. "+summary+". Identify subject gaps." },
    { label: "Hiring Needs", icon: Lightbulb, type: "academic", prompt: "Based on: "+summary+". What subjects or roles should this school hire for next?" },
    { label: "Workload Analysis", icon: TrendingUp, type: "academic", prompt: "Analyze teacher workload: "+summary+". Are teachers overloaded? Recommendations?" },
    { label: "Performance Tips", icon: AlertCircle, type: "academic", prompt: "Provide professional development recommendations for: "+summary },
  ];

  const filtered = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Teachers</h1><p className="text-slate-500">{teachers.length} staff members</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Staff</p><p className="text-3xl font-bold text-slate-900 mt-1">{teachers.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Subjects Covered</p><p className="text-3xl font-bold text-blue-600 mt-1">{subjects.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Avg Salary (PKR)</p><p className="text-3xl font-bold text-green-600 mt-1">{teachers.filter(t=>t.salary).length>0?Math.round(teachers.filter(t=>t.salary).reduce((a,t)=>a+parseInt(t.salary||"0"),0)/teachers.filter(t=>t.salary).length).toLocaleString():"-"}</p></div>
      </div>

      <AIInsightsPanel options={aiOptions} title="Teacher AI Analysis" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">New Teacher</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(form).map(key => (
              <div key={key}><label className="block text-xs text-slate-500 mb-1 capitalize">{key.replace("_"," ")}</label>
                <input value={form[key as keyof typeof form]} onChange={e=>setForm({...form,[key]:e.target.value})} required={key==="full_name"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or subject..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50">{["Name","Email","Phone","Subject","Qualification","Salary",""].map(h=><th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center text-slate-400 py-12">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12"><Users size={32} className="mx-auto text-slate-300 mb-2"/><p className="text-slate-400 text-sm">No teachers yet</p></td></tr>
              : filtered.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{t.full_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{t.email||"-"}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{t.phone||"-"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">{t.subject||"-"}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{t.qualification||"-"}</td>
                  <td className="px-4 py-3 text-green-600 text-sm font-medium">{t.salary?"PKR "+parseInt(t.salary).toLocaleString():"-"}</td>
                  <td className="px-4 py-3"><button onClick={()=>handleDelete(t.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={15}/></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}