import type { DocumentMeta } from "@/types/tax-return";

export const documents: DocumentMeta[] = [
  {
    doc_id: "w2_acme_2025",
    doc_name: "2025_W2_AcmeCorp.pdf",
    tab_label: "Form W-2.pdf",
    kind: "pdf",
    src: "/documents/fw2.pdf",
    pageCount: 11,
  },
  {
    doc_id: "misc_acme_2025",
    doc_name: "2025_1099-MISC_AcmeCorp.pdf",
    tab_label: "Form 1099-MISC.pdf",
    kind: "facsimile",
  },
];
