"use client";
import { useState } from "react";
import api from "@/lib/api";
import { DollarSign, Sparkles, Loader2 } from "lucide-react";

type FeeRecord = { month: string; year: string; amount: number; paid_amount: number; status: string; due_date: string | null };
type StudentFee = { id: string; full_name: string; roll_number: string | null; class_name: string; section: string | null; fees: FeeRecord[]; total_due: number; months_overdue: number };

export default function FeeDefaulterPrediction({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [students, setStudents] = useState<StudentFee[]>([]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadAndAnalyse = async () => {
    setLoading(true); setError(""); setResult(""); setStudents([]);
    try {
      const r = await api.get("/api/v1/portal/my-students-fees");
      const data: StudentFee[] = r.data.students;
      setStudents(data);
      setLoaded(true);

      if (data.length === 0) { setError("No students found."); setLoading(false); return; }

      setLoading(false);
      setAnalysing(true);

      const payload = data.map(s => ({
        student_name: s.full_name,
        class: `${s.class_name}${s.section || ""}`,
        roll_number: s.roll_number,
        total_due: s.total_due,
        months_overdue: s.months_overdue,
        payment_history: s.fees.map(f => ({
          period: `${f.month} ${f.year}`,
          amount: f.amount,
          paid: f.paid_amount,
          status: f.status,
        })),
      }));

      const res = await api.post("/api/v1/ai/fee-defaulter-prediction", { students: payload });
      setResult(res.data.response);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to load or analyse fee data");
    }
    setLoading(false);
    setAnalysing(false);
  };

  const highRisk = students.filter(s => s.months_overdue >= 2 || s.total_due > 5000);
  const medRisk  = students.filter(s => !highRisk.includes(s) && (s.months_overdue === 1 || s.total_due > 0));
  const clear    = students.filter(s => s.total_due === 0 && s.months_overdue === 0);

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 mb-6">← Back to AI Tools</button>
      <div className="flex items-center gap-2 mb-6">
        <DollarSign size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900">Fee Defaulter Prediction</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 space-y-3">
        <p className="text-sm text-slate-500">Analyse fee payment history of your students and predict who is likely to default next month.</p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={loadAndAnalyse} disabled={loading || analysing}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
          {(loading || analysing) ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Loading data…" : analysing ? "Analysing…" : "Load & Analyse"}
        </button>
      </div>

      {loaded && students.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{highRisk.length}</p>
            <p className="text-xs text-red-500 mt-0.5">High Risk</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{medRisk.length}</p>
            <p className="text-xs text-yellow-500 mt-0.5">Medium Risk</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{clear.length}</p>
            <p className="text-xs text-green-500 mt-0.5">Clear</p>
          </div>
        </div>
      )}

      {loaded && students.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-medium text-slate-700">Student Fee Summary</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Student", "Class", "Months Overdue", "Total Due", "Risk"].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.sort((a, b) => b.months_overdue - a.months_overdue || b.total_due - a.total_due).map(s => {
                const risk = highRisk.includes(s) ? { label: "High", cls: "bg-red-100 text-red-700" }
                  : medRisk.includes(s)  ? { label: "Medium", cls: "bg-yellow-100 text-yellow-700" }
                  : { label: "Clear", cls: "bg-green-100 text-green-700" };
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{s.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.class_name}{s.section || ""}</td>
                    <td className="px-4 py-2.5 text-slate-700">{s.months_overdue}</td>
                    <td className="px-4 py-2.5 text-slate-700">Rs. {s.total_due.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.cls}`}>{risk.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Sparkles size={13} className="text-blue-500" />
            <span className="text-sm font-medium text-slate-700">AI Prediction & Recommendations</span>
          </div>
          <div className="p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  );
}
