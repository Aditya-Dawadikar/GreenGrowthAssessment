import { History } from "lucide-react";
import { cn } from "@/lib/utils";

export function MutationPill({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium shadow-sm transition-all hover:scale-105 hover:shadow active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        count > 0
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100"
          : "border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700",
      )}
      aria-label={`View field history${count > 0 ? ` (${count} mutation${count === 1 ? "" : "s"})` : ""}`}
    >
      <History className="size-3" />
      <span>History</span>
    </button>
  );
}
