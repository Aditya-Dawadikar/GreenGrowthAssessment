import { useTaxReturn } from "@/state/tax-return-store";

export function HeaderBar() {
  const { returnMeta } = useTaxReturn();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tracking-tight text-slate-900">GGCPA AI Tax Engine</span>
        {/* <span className="text-slate-300">·</span> */}
        {/* <span className="text-slate-500">
          Return #{returnMeta.form_type} ({returnMeta.tax_year})
        </span>
        <span className="hidden text-slate-400 sm:inline">— {returnMeta.client_name}</span> */}
      </div>
    </header>
  );
}
