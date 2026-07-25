import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import taxReturnData from "@/mocks/taxReturnData.json";
import { clients } from "@/mocks/clients";
import type { ClientMeta, FieldEvent, FieldStatus, TaxField, TaxReturnData } from "@/types/tax-return";

export const CURRENT_USER = {
  id: "cpa_jane_smith",
  displayName: "Jane Smith, CPA",
};

const seedData = taxReturnData as TaxReturnData;

interface WorkspaceState {
  fields: TaxField[];
  selectedFieldId: string | null;
  activeClientId: string | null;
  activeDocId: string | null;
  ledgerFieldId: string | null;
  checkedFieldIds: string[];
}

type Action =
  | { type: "SELECT_FIELD"; fieldId: string }
  | { type: "SET_ACTIVE_CLIENT"; clientId: string }
  | { type: "SET_ACTIVE_DOC"; docId: string }
  | { type: "UPDATE_VALUE"; fieldId: string; value: string }
  | { type: "LOCK_FIELD"; fieldId: string }
  | { type: "UNLOCK_FIELD"; fieldId: string }
  | { type: "LOCK_FIELDS"; fieldIds: string[] }
  | { type: "UNLOCK_FIELDS"; fieldIds: string[] }
  | { type: "TOGGLE_FIELD_CHECKED"; fieldId: string }
  | { type: "SET_ALL_CHECKED"; fieldIds: string[]; checked: boolean }
  | { type: "OPEN_LEDGER"; fieldId: string }
  | { type: "CLOSE_LEDGER" };

function nextEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function latestEvent(field: TaxField): FieldEvent {
  return field.event_history[field.event_history.length - 1];
}

function statusForValue(field: TaxField, value: string): FieldStatus {
  return value === field.ai_ground_truth.value ? "ai_extracted" : "user_modified";
}

function firstFieldIdForDoc(fields: TaxField[], clientId: string | null, docId: string): string | null {
  return (
    fields.find((f) => f.client_id === clientId && f.ai_ground_truth.doc_source.doc_id === docId)?.field_id ?? null
  );
}

// Every client gets its own independent copy of the seed fields for each
// document type it has, namespaced by client_id — this is what actually
// isolates one client's lock/edit state from another's, even though they
// currently all point at the same shared document set (see clients.ts).
function buildFields(seedFields: TaxField[]): TaxField[] {
  return clients.flatMap((client) =>
    client.documents.flatMap((doc) =>
      seedFields
        .filter((f) => f.ai_ground_truth.doc_source.doc_id === doc.doc_id)
        .map((f) => ({ ...f, field_id: `${client.client_id}__${f.field_id}`, client_id: client.client_id })),
    ),
  );
}

function lockOne(field: TaxField): TaxField {
  if (field.current_state.status === "locked") return field;

  const events = [...field.event_history];
  let parent = latestEvent(field);

  // Flush the pending edit (if any) into the ledger now, as a single
  // UPDATED event, rather than one per keystroke. If the draft value
  // never actually diverged from the last recorded event (including
  // the case where someone typed something and typed it back), skip
  // this — locking shouldn't manufacture a no-op mutation.
  if (field.current_state.value !== parent.value) {
    const updateEvent: FieldEvent = {
      event_id: nextEventId(),
      parent_id: parent.event_id,
      type: "UPDATED",
      value: field.current_state.value,
      user_id: CURRENT_USER.id,
      timestamp: new Date().toISOString(),
    };
    events.push(updateEvent);
    parent = updateEvent;
  }

  const lockEvent: FieldEvent = {
    event_id: nextEventId(),
    parent_id: parent.event_id,
    type: "LOCKED",
    value: field.current_state.value,
    user_id: CURRENT_USER.id,
    timestamp: new Date().toISOString(),
  };
  events.push(lockEvent);

  return {
    ...field,
    current_state: { ...field.current_state, status: "locked" },
    event_history: events,
  };
}

// The ledger is append-only (per spec) — every LOCK/UNLOCK is always
// recorded here for the audit trail. What counts as a "mutation" for
// the pill/header is a separate question, handled in mutationCount()
// below: locking and unlocking can never themselves contain a data
// change (editing is disabled while locked), so they're never counted
// there regardless of how many times a field is locked and unlocked.
function unlockOne(field: TaxField): TaxField {
  if (field.current_state.status !== "locked") return field;

  const parent = latestEvent(field);
  const event: FieldEvent = {
    event_id: nextEventId(),
    parent_id: parent.event_id,
    type: "UNLOCKED",
    value: field.current_state.value,
    user_id: CURRENT_USER.id,
    timestamp: new Date().toISOString(),
  };
  return {
    ...field,
    current_state: {
      value: field.current_state.value,
      status: statusForValue(field, field.current_state.value),
    },
    event_history: [...field.event_history, event],
  };
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "SELECT_FIELD": {
      const field = state.fields.find((f) => f.field_id === action.fieldId);
      if (!field) return state;
      return {
        ...state,
        selectedFieldId: action.fieldId,
        activeClientId: field.client_id,
        activeDocId: field.ai_ground_truth.doc_source.doc_id,
      };
    }
    case "SET_ACTIVE_CLIENT": {
      if (action.clientId === state.activeClientId) {
        return { ...state, activeClientId: null, activeDocId: null, selectedFieldId: null, checkedFieldIds: [] };
      }
      // Carry the current document over to the newly selected client when it
      // still applies there (true whenever both clients share the same
      // document set), so stepping through clients via prev/next doesn't
      // dump the CPA back at an empty "pick a document" state each time.
      const newClient = clients.find((c) => c.client_id === action.clientId);
      const keepDocId =
        state.activeDocId && newClient?.documents.some((d) => d.doc_id === state.activeDocId)
          ? state.activeDocId
          : null;
      return {
        ...state,
        activeClientId: action.clientId,
        activeDocId: keepDocId,
        selectedFieldId: keepDocId ? firstFieldIdForDoc(state.fields, action.clientId, keepDocId) : null,
        checkedFieldIds: [],
      };
    }
    case "SET_ACTIVE_DOC": {
      if (action.docId === state.activeDocId) return state;
      return {
        ...state,
        activeDocId: action.docId,
        selectedFieldId: firstFieldIdForDoc(state.fields, state.activeClientId, action.docId),
        checkedFieldIds: [],
      };
    }
    case "UPDATE_VALUE": {
      // Keystrokes only update the live working-state value/badge — they do
      // NOT write to the event ledger. A mutation is only ever recorded at
      // commit time (see LOCK_FIELD), so typing a value doesn't spam the
      // history with one UPDATED event per character.
      return {
        ...state,
        fields: state.fields.map((field) => {
          if (field.field_id !== action.fieldId) return field;
          if (field.current_state.status === "locked") return field;
          return {
            ...field,
            current_state: { value: action.value, status: statusForValue(field, action.value) },
          };
        }),
      };
    }
    case "LOCK_FIELD": {
      return {
        ...state,
        fields: state.fields.map((field) => (field.field_id === action.fieldId ? lockOne(field) : field)),
      };
    }
    case "LOCK_FIELDS": {
      const idSet = new Set(action.fieldIds);
      return {
        ...state,
        fields: state.fields.map((field) => (idSet.has(field.field_id) ? lockOne(field) : field)),
        checkedFieldIds: state.checkedFieldIds.filter((id) => !idSet.has(id)),
      };
    }
    case "TOGGLE_FIELD_CHECKED": {
      const isChecked = state.checkedFieldIds.includes(action.fieldId);
      return {
        ...state,
        checkedFieldIds: isChecked
          ? state.checkedFieldIds.filter((id) => id !== action.fieldId)
          : [...state.checkedFieldIds, action.fieldId],
      };
    }
    case "SET_ALL_CHECKED": {
      const idSet = new Set(action.fieldIds);
      return {
        ...state,
        checkedFieldIds: action.checked
          ? [...new Set([...state.checkedFieldIds, ...action.fieldIds])]
          : state.checkedFieldIds.filter((id) => !idSet.has(id)),
      };
    }
    case "UNLOCK_FIELD": {
      return {
        ...state,
        fields: state.fields.map((field) => (field.field_id === action.fieldId ? unlockOne(field) : field)),
      };
    }
    case "UNLOCK_FIELDS": {
      const idSet = new Set(action.fieldIds);
      return {
        ...state,
        fields: state.fields.map((field) => (idSet.has(field.field_id) ? unlockOne(field) : field)),
        checkedFieldIds: state.checkedFieldIds.filter((id) => !idSet.has(id)),
      };
    }
    case "OPEN_LEDGER":
      return { ...state, ledgerFieldId: action.fieldId };
    case "CLOSE_LEDGER":
      return { ...state, ledgerFieldId: null };
    default:
      return state;
  }
}

function initState(): WorkspaceState {
  const fields = buildFields(seedData.fields);
  const firstClient = clients[0] ?? null;
  const firstDocId = firstClient?.documents[0]?.doc_id ?? null;
  return {
    fields,
    selectedFieldId: firstClient && firstDocId ? firstFieldIdForDoc(fields, firstClient.client_id, firstDocId) : null,
    activeClientId: firstClient?.client_id ?? null,
    activeDocId: firstDocId,
    ledgerFieldId: null,
    checkedFieldIds: [],
  };
}

interface TaxReturnContextValue extends WorkspaceState {
  returnMeta: Omit<TaxReturnData, "fields">;
  selectField: (fieldId: string) => void;
  setActiveClient: (clientId: string) => void;
  setActiveDoc: (docId: string) => void;
  updateValue: (fieldId: string, value: string) => void;
  lockField: (fieldId: string) => void;
  unlockField: (fieldId: string) => void;
  lockFields: (fieldIds: string[]) => void;
  unlockFields: (fieldIds: string[]) => void;
  toggleFieldChecked: (fieldId: string) => void;
  setAllChecked: (fieldIds: string[], checked: boolean) => void;
  openLedger: (fieldId: string) => void;
  closeLedger: () => void;
}

const TaxReturnContext = createContext<TaxReturnContextValue | null>(null);

export function TaxReturnProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const selectField = useCallback((fieldId: string) => dispatch({ type: "SELECT_FIELD", fieldId }), []);
  const setActiveClient = useCallback((clientId: string) => dispatch({ type: "SET_ACTIVE_CLIENT", clientId }), []);
  const setActiveDoc = useCallback((docId: string) => dispatch({ type: "SET_ACTIVE_DOC", docId }), []);
  const updateValue = useCallback(
    (fieldId: string, value: string) => dispatch({ type: "UPDATE_VALUE", fieldId, value }),
    [],
  );
  const lockField = useCallback((fieldId: string) => dispatch({ type: "LOCK_FIELD", fieldId }), []);
  const unlockField = useCallback((fieldId: string) => dispatch({ type: "UNLOCK_FIELD", fieldId }), []);
  const lockFields = useCallback((fieldIds: string[]) => dispatch({ type: "LOCK_FIELDS", fieldIds }), []);
  const unlockFields = useCallback((fieldIds: string[]) => dispatch({ type: "UNLOCK_FIELDS", fieldIds }), []);
  const toggleFieldChecked = useCallback(
    (fieldId: string) => dispatch({ type: "TOGGLE_FIELD_CHECKED", fieldId }),
    [],
  );
  const setAllChecked = useCallback(
    (fieldIds: string[], checked: boolean) => dispatch({ type: "SET_ALL_CHECKED", fieldIds, checked }),
    [],
  );
  const openLedger = useCallback((fieldId: string) => dispatch({ type: "OPEN_LEDGER", fieldId }), []);
  const closeLedger = useCallback(() => dispatch({ type: "CLOSE_LEDGER" }), []);

  const value = useMemo<TaxReturnContextValue>(
    () => ({
      ...state,
      returnMeta: {
        return_id: seedData.return_id,
        client_name: seedData.client_name,
        tax_year: seedData.tax_year,
        form_type: seedData.form_type,
      },
      selectField,
      setActiveClient,
      setActiveDoc,
      updateValue,
      lockField,
      unlockField,
      lockFields,
      unlockFields,
      toggleFieldChecked,
      setAllChecked,
      openLedger,
      closeLedger,
    }),
    [
      state,
      selectField,
      setActiveClient,
      setActiveDoc,
      updateValue,
      lockField,
      unlockField,
      lockFields,
      unlockFields,
      toggleFieldChecked,
      setAllChecked,
      openLedger,
      closeLedger,
    ],
  );

  return <TaxReturnContext.Provider value={value}>{children}</TaxReturnContext.Provider>;
}

export function useTaxReturn() {
  const ctx = useContext(TaxReturnContext);
  if (!ctx) throw new Error("useTaxReturn must be used within a TaxReturnProvider");
  return ctx;
}

/**
 * A "mutation" is a change to the field's value. AI_EXTRACTED is the
 * baseline, not a mutation; LOCKED/UNLOCKED change editability, never the
 * value itself (edits are disabled while locked, so no data change can ever
 * happen between a LOCK and its UNLOCK). Only UPDATED events count.
 */
export function mutationCount(field: TaxField): number {
  return field.event_history.filter((event) => event.type === "UPDATED").length;
}

/**
 * A client is "reviewed" once every field on every one of their documents is
 * locked.
 */
export function isClientReviewed(client: ClientMeta, fields: TaxField[]): boolean {
  if (client.documents.length === 0) return false;
  const clientFields = fields.filter((f) => f.client_id === client.client_id);
  return clientFields.length > 0 && clientFields.every((f) => f.current_state.status === "locked");
}
