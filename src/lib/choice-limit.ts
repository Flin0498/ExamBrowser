const ANSWER_COUNT = /\((\d+)\s*Answers?\)/i;

function collectText(node: unknown, out: string[]) {
  if (!node || typeof node !== "object") return;
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === "string") out.push(n.text);
  if (Array.isArray(n.content)) n.content.forEach((c) => collectText(c, out));
}

export function stemPlainText(stem: unknown): string {
  const parts: string[] = [];
  collectText(stem, parts);
  return parts.join(" ");
}

export function parseAnswerCountNote(text: string): number | null {
  const m = text.match(ANSWER_COUNT);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Max options a student may pick on a multiple-choice item. */
export function maxMultipleChoiceSelections(snapshot: {
  type: string;
  title?: string;
  stem?: unknown;
  answerKey?: unknown;
}): number | null {
  if (snapshot.type !== "MULTIPLE_CHOICE") return null;
  const fromNote = parseAnswerCountNote(
    `${snapshot.title ?? ""} ${stemPlainText(snapshot.stem)}`,
  );
  if (fromNote) return fromNote;
  const ids = (snapshot.answerKey as { correctOptionIds?: string[] } | undefined)
    ?.correctOptionIds;
  if (Array.isArray(ids) && ids.length > 0) return ids.length;
  return null;
}

export function clampChoiceSelection(selectedIds: string[], max: number | null): string[] {
  if (max == null || selectedIds.length <= max) return selectedIds;
  return selectedIds.slice(0, max);
}
