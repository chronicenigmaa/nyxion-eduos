"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await login(email, password);
    toast.success("Welcome to Nyxion EduOS!");
    router.push("/dashboard");
  } catch (err: any) {
    console.error("Login error:", err);
    toast.error(err?.response?.data?.detail || "Login failed");
  } finally {
    setLoading(false);
  }
};

  const demoLogins = [
    { label: "Super Admin", email: "superadmin@nyxion.ai" },
    { label: "TCS Admin", email: "admin@tcs.edu.pk" },
    { label: "BHS Admin", email: "admin@bhs.edu.pk" },
    { label: "Teacher", email: "teacher@tcs.edu.pk" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500 mb-4">
            <span className="text-2xl font-bold text-white">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Nyxion EduOS</h1>
          <p className="text-purple-300 mt-1">AI-native School Operating System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="admin@school.edu.pk"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo quick logins */}
          <div className="mt-6">
            <p className="text-purple-300 text-xs text-center mb-3">Demo accounts (password: admin123)</p>
            <div className="grid grid-cols-2 gap-2">
              {demoLogins.map((d) => (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); setPassword("admin123"); }}
                  className="text-xs py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 border border-white/10 transition-all text-left"
                >
                  <span className="font-medium text-white">{d.label}</span>
                  <br />{d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}