"use client";
import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Brain, Loader2, Sparkles } from "lucide-react";

const templates = [
  { type: "exam", label: "Generate Exam", placeholder: "Generate 10 MCQ questions for Grade 8 Science chapter on Photosynthesis with 1 mark each" },
  { type: "lesson_plan", label: "Lesson Plan", placeholder: "Create a lesson plan for Grade 6 Mathematics on fractions for a 45-minute class" },
  { type: "announcement", label: "Announcement", placeholder: "Write an announcement for parent-teacher meeting this Saturday at 10am" },
  { type: "general", label: "Ask Anything", placeholder: "How should I handle a student who is consistently absent from class?" },
];

export default function AIPage() {
  const [type, setType] = useState("exam");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first");
    setLoading(true);
    setResponse("");
    try {
      const { data } = await api.post("/api/v1/ai/generate", { prompt, type });
      setResponse(data.response);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "AI service unavailable. Start Ollama first.");
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = templates.find(t => t.type === type);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="text-purple-400" size={28} /> AI Tools
        </h1>
        <p className="text-slate-400 mt-1">Powered by local AI — your data never leaves your server</p>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {templates.map((t) => (
          <button
            key={t.type}
            onClick={() => { setType(t.type); setPrompt(""); setResponse(""); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              type === t.type
                ? "bg-purple-500 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={currentTemplate?.placeholder}
          rows={4}
          className="w-full bg-transparent text-white text-sm resize-none focus:outline-none placeholder-slate-500"
        />
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
          <span className="text-slate-500 text-xs">Model: llama3.2 (local)</span>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="bg-slate-800/50 rounded-2xl border border-purple-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">AI Response</span>
          </div>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{response}</pre>
        </div>
      )}
    </div>
  );
}