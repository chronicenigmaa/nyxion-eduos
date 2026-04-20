"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";

type ApiError = { response?: { data?: { detail?: string } } };

export default function LoginPage() {
  const { login, changePassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.must_change_password) {
        setRequirePasswordChange(true);
        toast("Set a new password to continue.");
      } else {
        toast.success("Welcome to Nyxion EduOS!");
        router.push("/dashboard");
      }
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await changePassword(password, newPassword);
      toast.success("Password updated. Please sign in again.");
      setRequirePasswordChange(false);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Failed to change password");
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
          <div className="mb-16">
            <Image src="/logo-dark.svg" alt="Nyxion Labs" width={160} height={49} priority />
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Pakistan First AI-Native School Operating System
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Manage students, teachers, attendance, fees, and academics powered by artificial intelligence.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { num: "3 sec", label: "AI exam generation" },
            { num: "0",     label: "Hardware required" },
            { num: "100%",  label: "Data ownership" },
            { num: "2 min", label: "Daily attendance" },
          ].map(({ num, label }) => (
            <div key={label} className="bg-white/20 rounded-xl p-4">
              <p className="text-white font-bold text-2xl">{num}</p>
              <p className="text-blue-100 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Image src="/logo-light.svg" alt="Nyxion Labs" width={140} height={43} priority />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{requirePasswordChange ? "Change Password" : "Sign in"}</h2>
          <p className="text-slate-500 mb-8">{requirePasswordChange ? "First login detected. Set a new password to continue." : "Enter your credentials to access the platform"}</p>
          <form onSubmit={requirePasswordChange ? handlePasswordChange : handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={requirePasswordChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="admin@school.edu.pk" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{requirePasswordChange ? "Current Password" : "Password"}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="password" required />
            </div>
            {requirePasswordChange && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="minimum 6 characters" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="repeat new password" required />
                </div>
              </>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50">
              {loading ? (requirePasswordChange ? "Updating..." : "Signing in...") : (requirePasswordChange ? "Update Password" : "Sign In")}
            </button>
          </form>
          {!requirePasswordChange && (
          <div className="mt-8">
            <p className="text-slate-400 text-xs text-center mb-3">Demo accounts - password: admin123</p>
            <div className="grid grid-cols-2 gap-2">
              {demoLogins.map((d) => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword("admin123"); }}
                  className="text-xs py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition-all text-left">
                  <span className="font-semibold block text-slate-800">{d.label}</span>
                  {d.email}
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
