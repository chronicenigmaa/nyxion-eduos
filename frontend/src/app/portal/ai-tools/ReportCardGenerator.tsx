"use client";
import { useState, useRef } from "react";
import api from "@/lib/api";
import { GraduationCap, Loader2, Download, Sparkles } from "lucide-react";

type StudentResult = {
  id: string;
  full_name: string;
  roll_number: string | null;
  class_name: string;
  section: string | null;
  attendance_rate: number;
  results: { subject: string; exam_type: string; marks_obtained: number; total_marks: number; grade: string; term: string }[];
};

type GeneratedCard = {
  student: StudentResult;
  remarks: string;
  total: number;
  totalMax: number;
  percentage: number;
  grade: string;
};

function letterGrade(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default function ReportCardGenerator({ onBack }: { onBack: () => void }) {
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [term, setTerm] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchStudents = async () => {
    if (!className) { setError("Enter a class name"); return; }
    setError("");
    setLoadingStudents(true);
    setCards([]);
    try {
      const r = await api.get(`/api/v1/portal/class-results?class_name=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}&term=${encodeURIComponent(term)}`);
      setStudents(r.data.students);
      setAvailableTerms(r.data.terms);
      if (r.data.students.length === 0) setError("No students found for this class.");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to load students");
    }
    setLoadingStudents(false);
  };

  const generateAll = async () => {
    if (students.length === 0) return;
    setGenerating(true);
    setCards([]);
    setProgress(0);
    const results: GeneratedCard[] = [];

    for (let i = 0; i < students.length; i++) {
      const st = students[i];
      const total = st.results.reduce((s, r) => s + r.marks_obtained, 0);
      const totalMax = st.results.reduce((s, r) => s + r.total_marks, 0);
      const pct = totalMax > 0 ? Math.round((total / totalMax) * 100 * 10) / 10 : 0;
      const grade = letterGrade(pct);

      let remarks = "";
      if (st.results.length > 0) {
        try {
          const r = await api.post("/api/v1/ai/report-card", {
            student_name: st.full_name,
            class_name: `${st.class_name}${st.section ? st.section : ""}`,
            roll_number: st.roll_number || "N/A",
            subjects: st.results.map(r => ({ subject: r.subject, marks_obtained: r.marks_obtained, total_marks: r.total_marks, grade: r.grade })),
            attendance_rate: st.attendance_rate,
          });
          remarks = r.data.response;
        } catch {
          remarks = "Unable to generate AI remarks at this time.";
        }
      } else {
        remarks = "No results recorded for this term.";
      }

      results.push({ student: st, remarks, total, totalMax, percentage: pct, grade });
      setProgress(i + 1);
    }

    setCards(results);
    setGenerating(false);
  };

  const printPDF = () => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body > *:not(#rc-print-root) { display: none !important; }
        #rc-print-root { display: block !important; }
        .rc-page { page-break-after: always; padding: 32px; font-family: serif; }
        .rc-page:last-child { page-break-after: auto; }
      }
    `;
    document.head.appendChild(style);
    const el = printRef.current;
    if (el) el.id = "rc-print-root";
    window.print();
    document.head.removeChild(style);
  };

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 mb-6">← Back to AI Tools</button>
      <div className="flex items-center gap-2 mb-6">
        <GraduationCap size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900">Report Card Generator</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Class *</label>
            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. 8"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
            <input value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. A"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            {availableTerms.length > 0 ? (
              <select value={term} onChange={e => setTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All terms</option>
                {availableTerms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <input value={term} onChange={e => setTerm(e.target.value)} placeholder="e.g. April 2026"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button onClick={fetchStudents} disabled={loadingStudents}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50">
            {loadingStudents ? <Loader2 size={14} className="animate-spin" /> : null}
            Load Students
          </button>
          {students.length > 0 && (
            <button onClick={generateAll} disabled={generating}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? `Generating… (${progress}/${students.length})` : `Generate ${students.length} Report Card${students.length > 1 ? "s" : ""}`}
            </button>
          )}
          {cards.length > 0 && (
            <button onClick={printPDF}
              className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900">
              <Download size={14} /> Download PDF
            </button>
          )}
        </div>
        {students.length > 0 && cards.length === 0 && !generating && (
          <p className="text-slate-500 text-sm">{students.length} student{students.length > 1 ? "s" : ""} loaded. Click Generate to create report cards.</p>
        )}
        {generating && (
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(progress / students.length) * 100}%` }} />
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div ref={printRef} className="space-y-6">
          {cards.map(card => (
            <div key={card.student.id} className="rc-page bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-blue-600 text-white px-8 py-5">
                <h2 className="text-xl font-bold">Student Report Card</h2>
                <p className="text-blue-200 text-sm mt-0.5">{term || "Academic Year"}</p>
              </div>
              {/* Student info */}
              <div className="px-8 py-4 border-b border-slate-100 grid grid-cols-3 gap-4 bg-slate-50">
                <div><p className="text-xs text-slate-500">Student Name</p><p className="font-semibold text-slate-900">{card.student.full_name}</p></div>
                <div><p className="text-xs text-slate-500">Roll Number</p><p className="font-semibold text-slate-900">{card.student.roll_number || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Class</p><p className="font-semibold text-slate-900">{card.student.class_name}{card.student.section || ""}</p></div>
                <div><p className="text-xs text-slate-500">Attendance</p><p className="font-semibold text-slate-900">{card.student.attendance_rate}%</p></div>
                <div><p className="text-xs text-slate-500">Overall %</p><p className="font-semibold text-slate-900">{card.percentage}%</p></div>
                <div><p className="text-xs text-slate-500">Grade</p>
                  <span className={"inline-block px-2 py-0.5 rounded-full text-sm font-bold " + (card.grade === "F" ? "bg-red-100 text-red-700" : card.grade.startsWith("A") ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                    {card.grade}
                  </span>
                </div>
              </div>
              {/* Results table */}
              {card.student.results.length > 0 && (
                <div className="px-8 py-4 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Subject Results</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="pb-2 font-medium">Subject</th>
                        <th className="pb-2 font-medium">Exam</th>
                        <th className="pb-2 font-medium text-right">Marks</th>
                        <th className="pb-2 font-medium text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {card.student.results.map((r, i) => (
                        <tr key={i}>
                          <td className="py-1.5 text-slate-900">{r.subject}</td>
                          <td className="py-1.5 text-slate-500 capitalize">{r.exam_type}</td>
                          <td className="py-1.5 text-slate-900 text-right">{r.marks_obtained}/{r.total_marks}</td>
                          <td className="py-1.5 text-right"><span className="font-medium text-slate-700">{r.grade}</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td className="pt-2 font-semibold text-slate-900" colSpan={2}>Total</td>
                        <td className="pt-2 font-semibold text-slate-900 text-right">{card.total}/{card.totalMax}</td>
                        <td className="pt-2 font-semibold text-slate-900 text-right">{card.grade}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {/* AI Remarks */}
              <div className="px-8 py-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles size={11} /> AI Remarks
                </p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{card.remarks}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
