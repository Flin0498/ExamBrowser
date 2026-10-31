export function extractBlanksFromStem(stem: unknown): Array<{
  id: string;
  widthCh: number;
  acceptedAnswers: string[];
  caseSensitive: boolean;
  points: number;
}> {
  const blanks: Array<{
    id: string;
    widthCh: number;
    acceptedAnswers: string[];
    caseSensitive: boolean;
    points: number;
  }> = [];

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      attrs?: Record<string, unknown>;
      content?: unknown[];
    };
    if (n.type === "blank" && n.attrs?.id) {
      blanks.push({
        id: String(n.attrs.id),
        widthCh: Number(n.attrs.widthCh ?? 8),
        acceptedAnswers: (n.attrs.acceptedAnswers as string[]) ?? [],
        caseSensitive: Boolean(n.attrs.caseSensitive),
        points: Number(n.attrs.points ?? 1),
      });
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }
  walk(stem);
  return blanks;
}
