"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Sparkles, FileQuestion, BookOpen, ClipboardList, GraduationCap } from "lucide-react";
import ExamGenerator from "./ExamGenerator";
import ReportCardGenerator from "./ReportCardGenerator";
import LessonPlanner from "./LessonPlanner";
import HomeworkCreator from "./HomeworkCreator";

type Tool = "exam" | "report_card" | "lesson_plan" | "homework";

const TOOLS = [
  { id: "exam" as Tool,        label: "Exam Generator",       icon: FileQuestion,   desc: "Generate MCQ, short answer, or mixed exam papers" },
  { id: "report_card" as Tool, label: "Report Card Generator",icon: GraduationCap,  desc: "AI-generated remarks with PDF download" },
  { id: "lesson_plan" as Tool, label: "Lesson Planner",       icon: BookOpen,       desc: "Create structured lesson plans" },
  { id: "homework" as Tool,    label: "Homework Creator",     icon: ClipboardList,  desc: "Generate homework worksheets" },
];

export default function PortalAIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);

  if (activeTool === "exam")        return <ExamGenerator onBack={() => setActiveTool(null)} />;
  if (activeTool === "report_card") return <ReportCardGenerator onBack={() => setActiveTool(null)} />;
  if (activeTool === "lesson_plan") return <LessonPlanner onBack={() => setActiveTool(null)} />;
  if (activeTool === "homework")    return <HomeworkCreator onBack={() => setActiveTool(null)} />;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">AI Tools</h1>
        </div>
        <p className="text-slate-500">AI-powered tools to save you time in the classroom</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
