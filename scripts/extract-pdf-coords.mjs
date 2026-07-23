// One-off utility: dumps text items with normalized (0-100 percent) bounding boxes
// for a given page of the W-2 PDF so we can hand-map real coordinates into the
// mock dataset. Not part of the app runtime.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFile } from "node:fs/promises";

const pageNum = Number(process.argv[2] ?? 5);
const pdfPath = new URL("../public/documents/fw2.pdf", import.meta.url);
const data = await readFile(pdfPath);

const doc = await getDocument({ data: new Uint8Array(data) }).promise;
console.log(`Total pages: ${doc.numPages}`);

const page = await doc.getPage(pageNum);
const viewport = page.getViewport({ scale: 1 });
const { width, height } = viewport;
console.log(`Page ${pageNum} size: ${width} x ${height}`);

const content = await page.getTextContent();
for (const item of content.items) {
  if (!("str" in item) || !item.str.trim()) continue;
  const [a, b, c, d, e, f] = item.transform;
  const x = e;
  const y = height - f - item.height;
  const w = item.width;
  const h = item.height;
  const xPct = (x / width) * 100;
  const yPct = (y / height) * 100;
  const wPct = (w / width) * 100;
  const hPct = (h / height) * 100;
  console.log(
    `${xPct.toFixed(2)}\t${yPct.toFixed(2)}\t${wPct.toFixed(2)}\t${hPct.toFixed(2)}\t"${item.str}"`,
  );
}
