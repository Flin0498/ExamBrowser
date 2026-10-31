export type TextToken = { x: number; y: number; text: string };

type Line = { y: number; x: number; text: string };

function joinTokens(tokens: TextToken[]): string {
  const sorted = [...tokens].sort((a, b) => a.x - b.x);
  let text = "";
  let end = -999;
  for (const tok of sorted) {
    const piece = tok.text;
    if (!piece) continue;
    const gap = tok.x - end;
    const continuesWord = /[A-Z]$/.test(text) && /^[a-z]/.test(piece) && gap < 14;
    const needsSpace =
      text.length > 0 &&
      !continuesWord &&
      (gap > 1.5 || (/[a-z]$/.test(text) && /^[A-Z]/.test(piece)));
    if (needsSpace) text += " ";
    text += piece;
    end = tok.x + piece.length * 4.2;
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Option boxes drawn under a matching question (not the red answers on the prompt lines). */
export function poolChoicesFromTokens(tokens: TextToken[]): Record<number, string[]> {
  const buckets = new Map<number, TextToken[]>();
  for (const token of tokens) {
    const text = token.text?.trim();
    if (!text) continue;
    const y = Math.round(token.y);
    const list = buckets.get(y) ?? [];
    list.push({ ...token, text });
    buckets.set(y, list);
  }

  const lines: Line[] = [...buckets.entries()].map(([y, toks]) => ({
    y,
    x: Math.min(...toks.map((t) => t.x)),
    text: joinTokens(toks),
  }));

  const questions: Array<{ num: number; y: number }> = [];
  const pools: Array<{ y: number; text: string }> = [];
  for (const line of lines) {
    if (line.y > 782 || line.y < 56) continue;
    const q = line.text.match(/^(\d{1,2})\.\s*[A-Z]/);
    if (q && line.x < 70) {
      const num = Number(q[1]);
      if (num >= 1 && num <= 40) questions.push({ num, y: line.y });
      continue;
    }
    if (line.x >= 60 && line.x <= 80 && line.text.length > 1) {
      pools.push({ y: line.y, text: line.text });
    }
  }

  const out: Record<number, string[]> = {};
  for (const pool of pools) {
    const owner = questions
      .filter((q) => q.y > pool.y)
      .sort((a, b) => a.y - b.y)[0];
    if (!owner) continue;
    const list = out[owner.num] ?? [];
    if (!list.some((s) => s.toLowerCase() === pool.text.toLowerCase())) list.push(pool.text);
    out[owner.num] = list;
  }
  return out;
}
