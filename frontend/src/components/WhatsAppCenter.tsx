"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2, MessageSquare, Send, CheckCircle2 } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  message: string;
  type: string;
  sent_via_whatsapp: boolean;
  created_at: string;
}

const AUDIENCES = [
  "All Parents",
  "Class 8A Parents",
  "Class 8B Parents",
  "Class 9A Parents",
  "Class 10 Parents",
  "All Students",
  "All Teachers",
];

function extractAudience(notice: Notice): string {
  const match = notice.message.match(/\[Audience:\s*(.+?)\]/i);
  return match?.[1]?.trim() || "General Audience";
}

export default function WhatsAppCenter() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [audience, setAudience] = useState("Class 8A Parents");
  const [message, setMessage] = useState("Dear parents, Al Noor Academy will be closed on Friday 25 April for a public holiday.");

  const sentLogs = useMemo(() => notices.filter((n) => n.sent_via_whatsapp), [notices]);

  const load = async () => {
    try {
      const { data } = await api.get("/api/v1/communication/notices");
      setNotices(data || []);
    } catch {
      toast.error("Failed to load WhatsApp log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error("Enter a message first");
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: `WhatsApp Broadcast - ${audience}`,
        message: `[Audience: ${audience}]\n${message.trim()}`,
        type: "general",
      };

      const { data } = await api.post("/api/v1/communication/notices", payload);
      const noticeId = data?.id;
      if (!noticeId) throw new Error("Notice id missing");

      await api.post(`/api/v1/communication/notices/${noticeId}/send-whatsapp`);
      toast.success("WhatsApp message queued successfully");
      setMessage("");
      await load();
    } catch {
      toast.error("Failed to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp</h1>
        <p className="text-slate-500 text-sm">Send announcements to selected audiences and monitor delivery history.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AUDIENCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Type your WhatsApp message..."
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={sending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-green-600" />
          <h2 className="text-slate-900 font-semibold">Delivery Log</h2>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : sentLogs.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare size={30} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">No WhatsApp deliveries yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-slate-900 text-sm font-medium">{extractAudience(log)}</p>
                  <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-0.5">Delivered</span>
                </div>
                <p className="text-slate-600 text-sm whitespace-pre-line">{log.message.replace(/\[Audience:\s*.+?\]\n?/i, "")}</p>
                <p className="text-slate-400 text-xs mt-2">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
