import type {
  FillBlankMeta,
  MatchingSlotsPayload,
  QuestionSnapshot,
  StudentResponse,
} from "@/types/question";

function choiceLabel(
  options: Array<{ id: string; label: string }> | undefined,
  id: string,
): string {
  return options?.find((o) => o.id === id)?.label ?? id;
}

function fillBlankOrder(snapshot: QuestionSnapshot): string[] {
  const meta = snapshot.payload as FillBlankMeta | undefined;
  if (Array.isArray(meta?.blanks) && meta.blanks.length > 0) {
    return meta.blanks.map((b) => b.id);
  }
  const key = snapshot.answerKey as { blanks?: Record<string, string[]> };
  return Object.keys(key.blanks ?? {});
}

function matchingItemText(
  items: Array<{ id: string; text: string }> | undefined,
  id: string | null | undefined,
): string {
  if (!id) return "—";
  return items?.find((i) => i.id === id)?.text ?? id;
}

export function formatCorrectAnswerLabel(snapshot: QuestionSnapshot): string {
  const key = snapshot.answerKey as Record<string, unknown>;
  const payload = snapshot.payload as Record<string, unknown>;

  switch (snapshot.type) {
    case "SINGLE_CHOICE": {
      const id = key.correctOptionId as string;
      const opts = payload.options as Array<{ id: string; label: string }>;
      return choiceLabel(opts, id);
    }
    case "MULTIPLE_CHOICE": {
      const ids = (key.correctOptionIds as string[]) ?? [];
      const opts = payload.options as Array<{ id: string; label: string }>;
      return ids.map((id) => choiceLabel(opts, id)).join(", ") || "—";
    }
    case "TRUE_FALSE":
      return (key.value as boolean) ? "True" : "False";
    case "FILL_BLANK": {
      const blanks = (key.blanks as Record<string, string[]>) ?? {};
      const ids = fillBlankOrder(snapshot);
      if (ids.length === 0) return "—";
      return ids
        .map((id, i) => {
          const accepted = blanks[id] ?? [];
          const shown = accepted.length ? accepted.join(" / ") : "—";
          return ids.length === 1 ? shown : `Blank ${i + 1}: ${shown}`;
        })
        .join("; ");
    }
    case "MATCHING_SLOTS": {
      const slots = (key.slots as Record<string, string>) ?? {};
      const payloadM = snapshot.payload as MatchingSlotsPayload;
      const items = payloadM.items ?? [];
      const slotDefs = payloadM.slots ?? [];
      if (slotDefs.length === 0) {
        return Object.values(slots)
          .map((itemId) => matchingItemText(items, itemId))
          .join("; ") || "—";
      }
      return slotDefs
        .map((slot) => `${slot.label}: ${matchingItemText(items, slots[slot.id])}`)
        .join("; ");
    }
    default:
      return "—";
  }
}

export function formatStudentResponseLabel(
  snapshot: QuestionSnapshot,
  response: StudentResponse | null | undefined,
): string {
  if (!response) return "No answer";
  const payload = snapshot.payload as Record<string, unknown>;

  switch (snapshot.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const ids = (response as { selectedIds?: string[] }).selectedIds ?? [];
      if (ids.length === 0) return "No answer";
      const opts = payload.options as Array<{ id: string; label: string }>;
      return ids.map((id) => choiceLabel(opts, id)).join(", ");
    }
    case "TRUE_FALSE": {
      const v = (response as { value?: boolean | null }).value;
      if (v === null || v === undefined) return "No answer";
      return v ? "True" : "False";
    }
    case "FILL_BLANK": {
      const values = (response as { blanks?: Record<string, string> }).blanks ?? {};
      const ids = fillBlankOrder(snapshot);
      const keys = ids.length ? ids : Object.keys(values);
      if (keys.length === 0) return "No answer";
      const filled = keys.some((id) => (values[id] ?? "").trim());
      if (!filled) return "No answer";
      return keys
        .map((id, i) => {
          const raw = (values[id] ?? "").trim() || "—";
          return keys.length === 1 ? raw : `Blank ${i + 1}: ${raw}`;
        })
        .join("; ");
    }
    case "MATCHING_SLOTS": {
      const slots = (response as { slots?: Record<string, string | null> }).slots ?? {};
      const payloadM = snapshot.payload as MatchingSlotsPayload;
      const items = payloadM.items ?? [];
      const slotDefs = payloadM.slots ?? [];
      const defs = slotDefs.length ? slotDefs : Object.keys(slots).map((id) => ({ id, label: id }));
      const any = defs.some((s) => slots[s.id]);
      if (!any) return "No answer";
      return defs
        .map((slot) => `${slot.label}: ${matchingItemText(items, slots[slot.id])}`)
        .join("; ");
    }
    default:
      return "—";
  }
}
