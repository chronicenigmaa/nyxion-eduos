"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2, ClipboardList, CheckCircle, Clock, X } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  class_name: string;
  section: string;
  total_marks: number;
  due_date: string;
  status: string;
}

interface Submission {
  id: string;
  student_name: string;
  roll_number: string;
  content: string;
  marks_obtained: number;
  feedback: string;
  status: string;
  submitted_at: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDesc, setAiDesc] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", class_name: "",
    section: "", total_marks: "100", due_date: "", allow_late: false
  });

  const load = async () => {
    try {
      const { data } = await api.get("/api/v1/assignments/");
      setAssignments(data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadSubmissions = async (id: string) => {
    try {
      const { data } = await api.get(`/api/v1/assignments/${id}/submissions`);
      setSelected(data);
    } catch { toast.error("Failed to load submissions"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/assignments/", {
        ...form, total_marks: parseFloat(form.total_marks),
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null
      });
      toast.success("Assignment created!");
      setShowForm(false);
      load();
    } catch { toast.error("Failed"); }
  };

  const grade = async (subId: string, marks: number, feedback: string) => {
    try {
      await api.patch(`/api/v1/assignments/submissions/${subId}/grade`, { marks_obtained: marks, feedback });
      toast.success("Graded!");
      if (selected) loadSubmissions(selected.assignment.id);
    } catch { toast.error("Failed to grade"); }
  };

  const generateWithAI = async () => {
    if (!aiDesc) return;
    setAiLoading(true);
    try {
      const { data } = await api.post("/api/v1/ai/generate", {
        prompt: aiDesc, type: "exam"
      });
      setForm({ ...form, description: data.response });
      toast.success("AI generated — review and post!");
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      await api.delete(`/api/v1/assignments/${id}`);
      toast.success("Deleted");
      load();
      if (selected?.assignment?.id === id) setSelected(null);
    } catch { toast.error("Failed"); }
  };

  const statusColor = (s: string) => ({
    submitted: "bg-blue-100 text-blue-700",
    graded:    "bg-green-100 text-green-700",
    late:      "bg-amber-100 text-amber-700",
    missing:   "bg-red-100 text-red-700",
  }[s] || "bg-slate-100 text-slate-600");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Assignments</h1>
          <p className="text-slate-400">{assignments.length} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          <Plus size={16} /> New Assignment
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Create Assignment</h2>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
            <p className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
              <Brain size={14} /> AI Assignment Generator
            </p>
            <div className="flex gap-2">
              <input value={aiDesc} onChange={e => setAiDesc(e.target.value)}
                placeholder="e.g. 10 questions for Grade 8 Science chapter on atoms..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={generateWithAI} disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />} Generate
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-full">
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-full">
              <label className="block text-xs text-slate-400 mb-1">Description / Questions</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {[
              { key: "class_name", label: "Class" },
              { key: "section",    label: "Section" },
              { key: "total_marks",label: "Total Marks" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input value={form[key as keyof typeof form] as string}
                  onChange={e => setForm({...form, [key]: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <input type="datetime-local" value={form.due_date}
                onChange={e => setForm({...form, due_date: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? <p className="text-slate-500">Loading...</p>
            : assignments.map(a => (
              <div key={a.id}
                onClick={() => loadSubmissions(a.id)}
                className={`bg-slate-800/50 rounded-2xl border p-5 cursor-pointer transition-all ${selected?.assignment?.id === a.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium">{a.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">Class {a.class_name} {a.section} · {a.total_marks} marks</p>
                    {a.due_date && (
                      <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                        <Clock size={11} /> Due {new Date(a.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteAssignment(a.id); }}
                    className="text-slate-600 hover:text-red-400"><X size={15} /></button>
                </div>
              </div>
            ))}
        </div>

        {selected && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{selected.assignment.title}</h3>
              <div className="flex gap-3 text-sm">
                <span className="text-green-400">{selected.submitted} submitted</span>
                <span className="text-red-400">{selected.missing} missing</span>
              </div>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {selected.submissions.map((sub: Submission) => (
                <div key={sub.id} className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-medium">{sub.student_name}</p>
                      <p className="text-slate-400 text-xs">{sub.roll_number}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                  </div>
                  {sub.content && (
                    <p className="text-slate-300 text-xs bg-slate-800 rounded-lg p-2 mb-2 max-h-20 overflow-y-auto">
                      {sub.content}
                    </p>
                  )}
                  {sub.status !== 'graded' ? (
                    <div className="flex gap-2 mt-2">
                      <input type="number"
                        placeholder={`Marks / ${selected.assignment.total_marks}`}
                        id={`marks-${sub.id}`}
                        className="w-32 px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs focus:outline-none" />
                      <input placeholder="Feedback"
                        id={`feedback-${sub.id}`}
                        className="flex-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs focus:outline-none" />
                      <button
                        onClick={() => {
                          const m = (document.getElementById(`marks-${sub.id}`) as HTMLInputElement)?.value;
                          const f = (document.getElementById(`feedback-${sub.id}`) as HTMLInputElement)?.value;
                          if (m) grade(sub.id, parseFloat(m), f);
                        }}
                        className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs hover:bg-green-500">
                        Grade
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-green-400 text-xs">{sub.marks_obtained}/{selected.assignment.total_marks}</span>
                      {sub.feedback && <span className="text-slate-400 text-xs">— {sub.feedback}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}