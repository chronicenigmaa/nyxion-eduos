"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Users, Pencil, X, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: "super_admin" | "school_admin" | "teacher" | "parent" | "student";
  school_id: string | null;
  is_active: boolean;
};

type School = { id: string; name: string; code: string };

type FormState = {
  full_name: string;
  email: string;
  password: string;
  role: UserRow["role"];
  school_id: string;
};

type EditState = {
  id: string;
  full_name: string;
  email: string;
  role: UserRow["role"];
  school_id: string;
  new_password: string;
};

type ApiError = { response?: { data?: { detail?: string } } };

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
};

export default function UsersPage() {
  return <Suspense><UsersPageInner /></Suspense>;
}

function UsersPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState<string>(searchParams.get("role") ?? "all");
  const [form, setForm] = useState<FormState>({
    full_name: "", email: "", password: "", role: "school_admin", school_id: "",
  });

  const canManage = user?.role === "super_admin" || user?.role === "school_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const roleOptions = useMemo(() => {
    if (isSuperAdmin) return ["super_admin", "school_admin", "teacher", "parent", "student"] as const;
    return ["teacher", "parent", "student"] as const;
  }, [isSuperAdmin]);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/users");
      setUsers(data as UserRow[]);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const { data } = await api.get("/api/v1/schools");
      setSchools(data as School[]);
    } catch {}
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    void Promise.all([loadUsers(), loadSchools()]);
  }, [canManage, loadSchools, loadUsers]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload: Record<string, string> = {
        full_name: form.full_name, email: form.email,
        password: form.password, role: form.role,
      };
      if (isSuperAdmin && form.role !== "super_admin") {
        if (!form.school_id) { toast.error("Select a school for this user"); return; }
        payload.school_id = form.school_id;
      }
      await api.post("/api/v1/users", payload);
      toast.success("User created");
      setShowForm(false);
      setForm({ full_name: "", email: "", password: "", role: "school_admin", school_id: "" });
      await loadUsers();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to create user");
    }
  };

  const openEdit = (u: UserRow) => {
    setEditState({
      id: u.id, full_name: u.full_name, email: u.email,
      role: u.role, school_id: u.school_id ?? "", new_password: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        full_name: editState.full_name,
        email: editState.email,
        role: editState.role,
      };
      if (editState.school_id) payload.school_id = editState.school_id;
      if (editState.new_password) payload.new_password = editState.new_password;
      await api.patch(`/api/v1/users/${editState.id}`, payload);
      toast.success("User updated");
      setEditState(null);
      await loadUsers();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this user account?")) return;
    try {
      await api.delete(`/api/v1/users/${id}`);
      toast.success("User deactivated");
      await loadUsers();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to deactivate user");
    }
  };

  const filteredUsers = filterRole === "all" ? users : users.filter(u => u.role === filterRole);

  if (!canManage) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
        <p className="text-slate-500 mt-2">Only super admins and school admins can manage users.</p>
      </div>
    );
  }

  return (

    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
          <p className="text-slate-500">{users.length} active accounts</p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", ...(isSuperAdmin ? ["super_admin", "school_admin"] : []), "teacher", "parent", "student"].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (
              filterRole === role
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {role === "all" ? "All" : ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Create User</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Full Name", key: "full_name", type: "text" },
              { label: "Email", key: "email", type: "email" },
              { label: "Temporary Password", key: "password", type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof FormState]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  required
                  minLength={key === "password" ? 6 : undefined}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRow["role"] }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            {isSuperAdmin && form.role !== "super_admin" && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">School</label>
                <select
                  value={form.school_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, school_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none"
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>{school.name} ({school.code})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-full flex gap-3 pt-1">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-slate-900 font-semibold">Edit User</h2>
              <button onClick={() => setEditState(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Full Name</label>
                <input
                  value={editState.full_name}
                  onChange={(e) => setEditState(s => s && ({ ...s, full_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editState.email}
                  onChange={(e) => setEditState(s => s && ({ ...s, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Role</label>
                  <select
                    value={editState.role}
                    onChange={(e) => setEditState(s => s && ({ ...s, role: e.target.value as UserRow["role"] }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
              )}
              {isSuperAdmin && editState.role !== "super_admin" && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">School</label>
                  <select
                    value={editState.school_id}
                    onChange={(e) => setEditState(s => s && ({ ...s, school_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none"
                  >
                    <option value="">No school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name} ({school.code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-500 flex items-center gap-1"><KeyRound size={11} /> New Password <span className="text-slate-400">(leave blank to keep current)</span></label>
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
                      setEditState(s => s && ({ ...s, new_password: pwd }));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={editState.new_password}
                  onChange={(e) => setEditState(s => s && ({ ...s, new_password: e.target.value }))}
                  placeholder="min 6 characters"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editState.new_password && (
                  <p className="text-xs text-amber-600 mt-1">User will be required to change this on next login.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditState(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Name", "Email", "Role", "School", "Status", ""].map((head) => (
                <th key={head} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-slate-400 py-12">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Users size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No users found</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{entry.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{entry.email}</td>
                  <td className="px-4 py-3">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (
                      entry.role === "super_admin" ? "bg-purple-100 text-purple-700" :
                      entry.role === "school_admin" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {ROLE_LABELS[entry.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {schools.find(s => s.id === entry.school_id)?.name ?? (entry.school_id ? "—" : "Global")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"px-2 py-1 rounded-lg text-xs font-medium " + (entry.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500")}>
                      {entry.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(entry)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-all"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeactivate(entry.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-all"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
