"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Users } from "lucide-react";
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
type ApiError = { response?: { data?: { detail?: string } } };

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    email: "",
    password: "",
    role: "teacher",
    school_id: "",
  });

  const canManage = user?.role === "super_admin" || user?.role === "school_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const roleOptions = useMemo(() => {
    if (isSuperAdmin) {
      return ["super_admin", "school_admin", "teacher", "parent", "student"] as const;
    }
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
    } catch {
      toast.error("Could not load schools");
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    void Promise.all([loadUsers(), loadSchools()]);
  }, [canManage, loadSchools, loadUsers]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload: Record<string, string> = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      };

      if (isSuperAdmin && form.role !== "super_admin") {
        if (!form.school_id) {
          toast.error("Select a school for this user");
          return;
        }
        payload.school_id = form.school_id;
      }

      await api.post("/api/v1/users", payload);
      toast.success("User created");
      setShowForm(false);
      setForm({ full_name: "", email: "", password: "", role: "teacher", school_id: "" });
      await loadUsers();
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to create user");
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

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-slate-900 font-semibold mb-4">Create User</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Full Name</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Temporary Password</label>
              <input
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRow["role"] }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("_", " ")}
                  </option>
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
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-full flex gap-3 pt-1">
              <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Name', 'Email', 'Role', 'Status', ''].map((head) => (
                <th key={head} className="text-left text-xs text-slate-500 font-medium px-4 py-3">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-12">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Users size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No users yet</p>
                </td>
              </tr>
            ) : (
              users.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 text-sm font-medium">{entry.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{entry.email}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm capitalize">{entry.role.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${entry.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {entry.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDeactivate(entry.id)} className="text-slate-300 hover:text-red-500 transition-all">
                      <Trash2 size={15} />
                    </button>
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
