"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

type ApiError = { response?: { data?: { detail?: string } } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const validate = useCallback(async () => {
    if (!token) { setChecking(false); return; }
    try {
      const { data } = await api.get("/api/v1/auth/reset-password/validate", { params: { token } });
      setTokenValid(Boolean(data?.valid));
      setAccountEmail(data?.email ?? null);
    } catch {
      setTokenValid(false);
    } finally {
      setChecking(false);
    }
  }, [token]);

  useEffect(() => { void validate(); }, [validate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/v1/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Could not reset your password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Image src="/logo-light.svg" alt="Nyxion Labs" width={140} height={43} priority />
        </div>

        {checking ? (
          <p className="text-slate-400">Checking your reset link…</p>
        ) : done ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-5">
              <CheckCircle2 className="text-green-600" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Password updated</h1>
            <p className="text-slate-500 mb-8">You can now sign in with your new password.</p>
            <Link href="/login" className="inline-block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all">
              Go to sign in
            </Link>
          </>
        ) : !tokenValid ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5">
              <ShieldAlert className="text-red-600" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">This link is no longer valid</h1>
            <p className="text-slate-500 mb-8">
              Password reset links expire after 60 minutes and can only be used once. Request a fresh one to continue.
            </p>
            <Link href="/forgot-password" className="inline-block w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all">
              Request a new link
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 mt-8 text-slate-500 hover:text-slate-800 text-sm">
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Set a new password</h1>
            <p className="text-slate-500 mb-8">
              {accountEmail ? <>Choose a new password for <span className="font-medium text-slate-700">{accountEmail}</span>.</> : "Choose a new password for your account."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="minimum 6 characters"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="repeat new password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
