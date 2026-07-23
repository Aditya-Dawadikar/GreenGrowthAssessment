import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";
import { BoundingBoxOverlay } from "@/components/document/BoundingBoxOverlay";
import "@/lib/pdf-setup";
import type { BoundingBox } from "@/types/tax-return";

interface PdfDocumentViewerProps {
  src: string;
  pageNumber: number;
  bbox: BoundingBox | null;
}

export function PdfDocumentViewer({ src, pageNumber, bbox }: PdfDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(600);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 600;
      setPageWidth(Math.max(280, Math.min(width - 32, 900)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    pageWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [pageNumber, bbox]);

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-slate-100 p-4">
      <Document
        file={src}
        loading={
          <div className="flex h-64 items-center justify-center text-slate-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        }
        error={
          <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-rose-600">
            Could not load source document.
          </div>
        }
      >
        <div ref={pageWrapRef} className="relative mx-auto w-fit shadow-sm">
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
          {bbox && <BoundingBoxOverlay bbox={bbox} />}
        </div>
      </Document>
    </div>
  );
}
