import { describe, expect, it } from "vitest";
import {
  clampChoiceSelection,
  maxMultipleChoiceSelections,
  parseAnswerCountNote,
} from "@/lib/choice-limit";

describe("parseAnswerCountNote", () => {
  it("reads (N Answers) from stem text", () => {
    expect(parseAnswerCountNote("Pick them. (3 Answers)")).toBe(3);
    expect(parseAnswerCountNote("Choose (2 answers)")).toBe(2);
    expect(parseAnswerCountNote("No note")).toBeNull();
  });
});

describe("maxMultipleChoiceSelections", () => {
  it("prefers the (N Answers) note over the key", () => {
    expect(
      maxMultipleChoiceSelections({
        type: "MULTIPLE_CHOICE",
        title: "Which apply? (2 Answers)",
        stem: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Which apply? (2 Answers)" }],
            },
          ],
        },
        answerKey: { correctOptionIds: ["a", "b", "c"] },
      }),
    ).toBe(2);
  });

  it("falls back to correct option count", () => {
    expect(
      maxMultipleChoiceSelections({
        type: "MULTIPLE_CHOICE",
        title: "Pick",
        stem: { type: "doc", content: [] },
        answerKey: { correctOptionIds: ["a", "c"] },
      }),
    ).toBe(2);
  });
});

describe("clampChoiceSelection", () => {
  it("keeps the first N ids", () => {
    expect(clampChoiceSelection(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(clampChoiceSelection(["a"], 2)).toEqual(["a"]);
  });
});
