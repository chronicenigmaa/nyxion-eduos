"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2, CheckCircle, Search } from "lucide-react";

interface Fee { id: string; student_name: string; roll_number: string; amount: number; paid_amount: number; month: string; year: string; status: string; remarks: string; }

export default function FinancePage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0, total_amount: 0, collected: 0 });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ student_id: "", amount: "", month: new Date().toLocaleString("default", { month: "long" }), year: new Date().getFullYear().toString() });

  const load = async () => {
    try {
      const [feesRes, summaryRes, studentsRes] = await Promise.all([
        api.get("/api/v1/fees/" + (filter ? "?status=" + filter : "")),
        api.get("/api/v1/fees/summary"),
        api.get("/api/v1/students/")
      ]);
      setFees(feesRes.data);
      setSummary(summaryRes.data);
      setStudents(studentsRes.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/fees/", { ...form, amount: parseFloat(form.amount) });
      toast.success("Fee record created!");
      setShowForm(false);
      load();
    } catch { toast.error("Failed"); }
  };

  const markPaid = async (id: string, amount: number) => {
    try {
      await api.patch("/api/v1/fees/" + id, { paid_amount: amount, status: "paid" });
      toast.success("Marked as paid!");
      load();
    } catch { toast.error("Failed"); }
  };

  const getAIInsight = async () => {
    setAiLoading(true);
    try {
      const rate = summary.total_amount > 0 ? Math.round((summary.collected / summary.total_amount) * 100) : 0;
      const { data } = await api.post("/api/v1/ai/analyze", {
        prompt: "Fee collection: Total fees: " + summary.total + ", Paid: " + summary.paid + ", Pending: " + summary.pending + ", Overdue: " + summary.overdue + ". Total: PKR " + summary.total_amount + ", Collected: PKR " + summary.collected + ", Rate: " + rate + "%. Provide financial analysis and recommendations.",
        type: "finance"
      });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  const statusColor = (s: string) => s === "paid" ? "bg-green-500/20 text-green-400" : s === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400";
  const rate = summary.total_amount > 0 ? Math.round((summary.collected / summary.total_amount) * 100) : 0;
  const filtered = fees.filter(f => f.student_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">Finance</h1><p className="text-slate-400">{rate}% collection rate</p></div>
        <div className="flex gap-2">
          <button onClick={getAIInsight} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-blue-300 text-sm border border-blue-500/20">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} AI Analysis
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            <Plus size={16} /> Add Fee
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-blue-400" /><span className="text-blue-400 text-sm font-medium">AI Financial Analysis</span><button onClick={() => setAiInsight("")} className="ml-auto text-slate-500 text-xs">dismiss</button></div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4"><p className="text-slate-400 text-sm">Total Amount</p><p className="text-2xl font-bold text-white">PKR {summary.total_amount.toLocaleString()}</p></div>
        <div className="bg-slate-800/50 rounded-2xl border border-green-500/20 p-4"><p className="text-slate-400 text-sm">Collected</p><p className="text-2xl font-bold text-green-400">PKR {summary.collected.toLocaleString()}</p></div>
        <div className="bg-slate-800/50 rounded-2xl border border-amber-500/20 p-4"><p className="text-slate-400 text-sm">Pending</p><p className="text-2xl font-bold text-amber-400">{summary.pending} students</p></div>
        <div className="bg-slate-800/50 rounded-2xl border border-red-500/20 p-4"><p className="text-slate-400 text-sm">Overdue</p><p className="text-2xl font-bold text-red-400">{summary.overdue} students</p></div>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Create Fee Record</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Student</label>
              <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
              </select>
            </div>
            {["amount", "month", "year"].map(key => (
              <div key={key}><label className="block text-xs text-slate-400 mb-1 capitalize">{key}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        {["", "pending", "paid", "overdue"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={"px-3 py-2 rounded-xl text-sm capitalize transition-all " + (filter === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700")}>{s || "All"}</button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-700">{["Student", "Month/Year", "Amount", "Paid", "Status", "Action"].map(h => <th key={h} className="text-left text-xs text-slate-400 font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center text-slate-500 py-12">Loading...</td></tr>
              : filtered.map((f) => (
                <tr key={f.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-white text-sm font-medium">{f.student_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{f.month} {f.year}</td>
                  <td className="px-4 py-3 text-white text-sm">PKR {f.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400 text-sm">PKR {f.paid_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={"px-2 py-1 rounded-lg text-xs font-medium capitalize " + statusColor(f.status)}>{f.status}</span></td>
                  <td className="px-4 py-3">{f.status !== "paid" && <button onClick={() => markPaid(f.id, f.amount)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30"><CheckCircle size={12} /> Mark Paid</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
