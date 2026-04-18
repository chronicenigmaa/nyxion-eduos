"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

export default function PortalTimetable() {
  const [timetable, setTimetable] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/portal/my-timetable").then(r => setTimetable(r.data)).finally(() => setLoading(false));
  }, []);

  const total = Object.values(timetable).flat().length;

  return (
    <div className="p-8">
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Timetable</h1><p className="text-slate-500">{total} periods scheduled</p></div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="space-y-4">
          {DAYS.map(day => {
            const entries = (timetable[day]||[]).sort((a:any,b:any)=>a.period-b.period);
            if (entries.length === 0) return null;
            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-slate-700 font-semibold text-sm">{day}</h3>
                  <span className="text-slate-400 text-xs">{entries.length} periods</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {entries.map((e:any,i:number) => (
                    <div key={i} className="flex items-center px-5 py-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center mr-4 flex-shrink-0">P{e.period}</span>
                      <div className="flex-1">
                        <p className="text-slate-900 text-sm font-medium">{e.subject}</p>
                        <p className="text-slate-400 text-xs">{e.teacher||"-"}{e.room?" · Room "+e.room:""}</p>
                      </div>
                      <span className="text-slate-400 text-xs">{e.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {total === 0 && <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><p className="text-slate-400">Timetable not set up yet</p></div>}
        </div>
      )}
    </div>
  );
}