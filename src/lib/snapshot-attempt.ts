import { shuffleArray } from "@/lib/shuffle";
import type { ChoiceOption, MatchingSlotsPayload, QuestionSnapshot } from "@/types/question";

export function applyShuffleOptions(snapshot: QuestionSnapshot): QuestionSnapshot {
  const s = JSON.parse(JSON.stringify(snapshot)) as QuestionSnapshot;
  if (s.type !== "SINGLE_CHOICE" && s.type !== "MULTIPLE_CHOICE") return s;
  const options = (s.payload as { options?: ChoiceOption[] }).options ?? [];
  if (options.length < 2) return s;
  s.optionOrder = shuffleArray(options.map((o) => o.id));
  return s;
}

/** Attempt view shuffles content under fixed A–D labels. Review keeps the teacher paper. */
export function presentChoiceOptions(
  snapshot: QuestionSnapshot,
  mode: "attempt" | "review",
): ChoiceOption[] {
  const options = [...((snapshot.payload as { options?: ChoiceOption[] }).options ?? [])];
  if (mode === "review" || !snapshot.optionOrder?.length) return options;
  const byId = new Map(options.map((o) => [o.id, o]));
  return snapshot.optionOrder.flatMap((id, i) => {
    const opt = byId.get(id);
    if (!opt) return [];
    return [{ ...opt, label: String.fromCharCode(65 + i) }];
  });
}

export function applyMatchingOrder(snapshot: QuestionSnapshot): QuestionSnapshot {
  const s = JSON.parse(JSON.stringify(snapshot)) as QuestionSnapshot;
  if (s.type !== "MATCHING_SLOTS") return s;
  const items = (s.payload as MatchingSlotsPayload).items ?? [];
  if (items.length < 2) return s;
  s.matchingOrder = shuffleArray(items.map((item) => item.id));
  return s;
}

export function presentMatchingItems(
  snapshot: QuestionSnapshot,
  mode: "attempt" | "review",
): MatchingSlotsPayload["items"] {
  const items = [...((snapshot.payload as MatchingSlotsPayload).items ?? [])];
  if (mode === "review" || !snapshot.matchingOrder?.length) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  return snapshot.matchingOrder.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export function prepareAttemptSnapshot(
  raw: unknown,
  maxPoints: number,
  shuffleOptions: boolean,
): QuestionSnapshot {
  const snap = JSON.parse(JSON.stringify(raw)) as QuestionSnapshot;
  snap.maxPoints = maxPoints;
  const withMatching = applyMatchingOrder(snap);
  if (shuffleOptions) {
    return applyShuffleOptions(withMatching);
  }
  return withMatching;
}
