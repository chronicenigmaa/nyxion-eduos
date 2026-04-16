import { Construction } from "lucide-react";

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mx-auto mb-4">
          <Construction size={28} className="text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400 max-w-sm">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-600/20">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-blue-400 text-sm">In development — coming soon</span>
        </div>
      </div>
    </div>
  );
}