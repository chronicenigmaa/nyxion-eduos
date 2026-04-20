"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FILE: frontend/src/app/dashboard/schools/page.tsx
// REPLACES your existing schools page entirely.
//
// New features added:
//   1. "Add Admin User" button on each school card → opens a modal to create
//      a school admin with full name, email, and password.
//   2. "Delete School" button on each school card → shows a confirm dialog
//      before permanently deleting the school and all its users.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Trash2, UserPlus, X, Eye, EyeOff, School } from "lucide-react";
import toast from "react-hot-toast";

interface SchoolData {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  package?: string;
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const PACKAGES = ["starter", "growth", "elite"];

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);

  // Add school form
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: "", code: "", address: "", phone: "", email: "", package: "starter",
  });

  // Add admin user modal
  const [adminModalSchool, setAdminModalSchool] = useState<SchoolData | null>(null);
  const [adminForm, setAdminForm] = useState({ full_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [existingAdmins, setExistingAdmins] = useState<AdminUser[]>([]);

  // Delete school confirm
  const [deleteTarget, setDeleteTarget] = useState<SchoolData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Selected school (right panel)
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    try {
      const res = await api.get("/api/v1/schools");
      setSchools(res.data);
    } catch {
      toast.error("Failed to load schools");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSchool(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/api/v1/schools", newSchool);
      toast.success(`${newSchool.name} added successfully`);
      setNewSchool({ name: "", code: "", address: "", phone: "", email: "", package: "starter" });
      setShowAddSchool(false);
      fetchSchools();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to add school");
    }
  }

  async function openAdminModal(school: SchoolData) {
    setAdminModalSchool(school);
    setAdminForm({ full_name: "", email: "", password: "" });
    setShowPassword(false);
    try {
      const res = await api.get(`/api/v1/schools/${school.id}/admins`);
      setExistingAdmins(res.data);
    } catch {
      setExistingAdmins([]);
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminModalSchool) return;
    setAdminLoading(true);
    try {
      await api.post(`/api/v1/schools/${adminModalSchool.id}/admins`, adminForm);
      toast.success(`Admin account created for ${adminForm.full_name}`);
      setAdminForm({ full_name: "", email: "", password: "" });
      // Refresh admin list
      const res = await api.get(`/api/v1/schools/${adminModalSchool.id}/admins`);
      setExistingAdmins(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create admin");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleDeleteSchool() {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) {
      toast.error("School name does not match");
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete(`/api/v1/schools/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      if (selectedSchool?.id === deleteTarget.id) setSelectedSchool(null);
      fetchSchools();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete school");
    } finally {
      setDeleteLoading(false);
    }
  }

  const packageColor: Record<string, string> = {
    starter: "bg-gray-100 text-gray-600",
    growth:  "bg-blue-100 text-blue-700",
    elite:   "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-0.5">{schools.length} in network</p>
        </div>
        <button
          onClick={() => setShowAddSchool(!showAddSchool)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add School
        </button>
      </div>

      {/* Add School Form */}
      {showAddSchool && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Add School</h2>
          <form onSubmit={handleAddSchool}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input
                  required
                  value={newSchool.name}
                  onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Al Noor Academy"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Code</label>
                <input
                  required
                  value={newSchool.code}
                  onChange={e => setNewSchool({ ...newSchool, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ANR001"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <input
                  value={newSchool.address}
                  onChange={e => setNewSchool({ ...newSchool, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Karachi Sindh"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input
                  value={newSchool.phone}
                  onChange={e => setNewSchool({ ...newSchool, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0300-0000000"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  type="email"
                  value={newSchool.email}
                  onChange={e => setNewSchool({ ...newSchool, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@school.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Package</label>
                <select
                  value={newSchool.package}
                  onChange={e => setNewSchool({ ...newSchool, package: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PACKAGES.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                Add
              </button>
              <button type="button" onClick={() => setShowAddSchool(false)} className="border border-gray-200 px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools Grid + Detail Panel */}
      <div className="flex gap-5">
        {/* School Cards */}
        <div className="flex flex-col gap-3 w-72 flex-shrink-0">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {schools.map(school => (
            <div
              key={school.id}
              onClick={() => setSelectedSchool(school)}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                selectedSchool?.id === school.id
                  ? "border-blue-500 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <School size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{school.name}</p>
                    <p className="text-xs text-blue-500">{school.code}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${packageColor[school.package || "starter"] || "bg-gray-100 text-gray-500"}`}>
                  {school.package || "Starter"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={e => { e.stopPropagation(); openAdminModal(school); }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors flex-1 justify-center font-medium"
                >
                  <UserPlus size={13} />
                  Add Admin User
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(school); setDeleteConfirmText(""); }}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors flex-1 justify-center font-medium"
                >
                  <Trash2 size={13} />
                  Delete School
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Detail Panel */}
        {selectedSchool && (
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{selectedSchool.name}</h2>
                <p className="text-xs text-gray-400">{selectedSchool.code} · {selectedSchool.email}</p>
              </div>
              <button onClick={() => setSelectedSchool(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            {/* Package selector and Feature Toggles as before */}
            <p className="text-sm text-gray-500">Select a package and manage feature toggles for this school.</p>
            <div className="mt-4 flex gap-2">
              {PACKAGES.map(p => (
                <button
                  key={p}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize border transition-colors ${
                    selectedSchool.package === p
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD ADMIN USER MODAL ──────────────────────────────────────────── */}
      {adminModalSchool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setAdminModalSchool(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Add admin user</h3>
                <p className="text-xs text-gray-400 mt-0.5">{adminModalSchool.name}</p>
              </div>
              <button onClick={() => setAdminModalSchool(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Existing Admins */}
            {existingAdmins.length > 0 && (
              <div className="px-5 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Existing admins</p>
                <div className="space-y-2 mb-4">
                  {existingAdmins.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.full_name}</p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 mb-4" />
              </div>
            )}

            {/* Create Admin Form */}
            <form onSubmit={handleCreateAdmin} className="p-5 pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Create new admin</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Full name</label>
                <input
                  required
                  value={adminForm.full_name}
                  onChange={e => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Kamran Siddiqui"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  required
                  type="email"
                  value={adminForm.email}
                  onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@school.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Min 6 characters"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">The school admin will use this to log in.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {adminLoading ? "Creating..." : "Create admin account"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdminModalSchool(null)}
                  className="px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE SCHOOL CONFIRM MODAL ───────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Delete school</h3>
              <p className="text-sm text-gray-500 mb-4">
                This will permanently delete <span className="font-semibold text-gray-800">{deleteTarget.name}</span> and
                all its admin users, teachers, students, and data. This cannot be undone.
              </p>
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">
                  Type <span className="font-mono font-semibold text-gray-700">{deleteTarget.name}</span> to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder={deleteTarget.name}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteSchool}
                  disabled={deleteConfirmText !== deleteTarget.name || deleteLoading}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {deleteLoading ? "Deleting..." : "Delete permanently"}
                </button>
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                  className="px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}