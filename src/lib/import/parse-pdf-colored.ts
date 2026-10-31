import type { QuestionType } from "@prisma/client";
import type { ImportDraft } from "@/lib/import/types";
import { importTitleFromStem, optionTextToContent, spaceAfterPunctuation, textToStemDoc } from "@/lib/import/stem";

const RED_OPEN = "⟦";
const RED_CLOSE = "⟧";

function letterToOptionId(letter: string): string {
  const u = letter.toUpperCase();
  return String.fromCharCode(u.charCodeAt(0) - 65 + 97);
}

/** Drop empty red spans; merge letter + ". …" when PDF splits them. */
function mergeRedMarkers(text: string): string {
  let cur = text.replace(new RegExp(`${RED_OPEN}\\s*${RED_CLOSE}`, "g"), "");
  cur = cur.replace(
    new RegExp(`${RED_OPEN}([A-Ga-g])${RED_CLOSE}\\s*${RED_OPEN}\\s*\\.`, "g"),
    `${RED_OPEN}$1.`,
  );
  return cur;
}

function stripMarkers(text: string): string {
  return text.replaceAll(RED_OPEN, "").replaceAll(RED_CLOSE, "");
}

function extractRedOptionLetters(block: string): string[] {
  const merged = mergeRedMarkers(block);
  const letters: string[] = [];
  const re = new RegExp(`${RED_OPEN}([^${RED_CLOSE}]*)${RED_CLOSE}`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(merged))) {
    const seg = m[1].replace(/\s+/g, " ").trim();
    const opt = seg.match(/^([A-Ga-g])\s*[\.\)、:]/);
    if (opt) {
      letters.push(opt[1].toUpperCase());
      continue;
    }
    if (/^[A-Ga-g]$/.test(seg)) {
      letters.push(seg.toUpperCase());
    }
  }
  return [...new Set(letters)];
}

/** Option label only when the letter is its own token (` a. `), not the end of a word (`determine.`). */
const OPTION_LABEL = /(?:^|[\s⟦])([A-Ga-g])\.(?=\s)/g;

function firstOptionIndex(text: string): number {
  OPTION_LABEL.lastIndex = 0;
  const m = OPTION_LABEL.exec(text);
  if (!m || m.index === undefined) return -1;
  let at = m.index + m[0].lastIndexOf(m[1]);
  if (text[at - 1] === RED_OPEN) at -= 1;
  return at;
}

const IMG_MARK = /\{\{IMG:(\d+)\}\}/g;

function imageIndexesIn(text: string): number[] {
  return [...text.matchAll(IMG_MARK)].map((m) => Number(m[1]));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Box labels are also painted later in the PDF and get stuck onto the next question. */
function stripPoolEchoes(text: string, pools: Record<number, string[]>): string {
  const phrases = [...new Set(Object.values(pools).flat().map((p) => p.trim()).filter((p) => p.length >= 8))];
  phrases.sort((a, b) => b.length - a.length);
  if (phrases.length === 0) return text;
  const one = phrases.map(escapeRegExp).join("|");
  const run = new RegExp(`(?:\\s(?:${one})){2,}`, "g");
  const longOnes = phrases.filter((p) => p.length >= 18).map(escapeRegExp).join("|");
  const long = longOnes ? new RegExp(`\\s(?:${longOnes})(?=\\s|$)`, "g") : null;

  return text
    .split(new RegExp(`(${RED_OPEN}[^${RED_CLOSE}]*${RED_CLOSE})`))
    .map((part) => {
      if (part.startsWith(RED_OPEN)) return part;
      let out = part.replace(run, " ");
      if (long) out = out.replace(long, " ");
      return out;
    })
    .join("");
}

function stripChrome(text: string): string {
  return text
    .replace(/2509\s*CS370\s*Mid\s*[-–]?\s*回忆版/g, " ")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, " ")
    .replace(/30\s*[-–]\s*40\s*未录制[\s\S]*$/g, " ");
}

function parseOptionsFromBlock(block: string): Array<{ label: string; text: string; imageIndexes: number[] }> {
  const plain = stripMarkers(block).replace(/\s+/g, " ");
  const keepEmpty = plain.includes("{{IMG:");
  const options: Array<{ label: string; text: string; imageIndexes: number[] }> = [];
  const hits: Array<{ label: string; contentAt: number; labelAt: number }> = [];
  OPTION_LABEL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPTION_LABEL.exec(plain))) {
    const labelAt = m.index + m[0].lastIndexOf(m[1]);
    hits.push({
      label: m[1].toUpperCase(),
      labelAt,
      contentAt: labelAt + m[1].length + 1,
    });
  }
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].contentAt;
    const end = i + 1 < hits.length ? hits[i + 1].labelAt : plain.length;
    const raw = plain.slice(start, end);
    const imageIndexes = imageIndexesIn(raw);
    const text = spaceAfterPunctuation(raw.replace(IMG_MARK, " ")).replace(/^[A-Ga-g]\.?\s*$/g, "").trim();
    if (text || imageIndexes.length > 0 || keepEmpty) {
      options.push({ label: hits[i].label, text, imageIndexes });
    }
  }
  const pooled = options.flatMap((o) => o.imageIndexes);
  const bare = options.filter((o) => o.imageIndexes.length === 0).length;
  if (pooled.length > 1 && pooled.length === options.length && bare > 0) {
    options.forEach((o, i) => {
      o.imageIndexes = [pooled[i]];
      o.text = "";
    });
  }
  return options;
}

function detectAnswerCount(stem: string): number | null {
  const m = stem.match(/\((\d+)\s*Answers?\)/i);
  return m ? Number(m[1]) : null;
}

/** Join split red runs (`⟦3⟧⟦1⟧`, `⟦P⟧⟦rotocol⟧`) without gluing two choice options together. */
function mergeFillFragments(text: string): string {
  let cur = mergeRedMarkers(text);
  let prev = "";
  const pair = new RegExp(
    `${RED_OPEN}([^${RED_CLOSE}]*)${RED_CLOSE}\\s*${RED_OPEN}([^${RED_CLOSE}]*)${RED_CLOSE}`,
    "g",
  );
  do {
    prev = cur;
    cur = cur.replace(pair, (all, a: string, b: string) => {
      const left = a.trim();
      const right = b.trim();
      if (/^[A-Ga-g]\./.test(left) || /^[A-Ga-g]\./.test(right)) return all;
      if (/^[A-Ga-g]$/.test(left) && /^\./.test(right)) return all;
      const continuesSplitWord = /[A-Z]$/.test(left) && /^[a-z]/.test(right);
      const gap =
        continuesSplitWord
          ? ""
          : left.length > 1 && right.length > 1 && /[A-Za-z]$/.test(left) && /^[A-Za-z]/.test(right)
            ? " "
            : "";
      return `${RED_OPEN}${a}${gap}${b}${RED_CLOSE}`;
    });
  } while (cur !== prev);
  return cur;
}

/** Turn `⟦a⟧⟦. text⟧` into plain ` a. text ` so choices are not left inside the stem. */
function normalizeSplitOptions(text: string): string {
  let cur = text.replace(new RegExp(`${RED_OPEN}\\s*${RED_CLOSE}`, "g"), " ");
  let prev = "";
  const letterDot = new RegExp(
    `${RED_OPEN}([A-Ga-g])${RED_CLOSE}\\s*${RED_OPEN}\\s*\\.([^${RED_CLOSE}]*)${RED_CLOSE}`,
    "g",
  );
  const letterThenDot = new RegExp(
    `${RED_OPEN}([A-Ga-g])${RED_CLOSE}\\s*${RED_OPEN}\\s*\\.${RED_CLOSE}`,
    "g",
  );
  do {
    prev = cur;
    cur = cur.replace(letterDot, " $1. $2 ");
    cur = cur.replace(letterThenDot, " $1. ");
  } while (cur !== prev);
  cur = cur.replace(new RegExp(`${RED_OPEN}([A-Ga-g])\\.([^${RED_CLOSE}]*)${RED_CLOSE}`, "g"), " $1. $2 ");
  cur = cur.replace(new RegExp(`${RED_OPEN}([^${RED_CLOSE}]*)${RED_CLOSE}`, "g"), "$1");
  return cur.replace(/[ \t]+/g, " ");
}

function parseDashSlots(
  text: string,
): { stem: string; pairs: Array<{ label: string; answer: string }> } | null {
  const merged = mergeFillFragments(text);
  const shortRe =
    /(?<=^|[\s⟧])((?:Layer\s+\d+)|(?<!\d)\d+|[A-Z])\s*[-–:]\s*⟦([^⟧]+)⟧/g;
  const short: Array<{ label: string; answer: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = shortRe.exec(merged))) {
    const answer = m[2].replace(/\s+/g, " ").trim();
    if (!answer) continue;
    short.push({ label: m[1], answer, index: m.index });
  }
  if (short.length >= 2) {
    return {
      stem: spaceAfterPunctuation(stripMarkers(merged.slice(0, short[0].index)).replace(/\s+/g, " ")),
      pairs: short.map(({ label, answer }) => ({
      label: spaceAfterPunctuation(label),
      answer: spaceAfterPunctuation(answer),
    })),
    };
  }

  const longRe = new RegExp(
    `([^${RED_OPEN}${RED_CLOSE}]{2,220}?)\\s*[-–:]\\s*${RED_OPEN}([^${RED_CLOSE}]+)${RED_CLOSE}`,
    "g",
  );
  const long: Array<{ prefix: string; answer: string }> = [];
  while ((m = longRe.exec(merged))) {
    const answer = m[2].replace(/\s+/g, " ").trim();
    if (answer) long.push({ prefix: m[1].replace(/\s+/g, " ").trim(), answer });
  }
  if (long.length < 2) return null;

  let stem = "";
  const pairs = long.map((pair, i) => {
    if (i === 0) {
      const split = pair.prefix.match(/^(.*?\?)\s+(.+)$/) ?? pair.prefix.match(/^(.+?\.)\s+(.{12,})$/);
      if (split) {
        stem = spaceAfterPunctuation(split[1]);
        return { label: spaceAfterPunctuation(split[2]), answer: spaceAfterPunctuation(pair.answer) };
      }
    }
    return {
      label: spaceAfterPunctuation(pair.prefix),
      answer: spaceAfterPunctuation(pair.answer),
    };
  });
  return { stem, pairs };
}

function uniqueTexts(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const text = spaceAfterPunctuation(value).trim();
    if (!text) continue;
    if (out.some((existing) => existing.toLowerCase() === text.toLowerCase())) continue;
    out.push(text);
  }
  return out;
}

function matchingDraft(
  block: string,
  index: number,
  pools: Record<number, string[]>,
): ImportDraft | null {
  const withoutNum = block.replace(/^\d+[\.\)、]\s*/, "");
  const parsed = parseDashSlots(withoutNum);
  if (!parsed) return null;
  const qnum = Number(block.match(/^(\d+)/)?.[1]);
  const texts = uniqueTexts([...(pools[qnum] ?? []), ...parsed.pairs.map((p) => p.answer)]);
  const slots = parsed.pairs.map((p, i) => ({ id: `s${i + 1}`, label: p.label }));
  const items = texts.map((text, i) => ({ id: `i${i + 1}`, text }));
  const key: Record<string, string> = {};
  slots.forEach((s, i) => {
    const answer = spaceAfterPunctuation(parsed.pairs[i].answer).trim().toLowerCase();
    key[s.id] = items.find((item) => item.text.toLowerCase() === answer)?.id ?? items[i].id;
  });
  const stem = parsed.stem || stripMarkers(withoutNum).replace(/\s+/g, " ").trim();
  return {
    title: importTitleFromStem(stem) || `PDF Q${index + 1}`,
    type: "MATCHING_SLOTS",
    stem: textToStemDoc(stem),
    payload: { slots, items },
    answerKey: { slots: key },
    scoring: { mode: "per_part", maxPoints: slots.length },
    courseNames: [],
  };
}

function splitQuestionBlocks(text: string): string[] {
  const re = /(?:^|[\s⟧。])(?<!\d)(\d{1,2})\.\s+(?=[A-Z])/g;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const num = Number(m[1]);
    if (num < 1 || num > 40) continue;
    starts.push(m.index + m[0].lastIndexOf(m[1]));
  }
  return starts.map((start, i) =>
    text.slice(start, i + 1 < starts.length ? starts[i + 1] : text.length).trim(),
  );
}

function fillBlankDraft(block: string, index: number): ImportDraft {
  const withoutNum = block.replace(/^\d+[\.\)、]\s*/, "");
  const merged = mergeFillFragments(withoutNum);
  const pieces = merged.split(new RegExp(`(${RED_OPEN}[^${RED_CLOSE}]*${RED_CLOSE})`));
  const inline: Array<Record<string, unknown>> = [];
  const blanks: Array<{
    id: string;
    widthCh: number;
    acceptedAnswers: string[];
    caseSensitive: boolean;
    points: number;
  }> = [];

  for (const piece of pieces) {
    const red = piece.match(new RegExp(`^${RED_OPEN}([^${RED_CLOSE}]*)${RED_CLOSE}$`));
    if (red) {
      const answer = spaceAfterPunctuation(red[1].replace(/\s+/g, " "));
      if (!answer) continue;
      const id = `b${blanks.length + 1}`;
      const widthCh = Math.min(48, Math.max(4, answer.length + 1));
      blanks.push({
        id,
        widthCh,
        acceptedAnswers: [answer],
        caseSensitive: false,
        points: 1,
      });
      inline.push({
        type: "blank",
        attrs: {
          id,
          widthCh,
          acceptedAnswers: [answer],
          caseSensitive: false,
          points: 1,
        },
      });
    } else {
      const plain = spaceAfterPunctuation(piece.replace(/\s+/g, " "));
      if (plain) inline.push({ type: "text", text: plain });
    }
  }

  if (blanks.length === 0) {
    blanks.push({
      id: "b1",
      widthCh: 12,
      acceptedAnswers: [],
      caseSensitive: false,
      points: 1,
    });
    inline.push({ type: "text", text: " " });
    inline.push({
      type: "blank",
      attrs: {
        id: "b1",
        widthCh: 12,
        acceptedAnswers: [],
        caseSensitive: false,
        points: 1,
      },
    });
  }

  const plainStem = spaceAfterPunctuation(stripMarkers(withoutNum).replace(/\s+/g, " "));
  const key: Record<string, string[]> = {};
  for (const b of blanks) key[b.id] = b.acceptedAnswers;

  return {
    title: importTitleFromStem(plainStem) || `PDF Q${index + 1}`,
    type: "FILL_BLANK",
    stem: { type: "doc", content: [{ type: "paragraph", content: inline }] },
    payload: { blanks },
    answerKey: { blanks: key },
    scoring: { mode: "per_part", maxPoints: blanks.length },
    courseNames: [],
  };
}

/**
 * Parse PDF text that marks correct choices with ⟦red⟧ wrappers (see pdf-color-text).
 */
export function parsePdfColoredText(
  text: string,
  images: string[] = [],
  pools: Record<number, string[]> = {},
): ImportDraft[] {
  if (!text.includes(RED_OPEN)) return [];

  const cleaned = stripPoolEchoes(stripChrome(text), pools)
    .replace(/\f/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const blocks = splitQuestionBlocks(cleaned);

  const drafts: ImportDraft[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const withoutNum = block.replace(/^\d+[\.\)、]\s*/, "");
    const normalized = normalizeSplitOptions(withoutNum);
    const optionAt = firstOptionIndex(normalized);
    const options =
      optionAt < 0 ? [] : parseOptionsFromBlock(normalized.slice(optionAt));
    if (options.length < 2) {
      drafts.push(matchingDraft(block, i, pools) ?? fillBlankDraft(block, i));
      continue;
    }

    if (/未录制|30\s*[-–]\s*40/.test(normalized)) continue;

    const stemRaw = normalized.slice(0, optionAt).trim();
    const redLetters = extractRedOptionLetters(withoutNum);
    const answerCount = detectAnswerCount(stemRaw);
    const multi =
      redLetters.length > 1 ||
      (answerCount !== null && answerCount > 1) ||
      /\(\d+\s*Answers?\)/i.test(stemRaw);

    const type: QuestionType = multi ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE";
    const opts = options.map((o, oi) => ({
      id: letterToOptionId(o.label) || String.fromCharCode(97 + oi),
      label: o.label,
      content: optionTextToContent(
        o.text,
        o.imageIndexes.map((n) => images[n]).filter(Boolean),
      ),
    }));

    const stemForDisplay = spaceAfterPunctuation(stripMarkers(stemRaw));

    let answerKey: unknown;
    let scoring: ImportDraft["scoring"];

    if (type === "SINGLE_CHOICE") {
      const letter = redLetters[0] || options[0]?.label || "A";
      answerKey = { correctOptionId: letterToOptionId(letter) };
      scoring = { mode: "all_or_nothing", maxPoints: 1 };
    } else {
      const ids =
        redLetters.length > 0
          ? redLetters.map(letterToOptionId)
          : [letterToOptionId(options[0]?.label || "A")];
      const maxPoints = answerCount ?? ids.length;
      answerKey = { correctOptionIds: ids };
      scoring = {
        mode: "multiple_choice",
        maxPoints,
        pointsPerCorrect: 1,
        penaltyPerWrong: 0,
        floorAtZero: true,
      };
    }

    drafts.push({
      title: importTitleFromStem(stemForDisplay) || `PDF Q${i + 1}`,
      type,
      stem: textToStemDoc(stemForDisplay),
      payload: { options: opts },
      answerKey,
      scoring,
      courseNames: [],
    });
  }

  return drafts;
}
