import { describe, expect, it } from "vitest";
import { applyMatchingOrder, applyShuffleOptions, presentChoiceOptions, presentMatchingItems } from "@/lib/snapshot-attempt";
import type { QuestionSnapshot } from "@/types/question";

function snapshot(): QuestionSnapshot {
  return {
    title: "Q",
    type: "SINGLE_CHOICE",
    stem: {},
    payload: {
      options: [
        { id: "a", label: "A", content: "alpha" },
        { id: "b", label: "B", content: "beta" },
        { id: "c", label: "C", content: "gamma" },
        { id: "d", label: "D", content: "delta" },
      ],
    },
    answerKey: { correctOptionId: "d" },
    scoring: { mode: "all_or_nothing", maxPoints: 1 },
    maxPoints: 1,
  };
}

describe("option shuffle presentation", () => {
  it("keeps teacher order and shuffles only the display id list", () => {
    const shuffled = applyShuffleOptions(snapshot());
    const stored = (shuffled.payload as { options: Array<{ id: string }> }).options.map((o) => o.id);
    expect(stored).toEqual(["a", "b", "c", "d"]);
    expect(shuffled.optionOrder).toHaveLength(4);
    expect(new Set(shuffled.optionOrder)).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("shows A–D top to bottom during the attempt and the teacher paper on review", () => {
    const paper = snapshot();
    paper.optionOrder = ["d", "b", "a", "c"];
    const attempt = presentChoiceOptions(paper, "attempt");
    expect(attempt.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(attempt.map((o) => o.id)).toEqual(["d", "b", "a", "c"]);
    const review = presentChoiceOptions(paper, "review");
    expect(review.map((o) => `${o.label}:${o.id}`)).toEqual(["A:a", "B:b", "C:c", "D:d"]);
  });

  it("uses one shuffled dropdown order for a matching question", () => {
    const paper: QuestionSnapshot = {
      title: "Match",
      type: "MATCHING_SLOTS",
      stem: {},
      payload: {
        slots: [
          { id: "s1", label: "1" },
          { id: "s2", label: "2" },
        ],
        items: [
          { id: "i1", text: "PANs" },
          { id: "i2", text: "LANs" },
          { id: "i3", text: "MANs" },
        ],
      },
      answerKey: { slots: { s1: "i1", s2: "i2" } },
      scoring: { mode: "per_part", maxPoints: 2 },
      maxPoints: 2,
    };
    const attempt = applyMatchingOrder(paper);
    expect(attempt.matchingOrder).toHaveLength(3);
    expect(new Set(attempt.matchingOrder)).toEqual(new Set(["i1", "i2", "i3"]));
    attempt.matchingOrder = ["i3", "i1", "i2"];
    expect(presentMatchingItems(attempt, "attempt").map((item) => item.text)).toEqual([
      "MANs",
      "PANs",
      "LANs",
    ]);
    expect(presentMatchingItems(attempt, "review").map((item) => item.text)).toEqual([
      "PANs",
      "LANs",
      "MANs",
    ]);
  });
});
