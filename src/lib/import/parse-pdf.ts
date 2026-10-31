import { parseDocxPlainText } from "@/lib/import/parse-docx";
import type { ImportDraft } from "@/lib/import/types";

export function parsePdfText(text: string): ImportDraft[] {
  const cleaned = text
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return parseDocxPlainText(cleaned);
}
