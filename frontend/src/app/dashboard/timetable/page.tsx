"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Brain, Loader2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [form, setForm] = useState({
    class_name: "", section: "", day: "Monday",
    period: "1", start_time: "08:00", end_time: "08:45",
    subject_name: "", teacher_name: "", room: ""
  });

  const load = async (cls = "") => {
    setLoading(true);
    try {
      const url = "/api/v1/timetable/" + (cls ? "?class_name=" + cls : "");
      const { data } = await api.get(url);
      setTimetable(data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(classFilter); }, [classFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/timetable/", { ...form, period: parseInt(form.period) });
      toast.success("Entry added!");
      setShowForm(false);
      setForm({ class_name: "", section: "", day: "Monday", period: "1", start_time: "08:00", end_time: "08:45", subject_name: "", teacher_name: "", room: "" });
      load(classFilter);
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete("/api/v1/timetable/" + id);
      toast.success("Removed");
      load(classFilter);
    } catch { toast.error("Failed"); }
  };

  const generateWithAI = async () => {
    if (!classFilter) return toast.error("Select a class first");
    setAiLoading(true);
    try {
      const entries = Object.values(timetable).flat();
      const { data } = await api.post("/api/v1/ai/generate", {
        prompt: "Generate an optimised weekly timetable for Class " + classFilter + " with 7 periods per day Monday to Friday. Subjects: Maths, English, Science, Urdu, Islamiat, Social Studies, Computer. Each period 45 minutes starting 8am. Ensure no teacher has two classes at same time. Format as a clear table.",
        type: "general"
      });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  const totalEntries = Object.values(timetable).flat().length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Timetable</h1>
          <p className="text-slate-400">{totalEntries} periods scheduled</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateWithAI} disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-300 text-sm border border-blue-500/20">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI Generate
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">AI Generated Timetable</span>
            <button onClick={() => setAiInsight("")} className="ml-auto text-slate-500 text-xs">dismiss</button>
          </div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Add Timetable Entry</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "class_name", label: "Class" },
              { key: "section", label: "Section" },
              { key: "subject_name", label: "Subject" },
              { key: "teacher_name", label: "Teacher" },
              { key: "room", label: "Room" },
              { key: "period", label: "Period No." },
              { key: "start_time", label: "Start Time" },
              { key: "end_time", label: "End Time" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={["class_name", "subject_name"].includes(key)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Day</label>
              <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <input value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
          placeholder="Filter by class (e.g. 8)"
          className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
        {classFilter && <button onClick={() => setClassFilter("")} className="text-slate-400 text-sm hover:text-white">Clear</button>}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {DAYS.map(day => {
          const entries = (timetable[day] || []).sort((a, b) => a.period - b.period);
          if (entries.length === 0 && !loading) return null;
          return (
            <div key={day} className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
                <h3 className="text-white font-semibold text-sm">{day}</h3>
              </div>
              <div className="divide-y divide-slate-700/50">
                {loading ? (
                  <p className="text-slate-500 text-sm text-center py-4">Loading...</p>
                ) : entries.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-4">No periods scheduled</p>
                ) : entries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/20">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">P{entry.period}</span>
                      <div>
                        <p className="text-white text-sm font-medium">{entry.subject_name}</p>
                        <p className="text-slate-400 text-xs">{entry.teacher_name || "—"} {entry.room ? "· Room " + entry.room : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs">{entry.start_time} – {entry.end_time}</span>
                      <button onClick={() => handleDelete(entry.id)} className="text-slate-600 hover:text-red-400 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!loading && totalEntries === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">No timetable entries yet. Add entries above or use AI Generate.</p>
          </div>
        )}
      </div>
    </div>
  );
}
