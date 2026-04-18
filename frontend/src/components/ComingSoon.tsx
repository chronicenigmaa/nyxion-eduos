import { Construction } from "lucide-react";

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
          <Construction size={28} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 max-w-sm">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-blue-600 text-sm">In development — coming soon</span>
        </div>
      </div>
    </div>
  );
}
