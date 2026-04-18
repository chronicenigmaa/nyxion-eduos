"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Clock, CheckCircle, Send, ChevronDown, ChevronUp } from "lucide-react";

export default function PortalAssignments() {
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string,string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/portal/dashboard").then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const submit = async (assignmentId: string) => {
    const content = submissions[assignmentId];
    if (!content?.trim()) return toast.error("Write your answer first");
    setSubmitting(assignmentId);
    try {
      await api.post("/api/v1/portal/submit-assignment", { assignment_id: assignmentId, content });
      toast.success("Submitted!");
      api.get("/api/v1/portal/dashboard").then(r => setData(r.data));
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(null); }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading...</div>;
  const assignments = data?.assignments || [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
        <p className="text-slate-500">{assignments.filter((a:any)=>!a.submitted).length} pending · {assignments.filter((a:any)=>a.submitted).length} submitted</p>
      </div>
      <div className="space-y-3">
        {assignments.length === 0 ? <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><p className="text-slate-400">No assignments yet</p></div>
          : assignments.map((a: any) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-5 cursor-pointer" onClick={()=>setExpanded(expanded===a.id?null:a.id)}>
                <div className="flex items-center gap-3">
                  {a.submitted ? <CheckCircle size={18} className="text-green-600 flex-shrink-0"/> : <Clock size={18} className="text-amber-500 flex-shrink-0"/>}
                  <div>
                    <h3 className="text-slate-900 font-medium text-sm">{a.title}</h3>
                    <p className="text-slate-400 text-xs">{a.total_marks} marks{a.due_date ? " · Due "+new Date(a.due_date).toLocaleDateString() : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.submitted && a.grade != null && (
                    <span className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium">{a.grade}/{a.total_marks}</span>
                  )}
                  <span className={"px-2 py-1 rounded-lg text-xs font-medium "+(a.submitted?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700")}>{a.submitted?"Submitted":"Pending"}</span>
                  {expanded===a.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                </div>
              </div>

              {expanded===a.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  {a.subject && <p className="text-slate-600 text-sm mb-4 leading-relaxed">{a.subject}</p>}
                  {a.feedback && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                      <p className="text-green-700 text-xs font-medium mb-1">Teacher Feedback</p>
                      <p className="text-green-800 text-sm">{a.feedback}</p>
                    </div>
                  )}
                  {!a.submitted && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Your Answer</label>
                      <textarea value={submissions[a.id]||""} onChange={e=>setSubmissions({...submissions,[a.id]:e.target.value})}
                        placeholder="Write your answer here..." rows={5}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"/>
                      <button onClick={()=>submit(a.id)} disabled={submitting===a.id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-all">
                        <Send size={14}/>{submitting===a.id?"Submitting...":"Submit Assignment"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}