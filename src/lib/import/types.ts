import type { QuestionType } from "@prisma/client";

export type ImportDraft = {
  title: string;
  type: QuestionType;
  stem: unknown;
  payload: unknown;
  answerKey: unknown;
  scoring: { mode: string; maxPoints: number; [key: string]: unknown };
  courseNames: string[];
};

export type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};
