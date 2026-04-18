"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, BookOpen, ExternalLink, Trash2, Lightbulb, TrendingUp, AlertCircle, FileText } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";

export default function CourseBooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", description:"", class_name:"", file_url:"", file_type:"PDF" });

  const load = async () => {
    try { const { data } = await api.get("/api/v1/coursebooks/"); setBooks(data); }
    catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post("/api/v1/coursebooks/", form); toast.success("Added!"); setShowForm(false); setForm({title:"",description:"",class_name:"",file_url:"",file_type:"PDF"}); load(); }
    catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove?")) return;
    try { await api.delete("/api/v1/coursebooks/"+id); toast.success("Removed"); load(); }
    catch { toast.error("Failed"); }
  };

  const classes = [...new Set(books.map(b=>b.class_name).filter(Boolean))];
  const bkSummary = "Total: "+books.length+" resources. Classes: "+classes.join(", ")+". Types: "+[...new Set(books.map(b=>b.file_type))].join(", ");
  const aiOptions = [
    { label: "Curriculum Coverage", icon: FileText, type: "academic", prompt: "Analyze course materials for a Pakistani school. "+bkSummary+". Is the curriculum well covered?" },
    { label: "Missing Resources", icon: AlertCircle, type: "academic", prompt: "What study materials are missing? "+bkSummary+". Suggest books for Pakistani curriculum." },
    { label: "Digital Learning", icon: TrendingUp, type: "academic", prompt: "How can this school enhance digital learning? "+bkSummary+". Recommend free resources for Pakistani students." },
    { label: "Study Tips", icon: Lightbulb, type: "academic", prompt: "Generate student study tips and guides based on: "+bkSummary },
  ];

  const typeColor = (t: string) => ({PDF:"bg-red-50 text-red-600",Video:"bg-blue-50 text-blue-600",Slides:"bg-amber-50 text-amber-600",Notes:"bg-green-50 text-green-600"}[t]||"bg-slate-100 text-slate-600");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Course Books</h1><p className="text-slate-500">{books.length} resources</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
          <Plus size={16}/> Add Resource
        </button>
      </div>

      <AIInsightsPanel options={aiOptions} title="Course Books AI Analysis" />

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-2">Add Course Book</h2>
          <p className="text-slate-400 text-sm mb-4">Upload to Google Drive first, then paste the share link here.</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs text-slate-500 mb-1">Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-xs text-slate-500 mb-1">Class</label><input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1">File URL</label><input value={form.file_url} onChange={e=>setForm({...form,file_url:e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-xs text-slate-500 mb-1">Type</label>
              <select value={form.file_type} onChange={e=>setForm({...form,file_type:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                {["PDF","Video","Slides","Notes","Other"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-slate-500 mb-1">Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Add</button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {classes.length > 0 ? (
        <div className="space-y-6">
          {classes.map(cls=>(
            <div key={cls}>
              <h2 className="text-slate-700 font-semibold mb-3 text-sm">Class {cls}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.filter(b=>b.class_name===cls).map(book=>(
                  <div key={book.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><BookOpen size={18} className="text-blue-600"/></div>
                      <div className="flex gap-2">
                        {book.file_url&&<a href={book.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink size={15}/></a>}
                        <button onClick={()=>handleDelete(book.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={15}/></button>
                      </div>
                    </div>
                    <h3 className="text-slate-900 font-medium text-sm mb-1">{book.title}</h3>
                    <p className="text-slate-400 text-xs mb-3">{book.description}</p>
                    <span className={"px-2 py-1 rounded-lg text-xs font-medium "+typeColor(book.file_type)}>{book.file_type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-slate-400">No books uploaded yet</p>
        </div>
      )}
    </div>
  );
}