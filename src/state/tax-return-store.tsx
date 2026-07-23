import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import taxReturnData from "@/mocks/taxReturnData.json";
import { documents } from "@/mocks/documents";
import type { FieldEvent, FieldStatus, TaxField, TaxReturnData } from "@/types/tax-return";

export const CURRENT_USER = {
  id: "cpa_jane_smith",
  displayName: "Jane Smith, CPA",
};

const seedData = taxReturnData as TaxReturnData;

interface WorkspaceState {
  fields: TaxField[];
  selectedFieldId: string | null;
  activeDocId: string;
  ledgerFieldId: string | null;
  navDrawerOpen: boolean;
}

type Action =
  | { type: "SELECT_FIELD"; fieldId: string }
  | { type: "SET_ACTIVE_DOC"; docId: string }
  | { type: "UPDATE_VALUE"; fieldId: string; value: string }
  | { type: "LOCK_FIELD"; fieldId: string }
  | { type: "UNLOCK_FIELD"; fieldId: string }
  | { type: "OPEN_LEDGER"; fieldId: string }
  | { type: "CLOSE_LEDGER" }
  | { type: "SET_NAV_DRAWER"; open: boolean };

function nextEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function latestEvent(field: TaxField): FieldEvent {
  return field.event_history[field.event_history.length - 1];
}

function statusForValue(field: TaxField, value: string): FieldStatus {
  return value === field.ai_ground_truth.value ? "ai_extracted" : "user_modified";
}

function firstFieldIdForDoc(fields: TaxField[], docId: string): string | null {
  return fields.find((f) => f.ai_ground_truth.doc_source.doc_id === docId)?.field_id ?? null;
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "SELECT_FIELD": {
      const field = state.fields.find((f) => f.field_id === action.fieldId);
      if (!field) return state;
      return {
        ...state,
        selectedFieldId: action.fieldId,
        activeDocId: field.ai_ground_truth.doc_source.doc_id,
      };
    }
    case "SET_ACTIVE_DOC": {
      if (action.docId === state.activeDocId) return state;
      return {
        ...state,
        activeDocId: action.docId,
        selectedFieldId: firstFieldIdForDoc(state.fields, action.docId),
      };
    }
    case "UPDATE_VALUE": {
      return {
        ...state,
        fields: state.fields.map((field) => {
          if (field.field_id !== action.fieldId) return field;
          if (field.current_state.status === "locked") return field;
          const parent = latestEvent(field);
          const event: FieldEvent = {
            event_id: nextEventId(),
            parent_id: parent.event_id,
            type: "UPDATED",
            value: action.value,
            user_id: CURRENT_USER.id,
            timestamp: new Date().toISOString(),
          };
          return {
            ...field,
            current_state: { value: action.value, status: statusForValue(field, action.value) },
            event_history: [...field.event_history, event],
          };
        }),
      };
    }
    case "LOCK_FIELD": {
      return {
        ...state,
        fields: state.fields.map((field) => {
          if (field.field_id !== action.fieldId) return field;
          if (field.current_state.status === "locked") return field;
          const parent = latestEvent(field);
          const event: FieldEvent = {
            event_id: nextEventId(),
            parent_id: parent.event_id,
            type: "LOCKED",
            value: field.current_state.value,
            user_id: CURRENT_USER.id,
            timestamp: new Date().toISOString(),
          };
          return {
            ...field,
            current_state: { ...field.current_state, status: "locked" },
            event_history: [...field.event_history, event],
          };
        }),
      };
    }
    case "UNLOCK_FIELD": {
      return {
        ...state,
        fields: state.fields.map((field) => {
          if (field.field_id !== action.fieldId) return field;
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
        }),
      };
    }
    case "OPEN_LEDGER":
      return { ...state, ledgerFieldId: action.fieldId };
    case "CLOSE_LEDGER":
      return { ...state, ledgerFieldId: null };
    case "SET_NAV_DRAWER":
      return { ...state, navDrawerOpen: action.open };
    default:
      return state;
  }
}

function initState(): WorkspaceState {
  return {
    fields: seedData.fields,
    selectedFieldId: seedData.fields[0]?.field_id ?? null,
    activeDocId: documents[0]?.doc_id ?? "",
    ledgerFieldId: null,
    navDrawerOpen: false,
  };
}

interface TaxReturnContextValue extends WorkspaceState {
  returnMeta: Omit<TaxReturnData, "fields">;
  selectField: (fieldId: string) => void;
  setActiveDoc: (docId: string) => void;
  updateValue: (fieldId: string, value: string) => void;
  lockField: (fieldId: string) => void;
  unlockField: (fieldId: string) => void;
  openLedger: (fieldId: string) => void;
  closeLedger: () => void;
  setNavDrawerOpen: (open: boolean) => void;
}

const TaxReturnContext = createContext<TaxReturnContextValue | null>(null);

export function TaxReturnProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const selectField = useCallback((fieldId: string) => dispatch({ type: "SELECT_FIELD", fieldId }), []);
  const setActiveDoc = useCallback((docId: string) => dispatch({ type: "SET_ACTIVE_DOC", docId }), []);
  const updateValue = useCallback(
    (fieldId: string, value: string) => dispatch({ type: "UPDATE_VALUE", fieldId, value }),
    [],
  );
  const lockField = useCallback((fieldId: string) => dispatch({ type: "LOCK_FIELD", fieldId }), []);
  const unlockField = useCallback((fieldId: string) => dispatch({ type: "UNLOCK_FIELD", fieldId }), []);
  const openLedger = useCallback((fieldId: string) => dispatch({ type: "OPEN_LEDGER", fieldId }), []);
  const closeLedger = useCallback(() => dispatch({ type: "CLOSE_LEDGER" }), []);
  const setNavDrawerOpen = useCallback((open: boolean) => dispatch({ type: "SET_NAV_DRAWER", open }), []);

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
      setActiveDoc,
      updateValue,
      lockField,
      unlockField,
      openLedger,
      closeLedger,
      setNavDrawerOpen,
    }),
    [state, selectField, setActiveDoc, updateValue, lockField, unlockField, openLedger, closeLedger, setNavDrawerOpen],
  );

  return <TaxReturnContext.Provider value={value}>{children}</TaxReturnContext.Provider>;
}

export function useTaxReturn() {
  const ctx = useContext(TaxReturnContext);
  if (!ctx) throw new Error("useTaxReturn must be used within a TaxReturnProvider");
  return ctx;
}

export function mutationCount(field: TaxField): number {
  return field.event_history.length - 1;
}
