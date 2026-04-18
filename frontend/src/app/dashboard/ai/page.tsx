"use client";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Brain, Loader2, Sparkles } from "lucide-react";

type FeatureMap = Record<string, boolean>;

const templates = [
  { type: "exam",         label: "Generate Exam",  placeholder: "Generate 10 MCQ questions for Grade 8 Science on Photosynthesis", feature: "exam_generator" },
  { type: "lesson_plan",  label: "Lesson Plan",    placeholder: "Create a lesson plan for Grade 6 Mathematics on fractions", feature: "lesson_planner" },
  { type: "announcement", label: "Announcement",   placeholder: "Write an announcement for parent-teacher meeting this Saturday", feature: "notice_writer" },
  { type: "general",      label: "Ask Anything",   placeholder: "How should I handle a student who is consistently absent?" },
];

export default function AIPage() {
  const [type, setType] = useState("exam");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<FeatureMap | null>(null);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const { data } = await api.get("/api/v1/schools/my-features");
        setFeatures(data as FeatureMap);
      } catch {
        setFeatures({});
      }
    };
    loadFeatures();
  }, []);

  const visibleTemplates = useMemo(
    () => templates.filter((template) => !template.feature || features?.[template.feature] !== false),
    [features]
  );

  useEffect(() => {
    if (visibleTemplates.length && !visibleTemplates.some((template) => template.type === type)) {
      setType(visibleTemplates[0].type);
      setPrompt("");
      setResponse("");
    }
  }, [type, visibleTemplates]);

  const generate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first");
    setLoading(true);
    setResponse("");
    try {
      const { data } = await api.post("/api/v1/ai/generate", { prompt, type });
      setResponse(data.response);
    } catch (e: unknown) {
      const detail = typeof e === "object" && e && "response" in e
        ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      if (detail?.includes("disabled")) {
        setResponse("");
      }
      toast.error(detail || "AI service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="text-blue-600" size={26} /> AI Tools
        </h1>
        <p className="text-slate-500 mt-1">Powered by Llama 3 70B</p>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {visibleTemplates.map((t) => (
          <button key={t.type} onClick={() => { setType(t.type); setPrompt(""); setResponse(""); }}
            className={"px-4 py-2 rounded-xl text-sm font-medium transition-all border " + (type === t.type ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={visibleTemplates.find(t => t.type === type)?.placeholder}
          rows={4} className="w-full bg-transparent text-slate-800 text-sm resize-none focus:outline-none placeholder-slate-400" />
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <span className="text-slate-400 text-xs">Model: Llama 3 70B (Groq)</span>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
      {response && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-blue-600" />
            <span className="text-blue-600 text-sm font-medium">AI Response</span>
          </div>
          <pre className="text-slate-700 text-sm whitespace-pre-wrap font-sans leading-relaxed">{response}</pre>
        </div>
      )}
    </div>
  );
}
