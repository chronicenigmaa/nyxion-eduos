"use client";
import { useState } from "react";
import api from "@/lib/api";
import { FileQuestion, Sparkles, Loader2, Copy, Check } from "lucide-react";

const QUESTION_TYPES = ["MCQ", "Short Answer", "Long Answer", "Mixed"];

export default function ExamGenerator({ onBack }: { onBack: () => void }) {
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [questionType, setQuestionType] = useState("Mixed");
  const [totalMarks, setTotalMarks] = useState("50");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!subject || !className) { setError("Subject and class are required"); return; }
    setLoading(true); setError(""); setResult("");
    try {
      const r = await api.post("/api/v1/ai/generate", {
        type: "exam",
        prompt: `Generate a ${questionType} exam paper for:
Subject: ${subject}
Class: ${className}
${topic ? `Topic: ${topic}` : ""}
Number of Questions: ${numQuestions}
Total Marks: ${totalMarks}

Format clearly with paper header, sections by question type, each question numbered with marks in brackets, and an answer key at the end. Appropriate for Pakistani school curriculum.`,
      });
      setResult(r.data.response);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to generate");
    }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 mb-6">← Back to AI Tools</button>
      <div className="flex items-center gap-2 mb-6"><FileQuestion size={20} className="text-blue-600" /><h1 className="text-xl font-bold text-slate-900">Exam Generator</h1></div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Science"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Class *</label>
            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. 8A"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Topic (optional)</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={questionType} onChange={e => setQuestionType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Questions</label>
            <input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} min="1" max="50"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Total Marks</label>
            <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} min="1"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-medium text-slate-700">Generated Exam</span>
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}{copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed overflow-auto max-h-[60vh]">{result}</pre>
        </div>
      )}
    </div>
  );
}
