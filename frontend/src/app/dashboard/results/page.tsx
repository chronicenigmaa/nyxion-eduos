"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Search, TrendingUp, AlertCircle, Lightbulb, BarChart2 } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";

export default function ResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [form, setForm] = useState({ student_id:"", subject_name:"", exam_type:"midterm", term:"Term 1", class_name:"", total_marks:"100", marks_obtained:"" });

  const load = async () => {
    try {
      const [r,s] = await Promise.all([api.get("/api/v1/results/"), api.get("/api/v1/students/")]);
      setResults(r.data); setStudents(s.data);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/results/", {...form,total_marks:parseFloat(form.total_marks),marks_obtained:parseFloat(form.marks_obtained)}); toast.success("Added!"); setShowForm(false); load(); }
    catch { toast.error("Failed"); }
  };

  const gradeColor = (g: string) => ({"A+":"bg-green-100 text-green-700","A":"bg-green-100 text-green-700","B":"bg-blue-100 text-blue-700","C":"bg-amber-100 text-amber-700","D":"bg-orange-100 text-orange-700","F":"bg-red-100 text-red-700"}[g]||"bg-slate-100 text-slate-600");
  const classes = [...new Set(results.map(r=>r.class_name).filter(Boolean))];
  const filtered = results.filter(r=>r.student_name?.toLowerCase().includes(search.toLowerCase())&&(!filterClass||r.class_name===filterClass)&&(!filterExam||r.exam_type===filterExam));
  const avg = results.length>0?Math.round(results.reduce((a,r)=>a+(r.marks_obtained/r.total_marks)*100,0)/results.length):0;
  const pass = results.filter(r=>(r.marks_obtained/r.total_marks)>=0.5).length;
  const resSummary = "Total: "+results.length+", Average: "+avg+"%, Pass rate: "+Math.round((pass/Math.max(results.length,1))*100)+"%. Grades: A+:"+results.filter(r=>r.grade==="A+").length+", A:"+results.filter(r=>r.grade==="A").length+", B:"+results.filter(r=>r.grade==="B").length+", C:"+results.filter(r=>r.grade==="C").length+", F:"+results.filter(r=>r.grade==="F").length;

  const aiOptions = [
    { label: "Performance Report", icon: BarChart2, type: "academic", prompt: "Write a clear academic performance report for school management. "+resSummary },
    { label: "Weak Areas", icon: AlertCircle, type: "academic", prompt: "Identify weak subjects and struggling students. "+resSummary+". What interventions are needed?" },
    { label: "Grade Analysis", icon: TrendingUp, type: "academic", prompt: "Analyze grade distribution: "+resSummary+". What does this tell us about teaching effectiveness?" },
    { label: "Improvement Plan", icon: Lightbulb, type: "academic", prompt: "Create a 5-step academic improvement plan for a Pakistani school based on: "+resSummary },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Results</h1><p className="text-slate-500">{results.length} records</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16}/> Add Result
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Records</p><p className="text-3xl font-bold text-slate-900 mt-1">{results.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Average Score</p><p className="text-3xl font-bold text-blue-600 mt-1">{avg}%</p></div>
        <div className="bg-white rounded-2xl border border-green-200 p-5"><p className="text-slate-500 text-sm">Pass Rate</p><p className="text-3xl font-bold text-green-600 mt-1">{Math.round((pass/Math.max(results.length,1))*100)}%</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">A+ Grades</p><p className="text-3xl font-bold text-amber-600 mt-1">{results.filter(r=>r.grade==="A+").length}</p></div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-slate-700 font-semibold text-sm mb-4">Grade Distribution</h3>
          <div className="flex items-end gap-4 h-28">
            {["A+","A","B","C","D","F"].map(g=>{
              const count = results.filter(r=>r.grade===g).length;
              const pct = results.length>0?(count/results.length)*100:0;
              const colors:any = {"A+":"bg-green-500","A":"bg-green-400","B":"bg-blue-400","C":"bg-amber-400","D":"bg-orange-400","F":"bg-red-400"};
              return (
                <div key={g} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-slate-500 text-xs font-medium">{count}</span>
                  <div className={"rounded-t-lg w-full transition-all "+(colors[g]||"bg-slate-300")} style={{height:Math.max(pct*0.9,4)+"px"}}/>
                  <span className="text-slate-600 text-xs font-bold">{g}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-4 text-xs text-slate-400">
            <span>Total: {results.length}</span>
            <span>Avg: {avg}%</span>
            <span>Pass: {Math.round((pass/Math.max(results.length,1))*100)}%</span>
          </div>
        </div>
      )}

      <AIInsightsPanel options={aiOptions} title="Results AI Analysis" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Add Result</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1">Student</label>
              <select value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select student</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
              </select>
            </div>
            {[{key:"subject_name",label:"Subject"},{key:"class_name",label:"Class"},{key:"total_marks",label:"Total Marks"},{key:"marks_obtained",label:"Marks Obtained"}].map(({key,label})=>(
              <div key={key}><label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            ))}
            <div><label className="block text-xs text-slate-500 mb-1">Exam Type</label>
              <select value={form.exam_type} onChange={e=>setForm({...form,exam_type:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                {["midterm","final","quiz","test","assignment"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-slate-500 mb-1">Term</label>
              <select value={form.term} onChange={e=>setForm({...form,term:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                {["Term 1","Term 2","Term 3","Annual"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
        <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
          <option value="">All Classes</option>{classes.map(c=><option key={c} value={c}>Class {c}</option>)}
        </select>
        <select value={filterExam} onChange={e=>setFilterExam(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
          <option value="">All Exams</option>{["midterm","final","quiz","test","assignment"].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50">{["Student","Subject","Exam","Class","Marks","Grade","Term"].map(h=><th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} className="text-center text-slate-400 py-12">Loading...</td></tr>
              :filtered.map(r=>(
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{r.student_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{r.subject_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm capitalize">{r.exam_type}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{r.class_name}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm">{r.marks_obtained}/{r.total_marks} <span className="text-slate-400">({r.percentage}%)</span></td>
                  <td className="px-4 py-3"><span className={"px-2 py-1 rounded-lg text-xs font-bold "+gradeColor(r.grade)}>{r.grade}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.term}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}