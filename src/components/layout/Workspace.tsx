import { HeaderBar } from "@/components/layout/HeaderBar";
import { DocumentSidebar } from "@/components/layout/DocumentSidebar";
import { DocumentPane } from "@/components/document/DocumentPane";
import { VerificationPane } from "@/components/verification/VerificationPane";
import { EventLedgerDrawer } from "@/components/drawers/EventLedgerDrawer";

export function Workspace() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <HeaderBar />
      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr_1fr]">
        <DocumentSidebar />
        <DocumentPane />
        <VerificationPane />
      </div>
      <EventLedgerDrawer />
    </div>
  );
}
