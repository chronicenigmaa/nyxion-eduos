"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, TrendingUp, AlertCircle, Lightbulb, BarChart2 } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";

export default function AcademicsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name:"", class_name:"", teacher_id:"", description:"" });

  const load = async () => {
    try {
      const [s,cl,t,st] = await Promise.all([api.get("/api/v1/academics/subjects"),api.get("/api/v1/academics/classes"),api.get("/api/v1/teachers/"),api.get("/api/v1/students/")]);
      setSubjects(s.data); setClasses(cl.data); setTeachers(t.data); setStudents(st.data);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/academics/subjects", form); toast.success("Added!"); setShowForm(false); setForm({name:"",class_name:"",teacher_id:"",description:""}); load(); }
    catch { toast.error("Failed"); }
  };

  const acSummary = "Students: "+students.length+", Classes: "+classes.map((c:any)=>"Class "+c.class_name).join(", ")+", Subjects: "+subjects.map((s:any)=>s.name).join(", ")+", Teachers: "+teachers.length;
  const aiOptions = [
    { label: "Academic Overview", icon: BarChart2, type: "academic", prompt: "Analyze academic structure: "+acSummary+". Provide an overview for school management." },
    { label: "Curriculum Gaps", icon: AlertCircle, type: "academic", prompt: "Identify curriculum gaps for a Pakistani school: "+acSummary+". What subjects are missing?" },
    { label: "Class Analysis", icon: TrendingUp, type: "academic", prompt: "Analyze class structure: "+acSummary+". Are class sizes optimal? Recommendations?" },
    { label: "Improvement Plan", icon: Lightbulb, type: "academic", prompt: "Create a 5-point academic improvement plan for a Pakistani school: "+acSummary },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Academics</h1><p className="text-slate-500">{classes.length} classes · {subjects.length} subjects</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16}/> Add Subject
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Students</p><p className="text-3xl font-bold text-slate-900 mt-1">{students.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Classes</p><p className="text-3xl font-bold text-blue-600 mt-1">{classes.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Subjects</p><p className="text-3xl font-bold text-green-600 mt-1">{subjects.length}</p></div>
      </div>

      <AIInsightsPanel options={aiOptions} title="Academic AI Analysis" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Add Subject</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-xs text-slate-500 mb-1">Subject Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-xs text-slate-500 mb-1">Class</label><input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-xs text-slate-500 mb-1">Teacher</label>
              <select value={form.teacher_id} onChange={e=>setForm({...form,teacher_id:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                <option value="">Select teacher</option>
                {teachers.map((t:any)=><option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-slate-500 mb-1">Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-4">Classes</h2>
          {loading?<p className="text-slate-400 text-sm">Loading...</p>
            :classes.length===0?<p className="text-slate-400 text-sm">No classes yet</p>
            :classes.map((cl:any)=>(
              <div key={cl.class_name} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div><p className="text-slate-900 text-sm font-medium">Class {cl.class_name}</p><p className="text-slate-400 text-xs">Sections: {cl.sections?.join(", ")||"-"}</p></div>
                <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">{students.filter((s:any)=>s.class_name===cl.class_name).length} students</span>
              </div>
            ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-4">Subjects</h2>
          {loading?<p className="text-slate-400 text-sm">Loading...</p>
            :subjects.length===0?<p className="text-slate-400 text-sm">No subjects yet</p>
            :subjects.map((s:any)=>(
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div><p className="text-slate-900 text-sm font-medium">{s.name}</p><p className="text-slate-400 text-xs">{s.description||"No description"}</p></div>
                <span className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium">Class {s.class_name||"All"}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}