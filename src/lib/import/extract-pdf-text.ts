import "server-only";

import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

let workerConfigured = false;

function configurePdfWorker() {
  if (workerConfigured) return;
  const workerFile = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "pdf-parse",
    "esm",
    "pdf.worker.mjs",
  );
  PDFParse.setWorker(pathToFileURL(workerFile).href);
  workerConfigured = true;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  configurePdfWorker();
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return textResult.text;
  } finally {
    await parser.destroy();
  }
}
