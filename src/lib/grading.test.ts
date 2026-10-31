import { describe, expect, it } from "vitest";
import { gradeAnswer } from "./grading";
import type { QuestionSnapshot } from "@/types/question";

describe("gradeAnswer", () => {
  it("grades single choice all or nothing", () => {
    const snapshot: QuestionSnapshot = {
      title: "Q1",
      type: "SINGLE_CHOICE",
      stem: {},
      payload: { options: [] },
      answerKey: { correctOptionId: "a" },
      scoring: { mode: "all_or_nothing", maxPoints: 1 },
      maxPoints: 1,
    };
    expect(
      gradeAnswer(snapshot, { selectedIds: ["a"] }).score,
    ).toBe(1);
    expect(
      gradeAnswer(snapshot, { selectedIds: ["b"] }).score,
    ).toBe(0);
  });

  it("grades fill blank per part", () => {
    const snapshot: QuestionSnapshot = {
      title: "Q2",
      type: "FILL_BLANK",
      stem: {},
      payload: {
        blanks: [
          {
            id: "b1",
            acceptedAnswers: ["3"],
            caseSensitive: false,
            points: 0.5,
          },
          {
            id: "b2",
            acceptedAnswers: ["1001"],
            caseSensitive: true,
            points: 0.5,
          },
        ],
      },
      answerKey: { blanks: { b1: ["3"], b2: ["1001"] } },
      scoring: { mode: "per_part", maxPoints: 1 },
      maxPoints: 1,
    };
    const partial = gradeAnswer(snapshot, {
      blanks: { b1: "3", b2: "wrong" },
    });
    expect(partial.score).toBe(0.5);
    const full = gradeAnswer(snapshot, {
      blanks: { b1: "3", b2: "1001" },
    });
    expect(full.score).toBe(1);
  });

  it("grades multiple choice with penalties", () => {
    const snapshot: QuestionSnapshot = {
      title: "Q3",
      type: "MULTIPLE_CHOICE",
      stem: {},
      payload: { options: [] },
      answerKey: { correctOptionIds: ["a", "c"] },
      scoring: {
        mode: "multiple_choice",
        maxPoints: 2,
        pointsPerCorrect: 1,
        penaltyPerWrong: 0.5,
        floorAtZero: true,
      },
      maxPoints: 2,
    };
    const r = gradeAnswer(snapshot, { selectedIds: ["a", "b"] });
    expect(r.score).toBe(0.5);
  });

  it("returns zero for empty response", () => {
    const snapshot: QuestionSnapshot = {
      title: "Q4",
      type: "MATCHING_SLOTS",
      stem: {},
      payload: {
        slots: [{ id: "s1", label: "Layer 1" }],
        items: [{ id: "i1", text: "Physical" }],
      },
      answerKey: { slots: { s1: "i1" } },
      scoring: { mode: "all_or_nothing", maxPoints: 1 },
      maxPoints: 1,
    };
    expect(gradeAnswer(snapshot, { slots: {} }).score).toBe(0);
    expect(
      gradeAnswer(snapshot, { slots: { s1: "i1" } }).score,
    ).toBe(1);
  });
});
