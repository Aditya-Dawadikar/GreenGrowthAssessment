# AI Tax Platform — Interactive Return Verification Workspace

A high-density, single-page workspace for CPAs to verify AI-extracted tax
return data against its source documents. Built as a greenfield case-study
prototype with zero backend dependency: all extraction, confidence scoring,
and mutation history is driven by a client-side event-sourcing model over a
hardcoded dataset.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What this demonstrates

- **Source document traceability** — selecting an extracted field scrolls
  the source PDF to the right page and highlights the exact bounding box it
  was read from.
- **Trustworthy AI signals** — every AI-extracted value is color-coded by
  confidence (green/amber/rose) and backed by a provenance popover (model
  version, timestamp, OCR reasoning).
- **Clickable vs. editable** — an immutable AI ground-truth column sits next
  to an editable working-state column, with Lock/Unlock controls and a full
  append-only mutation event ledger per field.

## Tech stack

React + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix primitives),
`react-pdf` for source document rendering, `lucide-react` for icons.

## Data

The mock tax return (fields, AI ground truth, event history) lives at
`src/mocks/taxReturnData.json`. The W-2 source document is a real PDF served
from `public/documents/fw2.pdf`; the 1099-MISC is rendered as an HTML
facsimile since no source PDF was provided for it.
