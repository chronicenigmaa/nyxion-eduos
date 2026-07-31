"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MailCheck } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

type ApiError = { response?: { data?: { detail?: string } } };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/v1/auth/forgot-password", { email });
      setSent(true);
      // Present only when the backend has no email provider configured (dev).
      if (data?.debug_reset_url) setDebugUrl(data.debug_reset_url as string);
    } catch (error: unknown) {
      toast.error((error as ApiError)?.response?.data?.detail || "Could not send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Image src="/logo-light.svg" alt="Nyxion Labs" width={140} height={43} priority />
        </div>

        {sent ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-5">
              <MailCheck className="text-green-600" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-500 leading-relaxed">
              If an account exists for <span className="font-medium text-slate-700">{email}</span>, we&apos;ve sent a
              link to reset your password. The link expires in 60 minutes and can only be used once.
            </p>
            <p className="text-slate-400 text-sm mt-4">
              Didn&apos;t get it? Check your spam folder, or{" "}
              <button onClick={() => { setSent(false); setDebugUrl(null); }} className="text-blue-600 hover:text-blue-700 font-medium">
                try a different address
              </button>.
            </p>

            {debugUrl && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-amber-800 text-xs font-semibold mb-1">Email delivery is not configured</p>
                <p className="text-amber-700 text-xs mb-2">
                  Set <code className="font-mono">RESEND_API_KEY</code> on the backend. Meanwhile, use this link:
                </p>
                <a href={debugUrl} className="text-blue-700 text-xs break-all underline">{debugUrl}</a>
              </div>
            )}

            <Link href="/login" className="inline-flex items-center gap-2 mt-8 text-slate-500 hover:text-slate-800 text-sm">
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Forgot your password?</h1>
            <p className="text-slate-500 mb-8">
              Enter the email address on your account and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@school.edu.pk"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <Link href="/login" className="inline-flex items-center gap-2 mt-8 text-slate-500 hover:text-slate-800 text-sm">
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
