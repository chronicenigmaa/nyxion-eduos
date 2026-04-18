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
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const demoLogins = [
    { label: "Super Admin", email: "superadmin@nyxion.ai" },
    { label: "TCS Admin",   email: "admin@tcs.edu.pk" },
    { label: "BHS Admin",   email: "admin@bhs.edu.pk" },
    { label: "Teacher",     email: "teacher@tcs.edu.pk" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">N</span>
            </div>
            <span className="text-white font-bold text-xl">Nyxion EduOS</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
<<<<<<< HEAD
            Pakistan First<br />AI-Native School<br />Operating System
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Manage students, teachers, attendance, fees, and academics powered by artificial intelligence.
=======
            Pakistan s First<br />AI-Native School<br />Operating System
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Manage students, teachers, attendance, fees, and academics — all powered by artificial intelligence.
>>>>>>> 3d29a5febb577b44ada8598485b2a3ac72631904
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { num: "3 sec", label: "AI exam generation" },
            { num: "0",     label: "Hardware required" },
            { num: "100%",  label: "Data ownership" },
            { num: "2 min", label: "Daily attendance" },
          ].map(({ num, label }) => (
<<<<<<< HEAD
            <div key={label} className="bg-white/20 rounded-xl p-4">
=======
            <div key={label} className="bg-blue-500/40 rounded-xl p-4">
>>>>>>> 3d29a5febb577b44ada8598485b2a3ac72631904
              <p className="text-white font-bold text-2xl">{num}</p>
              <p className="text-blue-100 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-slate-900 font-bold text-xl">Nyxion EduOS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in</h2>
          <p className="text-slate-500 mb-8">Enter your credentials to access the platform</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin@school.edu.pk"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
<<<<<<< HEAD
                placeholder="password"
=======
                placeholder="••••••••"
>>>>>>> 3d29a5febb577b44ada8598485b2a3ac72631904
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8">
<<<<<<< HEAD
            <p className="text-slate-400 text-xs text-center mb-3">Demo accounts â€” password: admin123</p>
=======
            <p className="text-slate-400 text-xs text-center mb-3">Demo accounts — password: admin123</p>
>>>>>>> 3d29a5febb577b44ada8598485b2a3ac72631904
            <div className="grid grid-cols-2 gap-2">
              {demoLogins.map((d) => (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); setPassword("admin123"); }}
                  className="text-xs py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition-all text-left"
                >
                  <span className="font-semibold block text-slate-800">{d.label}</span>
                  {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
