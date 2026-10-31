import { describe, expect, it } from "vitest";
import {
  formatCorrectAnswerLabel,
  formatStudentResponseLabel,
} from "@/lib/correct-answer-label";
import type { QuestionSnapshot } from "@/types/question";

const multi: QuestionSnapshot = {
  title: "Pick",
  type: "MULTIPLE_CHOICE",
  stem: {},
  payload: {
    options: [
      { id: "a", label: "A", content: {} },
      { id: "b", label: "B", content: {} },
      { id: "c", label: "C", content: {} },
    ],
  },
  answerKey: { correctOptionIds: ["a", "c"] },
  scoring: { mode: "all_or_nothing", maxPoints: 1 },
  maxPoints: 1,
};

const fill: QuestionSnapshot = {
  title: "Fill",
  type: "FILL_BLANK",
  stem: {},
  payload: {
    blanks: [
      { id: "b1", acceptedAnswers: ["6"], caseSensitive: false, points: 1 },
      { id: "b2", acceptedAnswers: ["12"], caseSensitive: false, points: 1 },
    ],
  },
  answerKey: { blanks: { b1: ["6"], b2: ["12"] } },
  scoring: { mode: "per_part", maxPoints: 2 },
  maxPoints: 2,
};

describe("formatCorrectAnswerLabel", () => {
  it("lists multiple-choice letters", () => {
    expect(formatCorrectAnswerLabel(multi)).toBe("A, C");
  });

  it("lists every fill-in blank", () => {
    expect(formatCorrectAnswerLabel(fill)).toBe("Blank 1: 6; Blank 2: 12");
  });
});

describe("formatStudentResponseLabel", () => {
  it("shows selected letters", () => {
    expect(formatStudentResponseLabel(multi, { selectedIds: ["b", "c"] })).toBe("B, C");
  });

  it("shows filled blanks", () => {
    expect(formatStudentResponseLabel(fill, { blanks: { b1: "6", b2: "11" } })).toBe(
      "Blank 1: 6; Blank 2: 11",
    );
  });
});
