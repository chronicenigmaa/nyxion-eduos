"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Brain, Loader2, CheckCircle, Search } from "lucide-react";

interface Fee { id: string; student_name: string; roll_number: string; amount: number; paid_amount: number; month: string; year: string; status: string; }

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
      const [feesRes, summaryRes, studentsRes] = await Promise.all([api.get("/api/v1/fees/" + (filter ? "?status=" + filter : "")), api.get("/api/v1/fees/summary"), api.get("/api/v1/students/")]);
      setFees(feesRes.data); setSummary(summaryRes.data); setStudents(studentsRes.data);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/fees/", { ...form, amount: parseFloat(form.amount) }); toast.success("Created!"); setShowForm(false); load(); }
    catch { toast.error("Failed"); }
  };

  const markPaid = async (id: string, amount: number) => {
    try { await api.patch("/api/v1/fees/" + id, { paid_amount: amount, status: "paid" }); toast.success("Marked paid!"); load(); }
    catch { toast.error("Failed"); }
  };

  const getAI = async () => {
    setAiLoading(true);
    try {
      const rate = summary.total_amount > 0 ? Math.round((summary.collected / summary.total_amount) * 100) : 0;
      const { data } = await api.post("/api/v1/ai/analyze", { prompt: "Fee collection: Total: " + summary.total + ", Paid: " + summary.paid + ", Pending: " + summary.pending + ", Rate: " + rate + "%. Provide analysis.", type: "finance" });
      setAiInsight(data.response);
    } catch { toast.error("AI unavailable"); }
    finally { setAiLoading(false); }
  };

  const statusColor = (s: string) => ({ paid: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700" }[s] || "bg-slate-100 text-slate-600");
  const rate = summary.total_amount > 0 ? Math.round((summary.collected / summary.total_amount) * 100) : 0;
  const filtered = fees.filter(f => f.student_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Finance</h1><p className="text-slate-500">{rate}% collection rate</p></div>
        <div className="flex gap-2">
          <button onClick={getAI} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm transition-all">
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} className="text-blue-600" />} AI Analysis
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
            <Plus size={16} /> Add Fee
          </button>
        </div>
      </div>

      {aiInsight && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-blue-600" /><span className="text-blue-700 text-sm font-medium">AI Financial Analysis</span><button onClick={() => setAiInsight("")} className="ml-auto text-slate-400 text-xs">dismiss</button></div>
          <pre className="text-slate-700 text-sm whitespace-pre-wrap font-sans leading-relaxed">{aiInsight}</pre>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Amount</p><p className="text-2xl font-bold text-slate-900 mt-1">PKR {summary.total_amount.toLocaleString()}</p></div>
        <div className="bg-white rounded-2xl border border-green-200 p-5"><p className="text-slate-500 text-sm">Collected</p><p className="text-2xl font-bold text-green-600 mt-1">PKR {summary.collected.toLocaleString()}</p><p className="text-xs text-green-500 mt-1">{rate}% collected</p></div>
        <div className="bg-white rounded-2xl border border-amber-200 p-5"><p className="text-slate-500 text-sm">Pending</p><p className="text-2xl font-bold text-amber-600 mt-1">{summary.pending} students</p></div>
        <div className="bg-white rounded-2xl border border-red-200 p-5"><p className="text-slate-500 text-sm">Overdue</p><p className="text-2xl font-bold text-red-600 mt-1">{summary.overdue} students</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Create Fee Record</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1">Student</label>
              <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
              </select>
            </div>
            {["amount", "month", "year"].map(key => (
              <div key={key}><label className="block text-xs text-slate-500 mb-1 capitalize">{key}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            ))}
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        {["", "pending", "paid", "overdue"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={"px-3 py-2 rounded-xl text-sm capitalize transition-all " + (filter === s ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{s || "All"}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-100 bg-slate-50">{["Student", "Month/Year", "Amount", "Paid", "Status", "Action"].map(h => <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center text-slate-400 py-12">Loading...</td></tr>
              : filtered.map((f) => (
                <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{f.student_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{f.month} {f.year}</td>
                  <td className="px-4 py-3 text-slate-900 text-sm">PKR {f.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-600 text-sm">PKR {f.paid_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={"px-2 py-1 rounded-lg text-xs font-medium capitalize " + statusColor(f.status)}>{f.status}</span></td>
                  <td className="px-4 py-3">{f.status !== "paid" && <button onClick={() => markPaid(f.id, f.amount)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs hover:bg-green-100 border border-green-200"><CheckCircle size={12} /> Mark Paid</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
