"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Building2, Settings, Package, ToggleLeft, ToggleRight, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  { key: "exam_generator",           label: "Exam Generator",           tier: "base" },
  { key: "lesson_planner",           label: "Lesson Planner",           tier: "base" },
  { key: "notice_writer",            label: "Bilingual Notice Writer",  tier: "base" },
  { key: "attendance_analysis",      label: "Attendance Analysis",      tier: "base" },
  { key: "export_pdf",               label: "Export to PDF/Word",       tier: "base" },
  { key: "student_portal",           label: "Student Portal",           tier: "base" },
  { key: "fee_defaulter_prediction", label: "Fee Defaulter Prediction", tier: "pro" },
  { key: "report_card_generator",    label: "Report Card Generator",    tier: "pro" },
  { key: "homework_generator",       label: "Homework Generator",       tier: "pro" },
  { key: "exam_analyser",            label: "Exam Performance Analyser",tier: "pro" },
  { key: "parent_messages",          label: "Personalised Parent Msgs", tier: "pro" },
  { key: "ai_chatbot",               label: "AI Academic Chatbot",      tier: "elite" },
  { key: "timetable_generator",      label: "Timetable Generator",      tier: "elite" },
  { key: "risk_scoring",             label: "Student Risk Scoring",     tier: "elite" },
  { key: "behaviour_tracker",        label: "Behaviour Tracker",        tier: "elite" },
  { key: "plagiarism_detector",      label: "Plagiarism Detector",      tier: "elite" },
];

const TIER_COLORS: any = {
  base:  "bg-green-50 text-green-700 border-green-200",
  pro:   "bg-blue-50 text-blue-700 border-blue-200",
  elite: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function SchoolsPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", code:"", address:"", phone:"", email:"", package:"starter" });

  const load = async () => {
    try { const { data } = await api.get("/api/v1/schools/"); setSchools(data); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/schools/", form); toast.success("School added!"); setShowForm(false); load(); }
    catch { toast.error("Failed"); }
  };

  const updatePackage = async (schoolId: string, pkg: string) => {
    try {
      await api.patch("/api/v1/schools/"+schoolId+"/package", { package: pkg });
      toast.success("Package updated!");
      load();
      if (selected?.id === schoolId) setSelected({...selected, package: pkg});
    } catch { toast.error("Failed"); }
  };

  const toggleFeature = async (schoolId: string, feature: string, current: boolean) => {
    setSaving(true);
    try {
      await api.patch("/api/v1/schools/"+schoolId+"/features", { features: { [feature]: !current } });
      toast.success("Feature " + (!current ? "enabled" : "disabled"));
      load();
      if (selected?.id === schoolId) {
        setSelected({...selected, features: {...selected.features, [feature]: !current}});
      }
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  if (user?.role !== "super_admin") return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><Building2 size={48} className="mx-auto text-slate-300 mb-4"/>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h1>
        <p className="text-slate-400">Only super admins can manage schools.</p></div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Schools</h1><p className="text-slate-500">{schools.length} in network</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16}/> Add School
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Add School</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(form).filter(k => k !== "package").map(key => (
              <div key={key}><label className="block text-xs text-slate-500 mb-1 capitalize">{key}</label>
                <input value={form[key as keyof typeof form]} onChange={e=>setForm({...form,[key]:e.target.value})} required={["name","code"].includes(key)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div><label className="block text-xs text-slate-500 mb-1">Package</label>
              <select value={form.package} onChange={e=>setForm({...form,package:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                {["starter","growth","elite"].map(p=><option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Add</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {loading ? <p className="text-slate-400 text-center py-8">Loading...</p>
            : schools.map(s => (
              <div key={s.id} onClick={()=>setSelected(s)}
                className={"bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-sm "+(selected?.id===s.id?"border-blue-400":"border-slate-200 hover:border-slate-300")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Building2 size={18} className="text-blue-600"/></div>
                  <span className={"px-2 py-1 rounded-full text-xs font-medium capitalize border " + (s.package==="elite"?"bg-purple-50 text-purple-700 border-purple-200":s.package==="growth"?"bg-blue-50 text-blue-700 border-blue-200":"bg-green-50 text-green-700 border-green-200")}>{s.package}</span>
                </div>
                <h3 className="text-slate-900 font-semibold text-sm mt-2">{s.name}</h3>
                <p className="text-slate-400 text-xs">{s.code}</p>
              </div>
            ))}
        </div>

        {selected && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-slate-900 font-semibold">{selected.name}</h3>
                <p className="text-slate-400 text-xs">{selected.code} · {selected.email}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xs">close</button>
            </div>

            <div className="p-6 border-b border-slate-100">
              <p className="text-slate-600 text-sm font-medium mb-3 flex items-center gap-2"><Package size={14}/> Package</p>
              <div className="flex gap-2">
                {["starter","growth","elite"].map(pkg => (
                  <button key={pkg} onClick={()=>updatePackage(selected.id, pkg)}
                    className={"px-4 py-2 rounded-xl text-sm font-medium capitalize border transition-all "+(selected.package===pkg?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600")}>
                    {selected.package===pkg && <Check size={12} className="inline mr-1"/>}{pkg}
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-xs mt-2">Starter: Base AI · Growth: Pro AI · Elite: All features</p>
            </div>

            <div className="p-6">
              <p className="text-slate-600 text-sm font-medium mb-4 flex items-center gap-2"><Settings size={14}/> Feature Toggles</p>
              <div className="space-y-2">
                {["base","pro","elite"].map(tier => (
                  <div key={tier}>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 mt-3 first:mt-0">{tier} features</p>
                    {FEATURES.filter(f=>f.tier===tier).map(feat => {
                      const enabled = selected.features?.[feat.key] ?? false;
                      return (
                        <div key={feat.key} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className={"px-1.5 py-0.5 rounded text-xs border "+TIER_COLORS[feat.tier]}>{feat.tier}</span>
                            <span className="text-slate-700 text-sm">{feat.label}</span>
                          </div>
                          <button onClick={()=>toggleFeature(selected.id, feat.key, enabled)} disabled={saving}
                            className={"transition-colors "+(enabled?"text-blue-600":"text-slate-300")}>
                            {enabled ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}