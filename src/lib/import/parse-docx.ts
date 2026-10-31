import type { ImportDraft } from "@/lib/import/types";
import { importTitleFromStem, optionTextToContent, spaceAfterPunctuation, textToStemDoc } from "@/lib/import/stem";

/**
 * Heuristic parser for Word-exported plain text:
 * 1. Question stem
 * A. option
 * B. option
 * Answer: B
 */
export function parseDocxPlainText(text: string): ImportDraft[] {
  const blocks = text
    .split(/\n(?=\s*\d+[\.\)、]\s*)/)
    .map((b) => b.trim())
    .filter(Boolean);

  const drafts: ImportDraft[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const first = lines[0].replace(/^\d+[\.\)、]\s*/, "");
    let stemLines = [first];
    const options: Array<{ label: string; text: string }> = [];
    let answerLetter = "";

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];
      const opt = line.match(/^([A-Fa-f])[\.\)、:\]]\s*(.+)$/);
      const ans = line.match(/^(?:答案|Answer|ANSWER)\s*[:：]\s*([A-Fa-f])/i);
      if (ans) {
        answerLetter = ans[1].toUpperCase();
      } else if (opt) {
        options.push({ label: opt[1].toUpperCase(), text: spaceAfterPunctuation(opt[2]) });
      } else if (!/^答案|^Answer/i.test(line)) {
        stemLines.push(line);
      }
    }

    if (options.length === 0) continue;

    const opts = options.map((o, oi) => ({
      id: String.fromCharCode(97 + oi),
      label: o.label,
      content: optionTextToContent(o.text),
    }));
    const correct =
      answerLetter ||
      options[0]?.label ||
      "A";
    const correctId = String.fromCharCode(correct.charCodeAt(0) - 65 + 97);

    const stemText = spaceAfterPunctuation(stemLines.join("\n"));
    drafts.push({
      title: importTitleFromStem(stemText) || `DOCX Q${i + 1}`,
      type: "SINGLE_CHOICE",
      stem: textToStemDoc(stemText),
      payload: { options: opts },
      answerKey: { correctOptionId: correctId },
      scoring: { mode: "all_or_nothing", maxPoints: 1 },
      courseNames: [],
    });
  }

  return drafts;
}
