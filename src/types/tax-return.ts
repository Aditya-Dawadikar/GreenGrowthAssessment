export type FieldEventType = "AI_EXTRACTED" | "UPDATED" | "LOCKED" | "UNLOCKED";

export interface FieldEvent {
  event_id: string;
  parent_id: string | null;
  type: FieldEventType;
  value: string | number;
  user_id: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    reason?: string;
  };
}

/** Normalized (0-100) percentage box, relative to the source page's rendered size. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocSource {
  doc_id: string;
  doc_name: string;
  page: number;
  bbox: BoundingBox;
}

export interface AiGroundTruth {
  value: string;
  confidence: number;
  model: string;
  extracted_at: string;
  doc_source: DocSource;
  reasoning?: string;
}

export type FieldStatus = "ai_extracted" | "user_modified" | "locked";

export interface CurrentState {
  value: string;
  status: FieldStatus;
}

export interface TaxField {
  field_id: string;
  label: string;
  ai_ground_truth: AiGroundTruth;
  current_state: CurrentState;
  event_history: FieldEvent[];
}

export interface TaxReturnData {
  return_id: string;
  client_name: string;
  tax_year: number;
  form_type: string;
  fields: TaxField[];
}

export type DocRenderKind = "pdf" | "facsimile";

export interface DocumentMeta {
  doc_id: string;
  doc_name: string;
  tab_label: string;
  kind: DocRenderKind;
  /** For kind "pdf": the URL react-pdf should load. */
  src?: string;
  pageCount?: number;
}
