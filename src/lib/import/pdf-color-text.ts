import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { rgbToPng } from "@/lib/import/rgb-png";
import { poolChoicesFromTokens, type TextToken } from "@/lib/import/pdf-pool-choices";

let workerReady = false;

function ensureWorker() {
  if (workerReady) return;
  const workerFile = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "pdf-parse",
    "esm",
    "pdf.worker.mjs",
  );
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerFile).href;
  workerReady = true;
}

function glyphsToText(glyphs: unknown): string {
  if (!Array.isArray(glyphs)) return "";
  let s = "";
  for (const g of glyphs) {
    if (typeof g === "number") {
      if (g < -100) s += " ";
      continue;
    }
    if (g && typeof g === "object" && "unicode" in g && typeof g.unicode === "string") {
      s += g.unicode;
    }
  }
  return s;
}

function isRedFill(color: string): boolean {
  const c = color.toLowerCase();
  if (c === "#ff0000" || c === "#f00") return true;
  if (c.startsWith("#") && c.length === 7) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return r >= 200 && g < 80 && b < 80;
  }
  return false;
}

export type PdfExtract = {
  text: string;
  /** Parallel to {{IMG:n}} markers in text. Values are public URLs. */
  images: string[];
  /** Dropdown choices drawn as boxes under each matching question, keyed by question number. */
  pools: Record<number, string[]>;
};

/** Extract full document text; correct options wrapped in ⟦…⟧ (from red fill color). */
export async function extractPdfTextWithAnswerMarkers(buffer: Buffer): Promise<PdfExtract> {
  ensureWorker();
  const data =
    buffer instanceof Uint8Array && !(buffer instanceof Buffer)
      ? buffer
      : new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data }).promise;
  const OPS = pdfjs.OPS;
  const pages: string[] = [];
  const images: string[] = [];
  const pools: Record<number, string[]> = {};
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const pageTokens: TextToken[] = [];
      for (const item of textContent.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        pageTokens.push({
          x: item.transform[4],
          y: item.transform[5],
          text: item.str,
        });
      }
      const pagePools = poolChoicesFromTokens(pageTokens);
      for (const [num, choices] of Object.entries(pagePools)) {
        pools[Number(num)] = choices;
      }
      const op = await page.getOperatorList();
      let fill = "#000000";
      let out = "";
      for (let i = 0; i < op.fnArray.length; i++) {
        const fn = op.fnArray[i];
        const args = op.argsArray[i];
        if (fn === OPS.setFillRGBColor || fn === OPS.setFillColor) {
          fill = typeof args[0] === "string" ? args[0] : fill;
        } else if (fn === OPS.nextLine) {
          out += "\n";
        } else if (fn === OPS.paintImageXObject) {
          const name = String(args[0]);
          const img = await new Promise<{
            width: number;
            height: number;
            kind: number;
            data: Uint8Array;
          } | null>((resolve) => {
            page.objs.get(name, (value: unknown) => resolve(value as never));
          });
          if (img && img.kind === 2 && img.data) {
            const fileName = `pdf-${Date.now()}-${images.length}.png`;
            await writeFile(path.join(uploadsDir, fileName), rgbToPng(img.width, img.height, img.data));
            out += ` {{IMG:${images.length}}} `;
            images.push(`/uploads/${fileName}`);
          }
        } else if (fn === OPS.showText || fn === OPS.showSpacedText) {
          const glyphs = Array.isArray(args[0]) ? args[0] : [args[0]];
          const t = glyphsToText(glyphs);
          if (!t) continue;
          if (isRedFill(fill)) out += `⟦${t}⟧`;
          else out += t;
        }
      }
      pages.push(out);
    }
  } finally {
    await doc.destroy();
  }

  return { text: pages.join("\n\n"), images, pools };
}
