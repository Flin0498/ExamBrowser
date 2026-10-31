/** e.g. "(3 Answers)" — kept in imported stem and title when present. */
const ANSWER_COUNT_IN_STEM = /\(\d+\s*Answers?\)/i;

/** Put one space after punctuation when the next character is a letter. */
export function spaceAfterPunctuation(text: string): string {
  return text
    .replace(/([.?!;,:，。；：？！])(?=[A-Za-z\u4e00-\u9fff])/g, "$1 ")
    .replace(/([)\]）】])(?=[A-Za-z0-9\u4e00-\u9fff])/g, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function importTitleFromStem(stem: string, maxLen = 120): string {
  const s = stem.trim();
  if (!s) return "";
  if (s.length <= maxLen) return s;

  const note = s.match(ANSWER_COUNT_IN_STEM)?.[0];
  if (!note || s.slice(0, maxLen).includes(note)) {
    return `${s.slice(0, maxLen).trimEnd()}…`;
  }
  const body = s.slice(0, Math.max(1, maxLen - note.length - 1)).trimEnd();
  return `${body} ${note}`;
}

export function textToStemDoc(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    })),
  };
}

export function optionTextToContent(text: string, imageUrls: string[] = []) {
  const clean = text.replace(/^[A-Ga-g]\.?\s*$/g, "").trim();
  const content: Array<Record<string, unknown>> = [];
  if (clean) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: clean }],
    });
  }
  for (const src of imageUrls) {
    content.push({ type: "image", attrs: { src, alt: "" } });
  }
  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }
  return { type: "doc", content };
}
