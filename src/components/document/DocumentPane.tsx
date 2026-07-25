import { lazy, Suspense } from "react";
import { FileText, Loader2 } from "lucide-react";
import { FacsimileDocumentViewer, fieldToFacsimileBox } from "@/components/document/FacsimileDocumentViewer";
import { allDocuments } from "@/mocks/clients";
import { useTaxReturn } from "@/state/tax-return-store";

// react-pdf/pdfjs is a large dependency (~1MB worker + core) — only fetch it
// once a PDF document actually needs rendering, not on initial page load.
const PdfDocumentViewer = lazy(() =>
  import("@/components/document/PdfDocumentViewer").then((m) => ({ default: m.PdfDocumentViewer })),
);

export function DocumentPane() {
  const { fields, selectedFieldId, activeClientId, activeDocId } = useTaxReturn();

  const activeDoc = allDocuments().find((d) => d.doc_id === activeDocId) ?? null;
  const selectedField = fields.find((f) => f.field_id === selectedFieldId) ?? null;
  const selectedBbox =
    selectedField && selectedField.ai_ground_truth.doc_source.doc_id === activeDocId
      ? selectedField.ai_ground_truth.doc_source.bbox
      : null;
  const selectedPage = selectedField?.ai_ground_truth.doc_source.page ?? 1;

  const docFields = fields.filter(
    (f) => f.client_id === activeClientId && f.ai_ground_truth.doc_source.doc_id === activeDocId,
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-slate-200 bg-white">
      <div className="h-full min-h-0 flex-1">
        {!activeDoc ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
            <FileText className="size-8" />
            <p className="text-sm">Select a document from the sidebar to preview it.</p>
          </div>
        ) : activeDoc.kind === "pdf" && activeDoc.src ? (
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            }
          >
            <PdfDocumentViewer src={activeDoc.src} pageNumber={selectedPage} bbox={selectedBbox} />
          </Suspense>
        ) : (
          <FacsimileDocumentViewer
            title={activeDoc.tab_label}
            subtitle={activeDoc.doc_name}
            boxes={docFields.map(fieldToFacsimileBox)}
            activeBbox={selectedBbox}
          />
        )}
      </div>
    </div>
  );
}
