"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Brain, Loader2, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Lightbulb, BarChart2, Users, DollarSign } from "lucide-react";

export interface InsightOption {
  label: string;
  prompt: string;
  type: string;
  icon: any;
}

interface Props {
  options: InsightOption[];
  title?: string;
}

function parse(text: string) {
  text = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
  return text.split("\n").filter(l => l.trim());
}

export default function AIInsightsPanel({ options, title = "AI Insights" }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const run = async (opt: InsightOption) => {
    if (selected === opt.label && response) { setSelected(null); setResponse(""); return; }
    setSelected(opt.label);
    setLoading(true);
    setResponse("");
    try {
      const { data } = await api.post("/api/v1/ai/analyze", { prompt: opt.prompt, type: opt.type });
      setResponse(data.response);
    } catch { setResponse("AI service unavailable. Please check Railway logs."); }
    finally { setLoading(false); }
  };

  const lines = parse(response);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Brain size={16} className="text-blue-600" />
          </div>
          <span className="text-slate-900 font-semibold text-sm">{title}</span>
          {selected && !loading && response && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{selected}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {open && (
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-5">
            {options.map((opt) => {
              const Icon = opt.icon;
              const active = selected === opt.label;
              return (
                <button key={opt.label} onClick={() => run(opt)}
                  className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border " + (
                    active
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  )}>
                  {loading && active ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 size={22} className="animate-spin text-blue-600" />
              <span className="text-slate-500 text-sm">Analyzing with Llama 3.3 70B...</span>
            </div>
          )}

          {!loading && response && (
            <div className="bg-slate-50 rounded-xl p-5 space-y-1">
              {lines.map((line, i) => {
                const clean = line.replace(/^[*\-]\s+/, "").replace(/^\d+\.\s+/, "").trim();
                if (!clean) return <div key={i} className="h-2" />;
                const isHead = (clean.endsWith(":") && clean.length < 60) || /^[A-Z][A-Z\s]+$/.test(clean);
                const isBullet = /^[*\-]/.test(line.trim()) || /^\d+\./.test(line.trim());
                if (isHead) return (
                  <div key={i} className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
                    <div className="w-1 h-4 bg-blue-600 rounded-full flex-shrink-0" />
                    <p className="text-slate-900 font-semibold text-sm">{clean.replace(/:$/, "")}</p>
                  </div>
                );
                if (isBullet) return (
                  <div key={i} className="flex items-start gap-2.5 pl-3 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm leading-relaxed">{clean}</p>
                  </div>
                );
                return <p key={i} className="text-slate-600 text-sm leading-relaxed py-0.5">{clean}</p>;
              })}
            </div>
          )}

          {!loading && !response && (
            <div className="text-center py-8">
              <Brain size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-slate-400 text-sm">Choose an analysis type above to get AI insights</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}