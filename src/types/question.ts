import type { QuestionType } from "@prisma/client";

export type ChoiceOption = {
  id: string;
  label: string;
  content: unknown;
};

export type ChoicePayload = {
  options: ChoiceOption[];
};

export type TrueFalsePayload = Record<string, never>;

export type FillBlankMeta = {
  blanks: Array<{
    id: string;
    widthCh?: number;
    acceptedAnswers: string[];
    caseSensitive: boolean;
    points: number;
  }>;
};

export type MatchingSlotsPayload = {
  slots: Array<{ id: string; label: string }>;
  items: Array<{ id: string; text: string }>;
};

export type ScoringAllOrNothing = { mode: "all_or_nothing"; maxPoints: number };
export type ScoringPerPart = { mode: "per_part"; maxPoints: number };
export type ScoringMultipleChoice = {
  mode: "multiple_choice";
  maxPoints: number;
  pointsPerCorrect: number;
  penaltyPerWrong: number;
  floorAtZero: boolean;
};

export type QuestionScoring =
  | ScoringAllOrNothing
  | ScoringPerPart
  | ScoringMultipleChoice;

export type QuestionSnapshot = {
  title: string;
  type: QuestionType;
  stem: unknown;
  payload: unknown;
  answerKey: unknown;
  scoring: QuestionScoring;
  maxPoints: number;
  /** Shuffled option ids for this attempt. Absent on the teacher paper. */
  optionOrder?: string[];
  /** Same dropdown order for every blank in this matching question, unique per attempt. */
  matchingOrder?: string[];
};

export type StudentChoiceResponse = { selectedIds: string[] };
export type StudentTrueFalseResponse = { value: boolean | null };
export type StudentFillResponse = { blanks: Record<string, string> };
export type StudentMatchingResponse = { slots: Record<string, string | null> };

export type StudentResponse =
  | StudentChoiceResponse
  | StudentTrueFalseResponse
  | StudentFillResponse
  | StudentMatchingResponse;
