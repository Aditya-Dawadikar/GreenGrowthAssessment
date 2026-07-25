import type { ClientMeta, DocumentMeta } from "@/types/tax-return";

// Every client shares this same document set for now — there's only one
// seeded return (John Doe's) with real extracted field data, and the other
// clients exist to demonstrate the sidebar's user/document hierarchy at scale.
const SHARED_DOCUMENTS: DocumentMeta[] = [
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

export const clients: ClientMeta[] = [
  { client_id: "client_john_doe", display_name: "John A. Doe", documents: SHARED_DOCUMENTS },
  { client_id: "client_acme_rentals", display_name: "Acme Rentals LLC", documents: SHARED_DOCUMENTS },
  { client_id: "client_sarah_nguyen", display_name: "Sarah Nguyen", documents: SHARED_DOCUMENTS },
];

export function allDocuments() {
  return clients.flatMap((c) => c.documents);
}
