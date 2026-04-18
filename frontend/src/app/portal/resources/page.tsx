"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { BookOpen, ExternalLink } from "lucide-react";

export default function PortalResources() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/portal/coursebooks").then(r => setBooks(r.data)).finally(() => setLoading(false));
  }, []);

  const typeColor = (t:string) => ({PDF:"bg-red-50 text-red-600",Video:"bg-blue-50 text-blue-600",Slides:"bg-amber-50 text-amber-600",Notes:"bg-green-50 text-green-600"}[t]||"bg-slate-100 text-slate-600");

  return (
    <div className="p-8">
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Resources</h1><p className="text-slate-500">{books.length} materials available</p></div>
      {loading ? <p className="text-slate-400">Loading...</p> : books.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><BookOpen size={40} className="mx-auto text-slate-300 mb-3"/><p className="text-slate-400">No resources uploaded yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><BookOpen size={18} className="text-blue-600"/></div>
                {b.file_url && <a href={b.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink size={16}/></a>}
              </div>
              <h3 className="text-slate-900 font-medium text-sm mb-1">{b.title}</h3>
              <p className="text-slate-400 text-xs mb-3">{b.description}</p>
              <span className={"px-2 py-1 rounded-lg text-xs font-medium "+typeColor(b.file_type)}>{b.file_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}