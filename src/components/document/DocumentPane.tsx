import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacsimileDocumentViewer, fieldToFacsimileBox } from "@/components/document/FacsimileDocumentViewer";
import { documents } from "@/mocks/documents";
import { useTaxReturn } from "@/state/tax-return-store";

// react-pdf/pdfjs is a large dependency (~1MB worker + core) — only fetch it
// once a PDF document actually needs rendering, not on initial page load.
const PdfDocumentViewer = lazy(() =>
  import("@/components/document/PdfDocumentViewer").then((m) => ({ default: m.PdfDocumentViewer })),
);

export function DocumentPane() {
  const { fields, selectedFieldId, activeDocId, setActiveDoc } = useTaxReturn();

  const activeDoc = documents.find((d) => d.doc_id === activeDocId) ?? documents[0];
  const selectedField = fields.find((f) => f.field_id === selectedFieldId) ?? null;
  const selectedBbox =
    selectedField && selectedField.ai_ground_truth.doc_source.doc_id === activeDocId
      ? selectedField.ai_ground_truth.doc_source.bbox
      : null;
  const selectedPage = selectedField?.ai_ground_truth.doc_source.page ?? 1;

  const docFields = fields.filter((f) => f.ai_ground_truth.doc_source.doc_id === activeDocId);

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex shrink-0 items-center border-b border-slate-200 px-2 py-1.5">
        <Tabs value={activeDoc.doc_id} onValueChange={setActiveDoc}>
          <TabsList>
            {documents.map((doc) => (
              <TabsTrigger key={doc.doc_id} value={doc.doc_id} className="text-xs">
                {doc.tab_label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1">
        {activeDoc.kind === "pdf" && activeDoc.src ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            }
          >
            <PdfDocumentViewer src={activeDoc.src} pageNumber={selectedPage} bbox={selectedBbox} />
          </Suspense>
        ) : (
          <FacsimileDocumentViewer
            title="1099-MISC — Miscellaneous Information"
            subtitle="2025_1099-MISC_AcmeCorp.pdf"
            boxes={docFields.map(fieldToFacsimileBox)}
            activeBbox={selectedBbox}
          />
        )}
      </div>
    </div>
  );
}
