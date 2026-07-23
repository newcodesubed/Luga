export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 bg-[#0F172A] border border-brand-emerald/40 text-emerald-400 text-xs px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in border-slate-850">
      <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
      <span className="font-medium tracking-wide">{message}</span>
    </div>
  );
}
