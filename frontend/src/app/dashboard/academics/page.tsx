"use client";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, TrendingUp, AlertCircle, Lightbulb, BarChart2 } from "lucide-react";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  class_name?: string | null;
  section?: string | null;
  description?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
};
type ClassSummary = { class_name: string; sections?: string[] };
type Section = { id: string; class_name: string; section: string };
type Teacher = { id: string; full_name: string };
type Student = { id: string; class_name?: string | null };
type ApiError = { response?: { data?: { detail?: string } } };

export default function AcademicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subjectForm, setSubjectForm] = useState({ name: "", class_name: "", section: "", teacher_id: "", description: "" });
  const [sectionForm, setSectionForm] = useState({ class_name: "", section: "" });

  const load = async () => {
    try {
      const [subjectsRes, classesRes, teachersRes, studentsRes, sectionsRes] = await Promise.allSettled([
        api.get("/api/v1/academics/subjects"),
        api.get("/api/v1/academics/classes"),
        api.get("/api/v1/teachers/"),
        api.get("/api/v1/students/"),
        api.get("/api/v1/academics/sections"),
      ]);

      if (subjectsRes.status === "fulfilled") setSubjects(subjectsRes.value.data as Subject[]);
      if (classesRes.status === "fulfilled") setClasses(classesRes.value.data as ClassSummary[]);
      if (teachersRes.status === "fulfilled") setTeachers(teachersRes.value.data as Teacher[]);
      if (studentsRes.status === "fulfilled") setStudents(studentsRes.value.data as Student[]);
      if (sectionsRes.status === "fulfilled") setSections(sectionsRes.value.data as Section[]);

      if ([subjectsRes, classesRes, teachersRes, studentsRes, sectionsRes].some((result) => result.status === "rejected")) {
        toast.error("Some academic data could not be loaded.");
      }
    } catch {
      toast.error("Failed to load academics.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/academics/subjects", subjectForm);
      toast.success("Subject added");
      setShowSubjectForm(false);
      setSubjectForm({ name: "", class_name: "", section: "", teacher_id: "", description: "" });
      await load();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to add subject");
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/academics/sections", sectionForm);
      toast.success("Section added");
      setShowSectionForm(false);
      setSectionForm({ class_name: "", section: "" });
      await load();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to add section");
    }
  };

  const classOptions = useMemo(() => {
    const fromClasses = classes.map((entry) => entry.class_name).filter(Boolean);
    const fromSections = sections.map((entry) => entry.class_name).filter(Boolean);
    return Array.from(new Set([...fromClasses, ...fromSections])).sort();
  }, [classes, sections]);

  const filteredSections = useMemo(
    () => sections.filter((entry) => !subjectForm.class_name || entry.class_name === subjectForm.class_name),
    [sections, subjectForm.class_name]
  );

  const acSummary = `Students: ${students.length}, Classes: ${classes.map((c) => `Class ${c.class_name}`).join(", ")}, Subjects: ${subjects.map((s) => s.name).join(", ")}, Teachers: ${teachers.length}`;
  const aiOptions = [
    { label: "Academic Overview", icon: BarChart2, type: "academic", prompt: `Analyze academic structure: ${acSummary}. Provide an overview for school management.` },
    { label: "Curriculum Gaps", icon: AlertCircle, type: "academic", prompt: `Identify curriculum gaps for a Pakistani school: ${acSummary}. What subjects are missing?` },
    { label: "Class Analysis", icon: TrendingUp, type: "academic", prompt: `Analyze class structure: ${acSummary}. Are class sizes optimal? Recommendations?` },
    { label: "Improvement Plan", icon: Lightbulb, type: "academic", prompt: `Create a 5-point academic improvement plan for a Pakistani school: ${acSummary}` },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Academics</h1><p className="text-slate-500">{classes.length} classes · {subjects.length} subjects · {sections.length} sections</p></div>
        <div className="flex gap-2">
          <Link href="/dashboard/students" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-all">
            Manage Student Info
          </Link>
          <button onClick={() => setShowSectionForm(!showSectionForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition-all">
            <Plus size={16} /> Add Section
          </button>
          <button onClick={() => setShowSubjectForm(!showSubjectForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all">
            <Plus size={16} /> Add Subject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Total Students</p><p className="text-3xl font-bold text-slate-900 mt-1">{students.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Classes</p><p className="text-3xl font-bold text-blue-600 mt-1">{classes.length}</p></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-slate-500 text-sm">Subjects</p><p className="text-3xl font-bold text-green-600 mt-1">{subjects.length}</p></div>
      </div>

      <AIInsightsPanel options={aiOptions} title="Academic AI Analysis" />

      {showSectionForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Add Class Section</h2>
          <form onSubmit={handleSectionSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Class</label>
              <input value={sectionForm.class_name} onChange={(e) => setSectionForm({ ...sectionForm, class_name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Section</label>
              <input value={sectionForm.section} onChange={(e) => setSectionForm({ ...sectionForm, section: e.target.value.toUpperCase() })} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowSectionForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showSubjectForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Add Subject and Assign Teacher</h2>
          <form onSubmit={handleSubjectSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Subject Name</label>
              <input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Class</label>
              <select value={subjectForm.class_name} onChange={(e) => setSubjectForm({ ...subjectForm, class_name: e.target.value, section: "" })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                <option value="">Select class</option>
                {classOptions.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Section</label>
              <select value={subjectForm.section} onChange={(e) => setSubjectForm({ ...subjectForm, section: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                <option value="">Select section</option>
                {filteredSections.map((entry) => (
                  <option key={entry.id} value={entry.section}>{entry.section}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Teacher</label>
              <select value={subjectForm.teacher_id} onChange={(e) => setSubjectForm({ ...subjectForm, teacher_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none">
                <option value="">Select teacher</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Description</label>
              <input value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p className="col-span-full text-xs text-slate-400 -mt-1">This links a specific teacher to a subject for the selected class and section.</p>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowSubjectForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-4">Classes and Sections</h2>
          {loading ? <p className="text-slate-400 text-sm">Loading...</p>
            : classes.length === 0 ? <p className="text-slate-400 text-sm">No classes yet</p>
            : classes.map((cl) => (
              <div key={cl.class_name} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div><p className="text-slate-900 text-sm font-medium">Class {cl.class_name}</p><p className="text-slate-400 text-xs">Sections: {cl.sections?.join(", ") || "-"}</p></div>
                <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">{students.filter((s) => s.class_name === cl.class_name).length} students</span>
              </div>
            ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold mb-4">Subjects and Teacher Assignments</h2>
          {loading ? <p className="text-slate-400 text-sm">Loading...</p>
            : subjects.length === 0 ? <p className="text-slate-400 text-sm">No subjects yet</p>
            : subjects.map((s) => (
              <div key={s.id} className="py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-900 text-sm font-medium">{s.name}</p>
                  <span className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium">Class {s.class_name || "All"} {s.section ? `- ${s.section}` : ""}</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Teacher: {s.teacher_name || "Not assigned"}</p>
                <p className="text-slate-400 text-xs mt-0.5">{s.description || "No description"}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
