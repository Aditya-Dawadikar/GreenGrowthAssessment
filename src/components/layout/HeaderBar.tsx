import { useState } from "react";
import { Menu, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaxReturn, mutationCount } from "@/state/tax-return-store";

export function HeaderBar() {
  const { returnMeta, fields, setNavDrawerOpen } = useTaxReturn();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const lockedCount = fields.filter((f) => f.current_state.status === "locked").length;
  const progress = fields.length === 0 ? 0 : Math.round((lockedCount / fields.length) * 100);
  const totalMutations = fields.reduce((sum, f) => sum + mutationCount(f), 0);

  function handleSave() {
    setSaveState("saving");
    window.setTimeout(() => {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    }, 500);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Open navigation"
        onClick={() => setNavDrawerOpen(true)}
      >
        <Menu className="size-4" />
      </Button>

      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tracking-tight text-slate-900">GGCPA AI Tax Engine</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">
          Return #{returnMeta.form_type} ({returnMeta.tax_year})
        </span>
        <span className="hidden text-slate-400 sm:inline">— {returnMeta.client_name}</span>
      </div>

      <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
        <span className="font-mono tabular-nums">{totalMutations} mutation{totalMutations === 1 ? "" : "s"}</span>

        <div className="flex items-center gap-2">
          <span>Progress:</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-slate-700">{progress}%</span>
        </div>

        <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSave} disabled={saveState !== "idle"}>
          {saveState === "saving" && <Loader2 className="size-3.5 animate-spin" />}
          {saveState === "saved" && <Check className="size-3.5" />}
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
        </Button>
      </div>
    </header>
  );
}
