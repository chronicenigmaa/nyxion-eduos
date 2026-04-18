"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function PortalResults() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/portal/my-results").then(r => setResults(r.data)).finally(() => setLoading(false));
  }, []);

  const gradeColor = (g: string) => ({"A+":"bg-green-100 text-green-700","A":"bg-green-100 text-green-700","B":"bg-blue-100 text-blue-700","C":"bg-amber-100 text-amber-700","D":"bg-orange-100 text-orange-700","F":"bg-red-100 text-red-700"}[g]||"bg-slate-100 text-slate-600");
  const exams = [...new Set(results.map(r=>r.exam_type))];
  const avg = results.length > 0 ? Math.round(results.reduce((a,r)=>a+(r.marks_obtained/r.total_marks)*100,0)/results.length) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Results</h1>
        <p className="text-slate-500">{results.length} records · Overall average: {avg}%</p>
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : results.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><p className="text-slate-400">No results yet</p></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Average</p><p className="text-3xl font-bold text-blue-600 mt-1">{avg}%</p></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Exams</p><p className="text-3xl font-bold text-slate-900 mt-1">{exams.length}</p></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">A+ Grades</p><p className="text-3xl font-bold text-green-600 mt-1">{results.filter(r=>r.grade==="A+").length}</p></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Subjects</p><p className="text-3xl font-bold text-amber-600 mt-1">{[...new Set(results.map(r=>r.subject_name))].length}</p></div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100 bg-slate-50">{["Subject","Exam","Marks","Grade","Term"].map(h=><th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {results.map((r,i)=>(
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 text-sm font-medium">{r.subject_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm capitalize">{r.exam_type}</td>
                    <td className="px-4 py-3 text-slate-900 text-sm">{r.marks_obtained}/{r.total_marks} <span className="text-slate-400">({Math.round((r.marks_obtained/r.total_marks)*100)}%)</span></td>
                    <td className="px-4 py-3"><span className={"px-2 py-1 rounded-lg text-xs font-bold "+gradeColor(r.grade)}>{r.grade}</span></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}