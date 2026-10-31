import type { QuestionType } from "@prisma/client";
import type { ImportDraft } from "@/lib/import/types";
import { optionTextToContent, textToStemDoc } from "@/lib/import/stem";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function letterToOptionId(letter: string, index: number) {
  const L = letter.trim().toUpperCase();
  if (/^[A-Z]$/.test(L)) return String.fromCharCode(L.charCodeAt(0) - 65 + 97);
  if (/^opt/i.test(letter)) return letter.toLowerCase();
  return `opt_${index}`;
}

export function parseCsvImport(text: string): ImportDraft[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const drafts: ImportDraft[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    if (cols.every((c) => !c)) continue;

    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? cols[i] ?? "" : "";
    };

    const title = get("title") || `Imported Q${li}`;
    const type = (get("type") || "SINGLE_CHOICE") as QuestionType;
    const stemText = get("stem");
    const maxPoints = Number(get("maxpoints") || get("points") || 1) || 1;
    const courses = (get("courses") || get("course") || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
        const labels = ["A", "B", "C", "D", "E", "F"];
        const options: Array<{ id: string; label: string; content: unknown }> = [];
        labels.forEach((label, oi) => {
          const key = `option${label.toLowerCase()}`;
          const altKey = `option${label}`;
          const text =
            get(key) ||
            (idx(altKey) >= 0 ? cols[idx(altKey)] : "") ||
            get(`option${oi + 1}`);
          if (text) {
            const id = letterToOptionId(label, oi);
            options.push({ id, label, content: optionTextToContent(text) });
          }
        });
        const correctRaw = get("correct") || get("answer");
        if (type === "SINGLE_CHOICE") {
          const id = letterToOptionId(correctRaw || "A", 0);
          drafts.push({
            title,
            type,
            stem: textToStemDoc(stemText),
            payload: { options },
            answerKey: { correctOptionId: id },
            scoring: { mode: "all_or_nothing", maxPoints },
            courseNames: courses,
          });
        } else {
          const ids = correctRaw
            .split(/[;,|]/)
            .map((s) => letterToOptionId(s.trim(), 0));
          drafts.push({
            title,
            type,
            stem: textToStemDoc(stemText),
            payload: { options },
            answerKey: { correctOptionIds: ids },
            scoring: {
              mode: "multiple_choice",
              maxPoints,
              pointsPerCorrect: 1,
              penaltyPerWrong: 0,
              floorAtZero: true,
            },
            courseNames: courses,
          });
        }
      } else if (type === "TRUE_FALSE") {
        const ans = (get("correct") || "true").toLowerCase();
        drafts.push({
          title,
          type,
          stem: textToStemDoc(stemText),
          payload: {},
          answerKey: { value: ans === "true" || ans === "t" || ans === "1" },
          scoring: { mode: "all_or_nothing", maxPoints },
          courseNames: courses,
        });
      } else if (type === "FILL_BLANK") {
        const blankId = "b1";
        const answers = (get("correct") || get("answer"))
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        const stem = {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: stemText.replace(/_{3,}/g, "").trim() + " " },
                {
                  type: "blank",
                  attrs: {
                    id: blankId,
                    widthCh: 12,
                    acceptedAnswers: answers,
                    caseSensitive: false,
                    points: maxPoints,
                  },
                },
              ],
            },
          ],
        };
        drafts.push({
          title,
          type,
          stem,
          payload: {
            blanks: [
              {
                id: blankId,
                widthCh: 12,
                acceptedAnswers: answers,
                caseSensitive: false,
                points: maxPoints,
              },
            ],
          },
          answerKey: { blanks: { [blankId]: answers } },
          scoring: { mode: "per_part", maxPoints },
          courseNames: courses,
        });
      }
    } catch (e) {
      throw new Error(`CSV row ${li + 1}: ${e instanceof Error ? e.message : "parse error"}`);
    }
  }

  return drafts;
}
