import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, Lock, Search, Star, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldRow } from "@/components/verification/FieldRow";
import { TaxCalculationView } from "@/components/verification/TaxCalculationView";
import { ThresholdPopover } from "@/components/verification/ThresholdPopover";
import { clients } from "@/mocks/clients";
import { cn } from "@/lib/utils";
import { useTaxReturn } from "@/state/tax-return-store";

type RightPaneTab = "verification" | "calculation";

export function VerificationPane() {
  const {
    fields,
    activeClientId,
    activeDocId,
    checkedFieldIds,
    starredClientIds,
    setActiveClient,
    setAllChecked,
    lockFields,
    unlockFields,
    toggleClientStarred,
  } = useTaxReturn();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<RightPaneTab>("verification");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, [activeDocId]);

  const clientIndex = clients.findIndex((c) => c.client_id === activeClientId);
  const activeClient = clientIndex >= 0 ? clients[clientIndex] : null;
  const isActiveClientStarred = Boolean(activeClientId && starredClientIds.includes(activeClientId));

  function stepClient(delta: 1 | -1) {
    if (clientIndex === -1) {
      setActiveClient(clients[delta === 1 ? 0 : clients.length - 1].client_id);
      return;
    }
    const nextIndex = (clientIndex + delta + clients.length) % clients.length;
    setActiveClient(clients[nextIndex].client_id);
  }

  const clientFields = activeClientId ? fields.filter((f) => f.client_id === activeClientId) : [];

  function handleSave() {
    // Save = finalize: lock every field belonging to this client (across all
    // of their documents, not just the one currently previewed), so the
    // client is immediately marked reviewed/completed in the sidebar.
    lockFields(clientFields.map((f) => f.field_id));

    setSaveState("saving");
    window.setTimeout(() => {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    }, 500);
  }

  const docFields = clientFields.filter((f) => f.ai_ground_truth.doc_source.doc_id === activeDocId);
  const docFieldIds = docFields.map((f) => f.field_id);

  const trimmedQuery = debouncedSearchQuery.trim().toLowerCase();
  const visibleFields = trimmedQuery
    ? docFields.filter(
        (f) =>
          f.label.toLowerCase().includes(trimmedQuery) ||
          f.ai_ground_truth.value.toLowerCase().includes(trimmedQuery) ||
          f.current_state.value.toLowerCase().includes(trimmedQuery),
      )
    : docFields;
  const checkedInDoc = checkedFieldIds.filter((id) => docFieldIds.includes(id));
  const allChecked = docFieldIds.length > 0 && checkedInDoc.length === docFieldIds.length;
  const checkedFields = docFields.filter((f) => checkedInDoc.includes(f.field_id));
  const lockableChecked = checkedFields.filter((f) => f.current_state.status !== "locked").map((f) => f.field_id);
  const unlockableChecked = checkedFields.filter((f) => f.current_state.status === "locked").map((f) => f.field_id);

  const lockedCount = clientFields.filter((f) => f.current_state.status === "locked").length;
  const progress = clientFields.length === 0 ? 0 : Math.round((lockedCount / clientFields.length) * 100);

  const saveIcon =
    saveState === "saving" ? (
      <Loader2 className="size-3.5 animate-spin" />
    ) : saveState === "saved" ? (
      <Check className="size-3.5" />
    ) : null;
  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          disabled={!activeClientId}
          aria-label={isActiveClientStarred ? "Unstar client" : "Star client for later review"}
          onClick={() => activeClientId && toggleClientStarred(activeClientId)}
        >
          <Star className={cn("size-3.5", isActiveClientStarred ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
        </Button>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-900">
          {activeClient?.display_name ?? "No client selected"}
        </span>
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
          <span>Progress:</span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono tabular-nums text-slate-700">{progress}%</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Previous client"
            onClick={() => stepClient(-1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="font-mono text-[10px] tabular-nums text-slate-400">
            {clientIndex >= 0 ? clientIndex + 1 : 0}/{clients.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Next client"
            onClick={() => stepClient(1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {!activeClientId ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-slate-400">
          <ClipboardList className="size-8" />
          <p className="text-sm">Select a client to begin verification.</p>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as RightPaneTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 border-b border-slate-200 px-3 py-1.5">
            <TabsList variant="line">
              <TabsTrigger value="verification">Extraction &amp; Verification</TabsTrigger>
              <TabsTrigger value="calculation">Tax Calculation</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="verification" className="flex min-h-0 flex-1 flex-col">
            {!activeDocId ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-slate-400">
                <ClipboardList className="size-8" />
                <p className="text-sm">Select a document to verify its extracted fields.</p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-1.5">
                  <div className="relative max-w-xs flex-1">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search fields…"
                      className="h-7 pl-7 text-xs"
                      aria-label="Search fields"
                    />
                  </div>

                  <div className="ml-auto flex items-center gap-1.5">
                    <ThresholdPopover />
                    <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSave} disabled={saveState !== "idle"}>
                      {saveIcon}
                      {saveLabel}
                    </Button>
                  </div>
                </div>

                {checkedInDoc.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-600">{checkedInDoc.length} selected</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {lockableChecked.length > 0 && (
                        <Button type="button" variant="outline" size="xs" onClick={() => lockFields(lockableChecked)}>
                          <Lock className="size-3" />
                          Lock selected
                        </Button>
                      )}
                      {unlockableChecked.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => unlockFields(unlockableChecked)}
                        >
                          <Unlock className="size-3" />
                          Unlock selected
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid shrink-0 grid-cols-[1rem_1fr_1fr_6rem_auto] gap-2 border-b border-slate-200 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  <Checkbox
                    checked={allChecked}
                    disabled={docFieldIds.length === 0}
                    onCheckedChange={(checked) => setAllChecked(docFieldIds, checked === true)}
                    aria-label="Select all fields for bulk lock/unlock"
                  />
                  <span className="text-center">AI Extracted</span>
                  <span className="text-center">Working State</span>
                  <span className="text-center">Status</span>
                  <span className="text-center">Mutations</span>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  {visibleFields.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400">
                      {docFields.length === 0 ? "No extracted fields for this document." : "No fields match your search."}
                    </p>
                  ) : (
                    visibleFields.map((field) => <FieldRow key={field.field_id} field={field} />)
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="calculation" className="flex min-h-0 flex-1 flex-col">
            <TaxCalculationView
              fields={clientFields}
              clientId={activeClientId}
              onFieldSelected={() => setActiveTab("verification")}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
