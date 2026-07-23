import { HeaderBar } from "@/components/layout/HeaderBar";
import { DocumentPane } from "@/components/document/DocumentPane";
import { VerificationPane } from "@/components/verification/VerificationPane";
import { NavDrawer } from "@/components/drawers/NavDrawer";
import { EventLedgerDrawer } from "@/components/drawers/EventLedgerDrawer";

export function Workspace() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <HeaderBar />
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <DocumentPane />
        <VerificationPane />
      </div>
      <NavDrawer />
      <EventLedgerDrawer />
    </div>
  );
}
