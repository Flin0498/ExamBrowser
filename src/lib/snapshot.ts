import type { Question } from "@prisma/client";
import type { QuestionSnapshot } from "@/types/question";

export function questionToSnapshot(
  question: Pick<Question, "title" | "type" | "stem" | "payload" | "answerKey" | "scoring">,
  maxPoints: number,
): QuestionSnapshot {
  return {
    title: question.title,
    type: question.type,
    stem: question.stem,
    payload: question.payload,
    answerKey: question.answerKey,
    scoring: question.scoring as QuestionSnapshot["scoring"],
    maxPoints,
  };
}

export function parseSnapshot(json: unknown): QuestionSnapshot {
  return json as QuestionSnapshot;
}
