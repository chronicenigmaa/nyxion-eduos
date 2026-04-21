"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Sparkles, FileQuestion, BookOpen, ClipboardList, Copy, Check, Loader2 } from "lucide-react";

type Tool = "exam" | "lesson_plan" | "homework";

const TOOLS = [
  { id: "exam" as Tool,        label: "Exam Generator",   icon: FileQuestion, desc: "Generate MCQ, short answer, or mixed exams" },
  { id: "lesson_plan" as Tool, label: "Lesson Planner",   icon: BookOpen,     desc: "Create structured lesson plans" },
  { id: "homework" as Tool,    label: "Homework Creator", icon: ClipboardList, desc: "Generate homework worksheets" },
];

const QUESTION_TYPES = ["MCQ", "Short Answer", "Long Answer", "Mixed"];

export default function PortalAIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);

  // Shared fields
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [topic, setTopic] = useState("");

  // Exam-specific
  const [numQuestions, setNumQuestions] = useState("10");
  const [questionType, setQuestionType] = useState("Mixed");
  const [totalMarks, setTotalMarks] = useState("50");

  // Lesson plan-specific
  const [duration, setDuration] = useState("45");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!subject || !className) { setError("Subject and class are required"); return; }
    setLoading(true);
    setError("");
    setResult("");

    let prompt = "";
    let type = activeTool === "lesson_plan" ? "lesson_plan" : "exam";

    if (activeTool === "exam") {
      prompt = `Generate a ${questionType} exam paper for:
Subject: ${subject}
Class: ${className}
${topic ? `Topic: ${topic}` : ""}
Number of Questions: ${numQuestions}
Total Marks: ${totalMarks}

Format clearly with:
- Paper header (School Name, Subject, Class, Total Marks, Time Allowed)
- Sections divided by question type
- Each question numbered with marks in brackets
- Answer key at the end (for MCQs)
Make it appropriate for Pakistani school curriculum.`;
    } else if (activeTool === "lesson_plan") {
      prompt = `Create a detailed lesson plan for:
Subject: ${subject}
Class: ${className}
${topic ? `Topic: ${topic}` : ""}
Duration: ${duration} minutes

Include: Learning Objectives, Required Materials, Introduction, Main Activity, Practice/Assessment, Homework, and Notes for teacher.`;
    } else {
      prompt = `Create a homework worksheet for:
Subject: ${subject}
Class: ${className}
${topic ? `Topic: ${topic}` : ""}
Number of Questions: ${numQuestions}

Mix question types: short answer, fill-in-the-blank, and one application question. Include an answer key.`;
    }

    try {
      const r = await api.post("/api/v1/ai/generate", { prompt, type });
      setResult(r.data.response);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Failed to generate. Please try again.");
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setActiveTool(null); setResult(""); setError(""); };

  if (!activeTool) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={22} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">AI Tools</h1>
          </div>
          <p className="text-slate-500">AI-powered tools to save you time in the classroom</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)}
              className="text-left p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <t.icon size={20} className="text-blue-600" />
              </div>
              <h2 className="font-semibold text-slate-900 mb-1">{t.label}</h2>
              <p className="text-slate-400 text-sm">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tool = TOOLS.find(t => t.id === activeTool)!;

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
        ← Back to AI Tools
      </button>

      <div className="flex items-center gap-2 mb-6">
        <tool.icon size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900">{tool.label}</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Science"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Class *</label>
            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. 8A"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Topic (optional)</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {activeTool === "exam" && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Question Type</label>
              <select value={questionType} onChange={e => setQuestionType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Questions</label>
              <input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} min="1" max="50"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total Marks</label>
              <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} min="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {activeTool === "lesson_plan" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duration (minutes)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="20" max="120"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {activeTool === "homework" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Number of Questions</label>
            <input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} min="1" max="30"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-medium text-slate-700">Generated Output</span>
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed overflow-auto max-h-[60vh]">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
