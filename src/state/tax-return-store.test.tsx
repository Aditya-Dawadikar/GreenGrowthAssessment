import { act, renderHook, type RenderHookResult } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TAX_SCHEME, type CalculatedField } from "@/lib/tax-calculations";
import { CURRENT_USER, TaxReturnProvider, isClientReviewed, mutationCount, useTaxReturn } from "@/state/tax-return-store";
import type { ClientMeta, FieldEvent, FieldStatus, TaxField } from "@/types/tax-return";

// John Doe is the default active client on init, and this is one of his W-2
// fields — real seed data, prefixed the same way buildFields() prefixes it.
const WAGES_FIELD_ID = "client_john_doe__line_1a_wages";
const AI_VALUE = "$125,000.00";

function setup() {
  return renderHook(() => useTaxReturn(), {
    wrapper: ({ children }) => <TaxReturnProvider>{children}</TaxReturnProvider>,
  });
}

function getField(result: RenderHookResult<ReturnType<typeof useTaxReturn>, unknown>["result"], fieldId: string) {
  const field = result.current.fields.find((f) => f.field_id === fieldId);
  if (!field) throw new Error(`field not found: ${fieldId}`);
  return field;
}

describe("ai_ground_truth (AI extracted baseline)", () => {
  it("seeds current_state from ai_ground_truth.value with status ai_extracted", () => {
    const { result } = setup();
    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({ value: AI_VALUE, status: "ai_extracted" });
  });

  it("is never mutated by editing, locking, or unlocking", () => {
    const { result } = setup();
    const original = getField(result, WAGES_FIELD_ID).ai_ground_truth;

    act(() => result.current.updateValue(WAGES_FIELD_ID, "$999,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));
    act(() => result.current.unlockField(WAGES_FIELD_ID));

    expect(getField(result, WAGES_FIELD_ID).ai_ground_truth).toEqual(original);
  });

  it("leaves other fields' state untouched when one field is edited", () => {
    const { result } = setup();
    const otherFieldId = "client_john_doe__line_2_fed_withheld";
    const before = getField(result, otherFieldId);

    act(() => result.current.updateValue(WAGES_FIELD_ID, "$1.00"));

    expect(getField(result, otherFieldId)).toEqual(before);
  });
});

describe("current_state (working state) status transitions", () => {
  it("stays ai_extracted when the typed value matches the AI value", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, AI_VALUE));
    expect(getField(result, WAGES_FIELD_ID).current_state.status).toBe("ai_extracted");
  });

  it("flips to user_modified as soon as the value diverges", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({
      value: "$130,000.00",
      status: "user_modified",
    });
  });

  it("reverts to ai_extracted when the user types back to the original value", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.updateValue(WAGES_FIELD_ID, AI_VALUE));
    expect(getField(result, WAGES_FIELD_ID).current_state.status).toBe("ai_extracted");
  });

  it("treats near-matches (trailing whitespace, case) as user_modified — comparison is exact string equality", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, `${AI_VALUE} `));
    expect(getField(result, WAGES_FIELD_ID).current_state.status).toBe("user_modified");
  });

  it("treats an empty string as a valid, user_modified value", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, ""));
    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({ value: "", status: "user_modified" });
  });

  it("locking forces status to locked even when the value matches the AI value", () => {
    const { result } = setup();
    act(() => result.current.lockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID).current_state.status).toBe("locked");
  });

  it("locking forces status to locked when the value was user-modified", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({ value: "$130,000.00", status: "locked" });
  });

  it("ignores edits while a field is locked", () => {
    const { result } = setup();
    act(() => result.current.lockField(WAGES_FIELD_ID));
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$1.00"));
    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({ value: AI_VALUE, status: "locked" });
  });

  it("unlocking recomputes status as ai_extracted when the locked-in value matches the AI value", () => {
    const { result } = setup();
    act(() => result.current.lockField(WAGES_FIELD_ID));
    act(() => result.current.unlockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID).current_state.status).toBe("ai_extracted");
  });

  it("unlocking recomputes status as user_modified when the locked-in value diverged", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));
    act(() => result.current.unlockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({
      value: "$130,000.00",
      status: "user_modified",
    });
  });

  it("unlocking a field that isn't locked is a no-op", () => {
    const { result } = setup();
    const before = getField(result, WAGES_FIELD_ID);
    act(() => result.current.unlockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID)).toEqual(before);
  });

  it("dispatching an action for an unknown fieldId does not throw or change state", () => {
    const { result } = setup();
    const before = result.current.fields;
    act(() => result.current.updateValue("no_such_field", "x"));
    act(() => result.current.lockField("no_such_field"));
    act(() => result.current.unlockField("no_such_field"));
    expect(result.current.fields).toEqual(before);
  });

  it("bulk lockFields/unlockFields apply the same status transitions as the single-field actions", () => {
    const { result } = setup();
    const otherFieldId = "client_john_doe__line_2_fed_withheld";

    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.lockFields([WAGES_FIELD_ID, otherFieldId]));

    expect(getField(result, WAGES_FIELD_ID).current_state).toEqual({ value: "$130,000.00", status: "locked" });
    expect(getField(result, otherFieldId).current_state.status).toBe("locked");

    act(() => result.current.unlockFields([WAGES_FIELD_ID, otherFieldId]));

    expect(getField(result, WAGES_FIELD_ID).current_state.status).toBe("user_modified");
    expect(getField(result, otherFieldId).current_state.status).toBe("ai_extracted");
  });
});

describe("event_history (mutation ledger)", () => {
  it("starts with exactly one root AI_EXTRACTED event", () => {
    const { result } = setup();
    const events = getField(result, WAGES_FIELD_ID).event_history;
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("AI_EXTRACTED");
    expect(events[0].parent_id).toBeNull();
  });

  it("does not append an event per keystroke", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$1"));
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$13"));
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    expect(getField(result, WAGES_FIELD_ID).event_history).toHaveLength(1);
  });

  it("commits a single UPDATED event on lock when the value changed", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));

    const events = getField(result, WAGES_FIELD_ID).event_history;
    expect(events.map((e) => e.type)).toEqual(["AI_EXTRACTED", "UPDATED", "LOCKED"]);
    expect(events[1].value).toBe("$130,000.00");
    expect(events[1].parent_id).toBe(events[0].event_id);
    expect(events[2].value).toBe("$130,000.00");
    expect(events[2].parent_id).toBe(events[1].event_id);
  });

  it("skips the UPDATED event on lock when the value is unchanged", () => {
    const { result } = setup();
    act(() => result.current.lockField(WAGES_FIELD_ID));
    const events = getField(result, WAGES_FIELD_ID).event_history;
    expect(events.map((e) => e.type)).toEqual(["AI_EXTRACTED", "LOCKED"]);
  });

  it("does not manufacture an UPDATED event when the user bounces back to the AI value before locking", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.updateValue(WAGES_FIELD_ID, AI_VALUE));
    act(() => result.current.lockField(WAGES_FIELD_ID));

    const events = getField(result, WAGES_FIELD_ID).event_history;
    expect(events.map((e) => e.type)).toEqual(["AI_EXTRACTED", "LOCKED"]);
  });

  it("locking an already-locked field is idempotent — no new events", () => {
    const { result } = setup();
    act(() => result.current.lockField(WAGES_FIELD_ID));
    const afterFirstLock = getField(result, WAGES_FIELD_ID).event_history;
    act(() => result.current.lockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID).event_history).toEqual(afterFirstLock);
  });

  it("records an UNLOCKED event chained to the prior LOCKED event", () => {
    const { result } = setup();
    act(() => result.current.lockField(WAGES_FIELD_ID));
    const lockEvent = getField(result, WAGES_FIELD_ID).event_history.at(-1) as FieldEvent;

    act(() => result.current.unlockField(WAGES_FIELD_ID));

    const events = getField(result, WAGES_FIELD_ID).event_history;
    expect(events.map((e) => e.type)).toEqual(["AI_EXTRACTED", "LOCKED", "UNLOCKED"]);
    expect((events.at(-1) as FieldEvent).parent_id).toBe(lockEvent.event_id);
  });

  it("unlocking a field that isn't locked appends nothing", () => {
    const { result } = setup();
    act(() => result.current.unlockField(WAGES_FIELD_ID));
    expect(getField(result, WAGES_FIELD_ID).event_history).toHaveLength(1);
  });

  it("chains parent_id correctly across edit -> lock -> unlock -> edit -> lock", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));
    act(() => result.current.unlockField(WAGES_FIELD_ID));
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$140,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));

    const events = getField(result, WAGES_FIELD_ID).event_history;
    expect(events.map((e) => e.type)).toEqual(["AI_EXTRACTED", "UPDATED", "LOCKED", "UNLOCKED", "UPDATED", "LOCKED"]);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].parent_id).toBe(events[i - 1].event_id);
    }
    expect((events.at(-1) as FieldEvent).value).toBe("$140,000.00");
  });

  it("gives every event a unique event_id, even across rapid successive actions", () => {
    const { result } = setup();
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$130,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));
    act(() => result.current.unlockField(WAGES_FIELD_ID));
    act(() => result.current.updateValue(WAGES_FIELD_ID, "$140,000.00"));
    act(() => result.current.lockField(WAGES_FIELD_ID));

    const ids = getField(result, WAGES_FIELD_ID).event_history.map((e) => e.event_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// --- Pure-function edge cases, exercised against hand-built fixtures so
// history/field shapes that the reducer would never itself produce (e.g. an
// UPDATED event with a value identical to its predecessor) can still be
// checked against the documented contract.

function makeEvent(overrides: Partial<FieldEvent> & Pick<FieldEvent, "type">): FieldEvent {
  return {
    event_id: `evt_${Math.random().toString(36).slice(2, 8)}`,
    parent_id: null,
    value: "x",
    user_id: "system_ai_v2.4",
    timestamp: "2026-07-23T09:42:00Z",
    ...overrides,
  };
}

function makeField(overrides: {
  field_id?: string;
  client_id?: string;
  status?: FieldStatus;
  events?: FieldEvent[];
}): TaxField {
  const events = overrides.events ?? [makeEvent({ type: "AI_EXTRACTED" })];
  return {
    field_id: overrides.field_id ?? "f1",
    client_id: overrides.client_id ?? "client_a",
    label: "Test field",
    ai_ground_truth: {
      value: "x",
      confidence: 0.9,
      model: "test-model",
      extracted_at: "2026-07-23T09:42:00Z",
      doc_source: { doc_id: "doc_1", doc_name: "doc.pdf", page: 1, bbox: { x: 0, y: 0, width: 1, height: 1 } },
    },
    current_state: { value: "x", status: overrides.status ?? "ai_extracted" },
    event_history: events,
  };
}

describe("mutationCount", () => {
  it("is 0 for a field with no history at all", () => {
    expect(mutationCount(makeField({ events: [] }))).toBe(0);
  });

  it("is 0 for a fresh AI_EXTRACTED-only field", () => {
    expect(mutationCount(makeField({}))).toBe(0);
  });

  it("counts a single UPDATED event", () => {
    const field = makeField({ events: [makeEvent({ type: "AI_EXTRACTED" }), makeEvent({ type: "UPDATED" })] });
    expect(mutationCount(field)).toBe(1);
  });

  it("ignores LOCKED and UNLOCKED events", () => {
    const field = makeField({
      events: [
        makeEvent({ type: "AI_EXTRACTED" }),
        makeEvent({ type: "LOCKED" }),
        makeEvent({ type: "UNLOCKED" }),
        makeEvent({ type: "LOCKED" }),
      ],
    });
    expect(mutationCount(field)).toBe(0);
  });

  it("counts every UPDATED event, even repeated ones with the same value", () => {
    const field = makeField({
      events: [
        makeEvent({ type: "AI_EXTRACTED" }),
        makeEvent({ type: "UPDATED", value: "same" }),
        makeEvent({ type: "LOCKED" }),
        makeEvent({ type: "UNLOCKED" }),
        makeEvent({ type: "UPDATED", value: "same" }),
      ],
    });
    expect(mutationCount(field)).toBe(2);
  });
});

describe("isClientReviewed", () => {
  const client: ClientMeta = {
    client_id: "client_a",
    display_name: "Client A",
    documents: [{ doc_id: "doc_1", doc_name: "doc.pdf", tab_label: "Doc.pdf", kind: "facsimile" }],
  };

  it("is false for a client with no documents, regardless of field state", () => {
    const noDocsClient: ClientMeta = { ...client, documents: [] };
    const fields = [makeField({ client_id: "client_a", status: "locked" })];
    expect(isClientReviewed(noDocsClient, fields)).toBe(false);
  });

  it("is false when the client has documents but no fields exist yet", () => {
    expect(isClientReviewed(client, [])).toBe(false);
  });

  it("is false when the client's fields exist for other clients only", () => {
    const fields = [makeField({ client_id: "client_b", status: "locked" })];
    expect(isClientReviewed(client, fields)).toBe(false);
  });

  it("is true when every one of the client's fields is locked", () => {
    const fields = [
      makeField({ field_id: "f1", client_id: "client_a", status: "locked" }),
      makeField({ field_id: "f2", client_id: "client_a", status: "locked" }),
    ];
    expect(isClientReviewed(client, fields)).toBe(true);
  });

  it("is false when at least one of the client's fields isn't locked", () => {
    const fields = [
      makeField({ field_id: "f1", client_id: "client_a", status: "locked" }),
      makeField({ field_id: "f2", client_id: "client_a", status: "user_modified" }),
    ];
    expect(isClientReviewed(client, fields)).toBe(false);
  });

  it("ignores other clients' unlocked fields when deciding this client is reviewed", () => {
    const fields = [
      makeField({ field_id: "f1", client_id: "client_a", status: "locked" }),
      makeField({ field_id: "f2", client_id: "client_b", status: "ai_extracted" }),
    ];
    expect(isClientReviewed(client, fields)).toBe(true);
  });
});

describe("submitTaxCalculation", () => {
  const JOHN_DOE = "client_john_doe";
  const totals: CalculatedField[] = [
    {
      calc_id: "calc_total_income",
      label: "Total Income",
      value: 127900,
      formattedValue: "$127,900.00",
      formula: "Wages + Rents + Other income",
      expression: "$125,000.00 + $2,400.00 + $500.00 = $127,900.00",
      lineage: [],
    },
  ];

  it("records nothing for a client until a calculation is submitted", () => {
    const { result } = setup();
    expect(result.current.taxSubmissions[JOHN_DOE]).toBeUndefined();
  });

  it("stores a submission carrying the scheme identifier, totals, and current user", () => {
    const { result } = setup();
    act(() => result.current.submitTaxCalculation(JOHN_DOE, totals));

    const submission = result.current.taxSubmissions[JOHN_DOE];
    expect(submission).toBeDefined();
    expect(submission.client_id).toBe(JOHN_DOE);
    expect(submission.scheme_id).toBe(TAX_SCHEME.id);
    expect(submission.scheme_name).toBe(TAX_SCHEME.name);
    expect(submission.user_id).toBe(CURRENT_USER.id);
    expect(submission.user_display_name).toBe(CURRENT_USER.displayName);
    expect(submission.totals).toEqual([
      {
        calc_id: "calc_total_income",
        label: "Total Income",
        formattedValue: "$127,900.00",
        formula: "Wages + Rents + Other income",
        expression: "$125,000.00 + $2,400.00 + $500.00 = $127,900.00",
      },
    ]);
  });

  it("overwrites the previous submission for the same client rather than accumulating", () => {
    const { result } = setup();
    act(() => result.current.submitTaxCalculation(JOHN_DOE, totals));
    const firstId = result.current.taxSubmissions[JOHN_DOE].submission_id;

    act(() =>
      result.current.submitTaxCalculation(JOHN_DOE, [{ ...totals[0], formattedValue: "$200,000.00", value: 200000 }]),
    );

    expect(result.current.taxSubmissions[JOHN_DOE].submission_id).not.toBe(firstId);
    expect(result.current.taxSubmissions[JOHN_DOE].totals[0].formattedValue).toBe("$200,000.00");
  });

  it("keeps submissions for different clients independent", () => {
    const { result } = setup();
    act(() => result.current.submitTaxCalculation(JOHN_DOE, totals));

    expect(result.current.taxSubmissions["client_acme_rentals"]).toBeUndefined();
    expect(result.current.taxSubmissions[JOHN_DOE]).toBeDefined();
  });
});
