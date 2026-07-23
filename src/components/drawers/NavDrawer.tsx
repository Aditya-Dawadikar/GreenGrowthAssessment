import { FileText, FolderOpen, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { documents } from "@/mocks/documents";
import { useTaxReturn } from "@/state/tax-return-store";

export function NavDrawer() {
  const { returnMeta, activeDocId, setActiveDoc, navDrawerOpen, setNavDrawerOpen } = useTaxReturn();

  return (
    <Sheet open={navDrawerOpen} onOpenChange={setNavDrawerOpen}>
      <SheetContent side="left" className="w-full sm:max-w-xs">
        <SheetHeader>
          <SheetTitle>GGCPA AI Tax Engine</SheetTitle>
          <SheetDescription>Navigation &amp; document storage</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 text-sm">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
            <User className="size-4 text-slate-400" />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-900">{returnMeta.client_name}</div>
              <div className="text-[10px] text-slate-500">
                Form {returnMeta.form_type} · Tax year {returnMeta.tax_year}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <FolderOpen className="size-3" />
              Source documents
            </div>
            <ul className="space-y-0.5">
              {documents.map((doc) => (
                <li key={doc.doc_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDoc(doc.doc_id);
                      setNavDrawerOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      doc.doc_id === activeDocId
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{doc.tab_label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Tax schedules
            </div>
            <p className="text-xs text-slate-400">
              Additional schedules attach here as the return grows. Not needed for this case study.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
