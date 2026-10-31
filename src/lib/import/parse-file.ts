import mammoth from "mammoth";
import { parseCsvImport } from "@/lib/import/parse-csv";
import { parseJsonImport } from "@/lib/import/parse-json";
import { parseDocxPlainText } from "@/lib/import/parse-docx";
import { extractPdfText } from "@/lib/import/extract-pdf-text";
import { extractPdfTextWithAnswerMarkers } from "@/lib/import/pdf-color-text";
import { parsePdfColoredText } from "@/lib/import/parse-pdf-colored";
import { parsePdfText } from "@/lib/import/parse-pdf";
import type { ImportDraft } from "@/lib/import/types";

export async function parseQuestionImportFile(
  buffer: Buffer,
  fileName: string,
): Promise<ImportDraft[]> {
  const lower = fileName.toLowerCase();
  const text = buffer.toString("utf-8");

  if (lower.endsWith(".json")) {
    return parseJsonImport(text);
  }
  if (lower.endsWith(".csv")) {
    return parseCsvImport(text);
  }
  if (lower.endsWith(".txt")) {
    return parseDocxPlainText(text);
  }
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return parseDocxPlainText(result.value);
  }
  if (lower.endsWith(".pdf")) {
    const marked = await extractPdfTextWithAnswerMarkers(buffer);
    const fromRed = parsePdfColoredText(marked.text, marked.images, marked.pools);
    if (fromRed.length > 0) return fromRed;
    const pdfText = await extractPdfText(buffer);
    return parsePdfText(pdfText);
  }

  throw new Error("Unsupported file type. Use .json, .csv, .docx, .pdf, or .txt");
}
