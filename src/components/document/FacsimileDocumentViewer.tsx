import { BoundingBoxOverlay } from "@/components/document/BoundingBoxOverlay";
import type { BoundingBox, TaxField } from "@/types/tax-return";

interface FacsimileBox {
  label: string;
  value: string;
  bbox: BoundingBox;
}

interface FacsimileDocumentViewerProps {
  title: string;
  subtitle: string;
  boxes: FacsimileBox[];
  activeBbox: BoundingBox | null;
}

export function FacsimileDocumentViewer({ title, subtitle, boxes, activeBbox }: FacsimileDocumentViewerProps) {
  return (
    <div className="h-full overflow-auto bg-slate-100 p-4">
      <div className="relative mx-auto aspect-[612/792] w-full max-w-[600px] rounded-sm border border-slate-300 bg-white p-6 shadow-sm">
        <div className="text-[10px] uppercase tracking-wide text-slate-400">Facsimile — no source PDF provided</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
        <div className="mt-4 border-t border-slate-200" />

        {boxes.map((box) => (
          <div
            key={box.label}
            className="absolute flex flex-col justify-between rounded-sm border border-slate-300 bg-slate-50/60 p-1.5"
            style={{
              left: `${box.bbox.x}%`,
              top: `${box.bbox.y}%`,
              width: `${box.bbox.width}%`,
              height: `${box.bbox.height}%`,
            }}
          >
            <span className="text-[9px] leading-tight text-slate-500">{box.label}</span>
            <span className="font-mono text-xs font-medium text-slate-800">{box.value}</span>
          </div>
        ))}

        {activeBbox && <BoundingBoxOverlay bbox={activeBbox} />}
      </div>
    </div>
  );
}

export function fieldToFacsimileBox(field: TaxField): FacsimileBox {
  return {
    label: field.label,
    value: field.ai_ground_truth.value,
    bbox: field.ai_ground_truth.doc_source.bbox,
  };
}
