"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Lightbulb, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<Record<string,any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [form, setForm] = useState({ class_name:"", section:"", day:"Monday", period:"1", start_time:"08:00", end_time:"08:45", subject_name:"", teacher_name:"", room:"" });

  const load = async (cls="") => {
    setLoading(true);
    try { const { data } = await api.get("/api/v1/timetable/"+(cls?"?class_name="+cls:"")); setTimetable(data); }
    catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(classFilter); }, [classFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/timetable/", {...form,period:parseInt(form.period)}); toast.success("Added!"); setShowForm(false); load(classFilter); }
    catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete("/api/v1/timetable/"+id); toast.success("Removed"); load(classFilter); }
    catch { toast.error("Failed"); }
  };

  const total = Object.values(timetable).flat().length;
  const aiOptions = [
    { label: "Generate Timetable", icon: Calendar, type: "general", prompt: "Generate a complete weekly timetable for Class "+(classFilter||"8")+" for a Pakistani school. 7 periods/day 45 mins each 8am-2pm. Subjects: Maths, English, Science, Urdu, Islamiat, Social Studies, Computer. Format as a clear day-by-day table." },
    { label: "Balance Check", icon: TrendingUp, type: "academic", prompt: "Is this timetable balanced for Class "+classFilter+"? Total periods: "+total+". Days: "+DAYS.map(d=>(timetable[d]||[]).length+" on "+d).join(", ")+". Provide recommendations." },
    { label: "Optimization", icon: Lightbulb, type: "academic", prompt: "How to optimize a Pakistani school timetable? Best practices for scheduling and student productivity." },
    { label: "Conflict Check", icon: AlertCircle, type: "academic", prompt: "What common scheduling conflicts should Pakistani schools avoid? Provide a checklist." },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Timetable</h1><p className="text-slate-500">{total} periods scheduled</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16}/> Add Period
        </button>
      </div>

      <AIInsightsPanel options={aiOptions} title="Timetable AI Analysis" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Add Timetable Entry</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{key:"class_name",label:"Class"},{key:"section",label:"Section"},{key:"subject_name",label:"Subject"},{key:"teacher_name",label:"Teacher"},{key:"room",label:"Room"},{key:"period",label:"Period"},{key:"start_time",label:"Start"},{key:"end_time",label:"End"}].map(({key,label})=>(
              <div key={key}><label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e=>setForm({...form,[key]:e.target.value})} required={["class_name","subject_name"].includes(key)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div><label className="block text-xs text-slate-500 mb-1">Day</label>
              <select value={form.day} onChange={e=>setForm({...form,day:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Add</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <input value={classFilter} onChange={e=>setClassFilter(e.target.value)} placeholder="Filter by class (e.g. 8)"
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"/>
        {classFilter && <button onClick={()=>setClassFilter("")} className="text-slate-400 text-sm hover:text-slate-600">Clear</button>}
      </div>

      <div className="space-y-4">
        {DAYS.map(day=>{
          const entries = (timetable[day]||[]).sort((a,b)=>a.period-b.period);
          return (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-slate-700 font-semibold text-sm">{day}</h3>
                <span className="text-slate-400 text-xs">{entries.length} periods</span>
              </div>
              {loading?<p className="text-slate-400 text-sm text-center py-4">Loading...</p>
                :entries.length===0?<p className="text-slate-300 text-sm text-center py-4">No periods scheduled</p>
                :<div className="divide-y divide-slate-50">
                  {entries.map(entry=>(
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">P{entry.period}</span>
                        <div><p className="text-slate-900 text-sm font-medium">{entry.subject_name}</p><p className="text-slate-400 text-xs">{entry.teacher_name||"-"}{entry.room?" · Room "+entry.room:""}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">{entry.start_time} - {entry.end_time}</span>
                        <button onClick={()=>handleDelete(entry.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>}
            </div>
          );
        })}
        {!loading && total===0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-400">No entries yet. Use AI Generate above to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}