import type { AnswerCompletion, QuestionType } from "@prisma/client";
import type {
  FillBlankMeta,
  MatchingSlotsPayload,
  QuestionSnapshot,
  StudentResponse,
} from "@/types/question";

export function computeCompletion(
  snapshot: QuestionSnapshot,
  response: StudentResponse | null | undefined,
): AnswerCompletion {
  if (!response) return "EMPTY";

  switch (snapshot.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const r = response as { selectedIds?: string[] };
      const count = r.selectedIds?.length ?? 0;
      if (count === 0) return "EMPTY";
      return "COMPLETE";
    }
    case "TRUE_FALSE": {
      const r = response as { value?: boolean | null };
      if (r.value === null || r.value === undefined) return "EMPTY";
      return "COMPLETE";
    }
    case "FILL_BLANK": {
      const meta = snapshot.payload as FillBlankMeta;
      const r = response as { blanks?: Record<string, string> };
      const blanks = meta.blanks ?? [];
      if (blanks.length === 0) return "EMPTY";
      let filled = 0;
      for (const b of blanks) {
        const v = (r.blanks?.[b.id] ?? "").trim();
        if (v.length > 0) filled++;
      }
      if (filled === 0) return "EMPTY";
      if (filled < blanks.length) return "PARTIAL";
      return "COMPLETE";
    }
    case "MATCHING_SLOTS": {
      const payload = snapshot.payload as MatchingSlotsPayload;
      const r = response as { slots?: Record<string, string | null> };
      const slots = payload.slots ?? [];
      if (slots.length === 0) return "EMPTY";
      let filled = 0;
      for (const s of slots) {
        if (r.slots?.[s.id]) filled++;
      }
      if (filled === 0) return "EMPTY";
      if (filled < slots.length) return "PARTIAL";
      return "COMPLETE";
    }
    default:
      return "EMPTY";
  }
}

export function emptyResponse(type: QuestionType): StudentResponse {
  switch (type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE":
      return { selectedIds: [] };
    case "TRUE_FALSE":
      return { value: null };
    case "FILL_BLANK":
      return { blanks: {} };
    case "MATCHING_SLOTS":
      return { slots: {} };
    default:
      return { selectedIds: [] };
  }
}
