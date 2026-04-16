"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2, TrendingUp, Search } from "lucide-react";

export default function ResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [form, setForm] = useState({
    student_id: "", subject_name: "", exam_type: "midterm",
    term: "Term 1", class_name: "", total_marks: "100", marks_obtained: ""
  });

  const load = async () => {
    try {
      const [resultsRes, studentsRes] = await Promise.all([
        api.get("/api/v1/results/"),
        api.get("/api/v1/students/")
      ]);
      setResults(resultsRes.data);
      setStudents(studentsRes.data);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/results/", {
        ...form,
        total_marks: parseFloat(form.total_marks),
        marks_obtained: parseFloat(form.marks_obtained)
      });
      toast.success("Result added!");
      setShowForm(false);
      load();
    } catch { toast.error("Failed"); }
  };

  const getAnalysis = async () => {
    if (!filterClass || !filterExam) return toast.error("Select class and exam type first");
    setAiLoading(true);
    try {
      const { data: classData } = await api.get(`/api/v1/results/class-analysis?class_name=${filterClass}&exam_type=${filterExam}`);
      setAnalysis(classData);
      const { data: aiData } = await api.post("/api/v1/ai/analyze", {
        prompt: `Class ${filterClass} ${filterExam} results: Average ${classData.average}%, Highest ${classData.highest}%, Lowest ${classData.lowest}%, Pass rate ${classData.pass_rate}%, Grade distribution: A+:${classData.grade_distribution['A+']}, A:${classData.grade_distribution['A']}, B:${classData.grade_distribution['B']}, C:${classData.grade_distribution['C']}, D:${classData.grade_distribution['D']}, F:${classData.grade_distribution['F']}. Provide detailed analysis and teaching recommendations.`,
        type: "academic"
      });
      setAnalysis({ ...classData, ai_insight: aiData.response });
    } catch { toast.error("Failed"); }
    finally { setAiLoading(false); }
  };

  const gradeColor = (g: string) => ({
    'A+': 'bg-green-500/20 text-green-400',
    'A':  'bg-green-500/20 text-green-400',
    'B':  'bg-blue-500/20 text-blue-400',
    'C':  'bg-amber-500/20 text-amber-400',
    'D':  'bg-orange-500/20 text-orange-400',
    'F':  'bg-red-500/20 text-red-400',
  }[g] || 'bg-slate-700 text-slate-400');

  const filtered = results.filter(r =>
    r.student_name?.toLowerCase().includes(search.toLowerCase()) &&
    (!filterClass || r.class_name === filterClass) &&
    (!filterExam || r.exam_type === filterExam)
  );

  const classes = [...new Set(results.map(r => r.class_name).filter(Boolean))];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Results</h1>
          <p className="text-slate-400">{results.length} records</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          <Plus size={16} /> Add Result
        </button>
      </div>

      {analysis && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Class Analysis — Class {analysis.class} {analysis.exam_type}</span>
            <button onClick={() => setAnalysis(null)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">dismiss</button>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Average', value: `${analysis.average}%` },
              { label: 'Highest', value: `${analysis.highest}%` },
              { label: 'Lowest',  value: `${analysis.lowest}%` },
              { label: 'Pass Rate', value: `${analysis.pass_rate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-slate-400 text-xs">{label}</p>
              </div>
            ))}
          </div>
          {analysis.ai_insight && (
            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{analysis.ai_insight}</pre>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Add Result</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Student</label>
              <select value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} required
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
              </select>
            </div>
            {[
              { key: "subject_name", label: "Subject" },
              { key: "class_name",   label: "Class" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input value={form[key as keyof typeof form]}
                  onChange={e => setForm({...form, [key]: e.target.value})} required
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Exam Type</label>
              <select value={form.exam_type} onChange={e => setForm({...form, exam_type: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                {['midterm','final','quiz','test','assignment'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Term</label>
              <select value={form.term} onChange={e => setForm({...form, term: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                {['Term 1','Term 2','Term 3','Annual'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total Marks</label>
              <input value={form.total_marks} onChange={e => setForm({...form, total_marks: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Marks Obtained</label>
              <input value={form.marks_obtained} onChange={e => setForm({...form, marks_obtained: e.target.value})} required
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Classes</option>
          {classes.map(cl => <option key={cl} value={cl}>Class {cl}</option>)}
        </select>
        <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none">
          <option value="">All Exams</option>
          {['midterm','final','quiz','test','assignment'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={getAnalysis} disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-400 text-sm border border-blue-500/20">
          {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI Analysis
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {["Student", "Subject", "Exam", "Class", "Marks", "Grade", ""].map(h => (
                <th key={h} className="text-left text-xs text-slate-400 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center text-slate-500 py-12">Loading...</td></tr>
              : filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-white text-sm font-medium">{r.student_name}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{r.subject_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm capitalize">{r.exam_type}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{r.class_name}</td>
                  <td className="px-4 py-3 text-white text-sm">{r.marks_obtained}/{r.total_marks} <span className="text-slate-400">({r.percentage}%)</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.term}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}