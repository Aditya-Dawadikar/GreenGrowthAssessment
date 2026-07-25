import { CheckCircle2, ChevronRight, FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { clients } from "@/mocks/clients";
import { isClientReviewed, useTaxReturn } from "@/state/tax-return-store";

export function DocumentSidebar() {
  const { fields, activeClientId, activeDocId, setActiveClient, setActiveDoc } = useTaxReturn();

  const reviewedCount = clients.filter((c) => isClientReviewed(c, fields)).length;
  const pendingCount = clients.length - reviewedCount;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          <Users className="size-3" />
          Clients
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-400" />
            {pendingCount} pending
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {reviewedCount} reviewed
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="p-1.5">
          {clients.map((client) => {
            const isActiveClient = client.client_id === activeClientId;
            const reviewed = isClientReviewed(client, fields);
            return (
              <li key={client.client_id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveClient(client.client_id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                    isActiveClient ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <ChevronRight
                    className={cn("size-3 shrink-0 text-slate-400 transition-transform", isActiveClient && "rotate-90")}
                  />
                  <span className={cn("truncate", reviewed && "text-slate-400")}>{client.display_name}</span>
                  {reviewed ? (
                    <CheckCircle2 className="ml-auto size-3.5 shrink-0 text-emerald-500" aria-label="Reviewed" />
                  ) : (
                    <Badge variant="outline" className="ml-auto h-4 shrink-0 px-1.5 text-[9px] font-normal text-slate-400">
                      {client.documents.length}
                    </Badge>
                  )}
                </button>

                {isActiveClient && (
                  <ul className="ml-3.5 space-y-0.5 border-l border-slate-200 py-0.5 pl-2.5">
                    {client.documents.length === 0 ? (
                      <li className="px-2 py-1 text-[11px] text-slate-400">No documents yet</li>
                    ) : (
                      client.documents.map((doc) => {
                        const isActiveDoc = doc.doc_id === activeDocId;
                        return (
                          <li key={doc.doc_id}>
                            <button
                              type="button"
                              onClick={() => setActiveDoc(doc.doc_id)}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors",
                                isActiveDoc ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              <FileText className="size-3 shrink-0" />
                              <span className="truncate">{doc.tab_label}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
