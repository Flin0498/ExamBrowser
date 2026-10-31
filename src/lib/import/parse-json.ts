import type { QuestionType } from "@prisma/client";
import type { ImportDraft } from "@/lib/import/types";
import { textToStemDoc } from "@/lib/import/stem";

type JsonRow = {
  title?: string;
  type?: QuestionType;
  stem?: unknown;
  stemText?: string;
  payload?: unknown;
  answerKey?: unknown;
  scoring?: unknown;
  courses?: string[];
  courseNames?: string[];
  maxPoints?: number;
};

export function parseJsonImport(raw: string): ImportDraft[] {
  const data = JSON.parse(raw) as { questions?: JsonRow[] } | JsonRow[];
  const rows = Array.isArray(data) ? data : data.questions ?? [];
  const drafts: ImportDraft[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;

    const title = row.title || `Imported ${i + 1}`;
    const type = (row.type || "SINGLE_CHOICE") as QuestionType;
    const stem = row.stem ?? (row.stemText ? textToStemDoc(row.stemText) : textToStemDoc(""));
    const maxPoints =
      Number((row.scoring as { maxPoints?: number })?.maxPoints ?? row.maxPoints ?? 1) || 1;
    const scoring =
      (row.scoring as ImportDraft["scoring"]) ?? { mode: "all_or_nothing", maxPoints };
    const courseNames = row.courseNames ?? row.courses ?? [];

    if (!row.payload || !row.answerKey) {
      if (type === "SINGLE_CHOICE" && row.stemText) {
        throw new Error(`JSON item ${i + 1}: missing payload/answerKey for ${type}`);
      }
    }

    drafts.push({
      title,
      type,
      stem,
      payload: row.payload ?? {},
      answerKey: row.answerKey ?? {},
      scoring: { ...scoring, maxPoints: scoring.maxPoints ?? maxPoints },
      courseNames,
    });
  }

  return drafts;
}
