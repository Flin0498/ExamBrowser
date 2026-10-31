import type { QuestionType } from "@prisma/client";
import type {
  FillBlankMeta,
  MatchingSlotsPayload,
  QuestionScoring,
  QuestionSnapshot,
  StudentResponse,
} from "@/types/question";

export type GradeResult = {
  score: number;
  maxPoints: number;
  partScores: number[];
  correct: boolean;
};

function normalizeAnswer(s: string, caseSensitive: boolean): string {
  const t = s.trim();
  return caseSensitive ? t : t.toLowerCase();
}

export function gradeAnswer(
  snapshot: QuestionSnapshot,
  response: StudentResponse | null | undefined,
): GradeResult {
  const maxPoints = snapshot.maxPoints;
  const scoring = snapshot.scoring as QuestionScoring;
  const empty: GradeResult = {
    score: 0,
    maxPoints,
    partScores: [],
    correct: false,
  };
  if (!response) return empty;

  switch (snapshot.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      return gradeSingle(snapshot.type, snapshot.answerKey, response, scoring, maxPoints);
    case "MULTIPLE_CHOICE":
      return gradeMultiple(snapshot.answerKey, response, scoring, maxPoints);
    case "FILL_BLANK":
      return gradeFill(snapshot.payload as FillBlankMeta, snapshot.answerKey, response, scoring, maxPoints);
    case "MATCHING_SLOTS":
      return gradeMatching(
        snapshot.payload as MatchingSlotsPayload,
        snapshot.answerKey,
        response,
        scoring,
        maxPoints,
      );
    default:
      return empty;
  }
}

function gradeSingle(
  type: QuestionType,
  answerKey: unknown,
  response: StudentResponse,
  scoring: QuestionScoring,
  maxPoints: number,
): GradeResult {
  let correct = false;
  if (type === "TRUE_FALSE") {
    const key = answerKey as { value: boolean };
    const r = response as { value?: boolean | null };
    correct = r.value === key.value;
  } else {
    const key = answerKey as { correctOptionId: string };
    const r = response as { selectedIds?: string[] };
    correct = r.selectedIds?.[0] === key.correctOptionId;
  }
  const score = correct ? maxPoints : 0;
  return { score, maxPoints, partScores: [score], correct };
}

function gradeMultiple(
  answerKey: unknown,
  response: StudentResponse,
  scoring: QuestionScoring,
  maxPoints: number,
): GradeResult {
  const key = answerKey as { correctOptionIds: string[] };
  const r = response as { selectedIds?: string[] };
  const selected = new Set(r.selectedIds ?? []);
  const correctSet = new Set(key.correctOptionIds);

  if (scoring.mode === "multiple_choice") {
    let score = 0;
    for (const id of selected) {
      if (correctSet.has(id)) score += scoring.pointsPerCorrect;
      else score -= scoring.penaltyPerWrong;
    }
    if (scoring.floorAtZero) score = Math.max(0, score);
    score = Math.min(score, maxPoints);
    const correct =
      selected.size === correctSet.size &&
      [...selected].every((id) => correctSet.has(id));
    return { score, maxPoints, partScores: [score], correct };
  }

  const correct =
    selected.size === correctSet.size &&
    [...selected].every((id) => correctSet.has(id));
  const score = correct ? maxPoints : 0;
  return { score, maxPoints, partScores: [score], correct };
}

function gradeFill(
  meta: FillBlankMeta,
  answerKey: unknown,
  response: StudentResponse,
  scoring: QuestionScoring,
  maxPoints: number,
): GradeResult {
  const key = answerKey as { blanks: Record<string, string[]> };
  const r = response as { blanks?: Record<string, string> };
  const partScores: number[] = [];
  let correctCount = 0;

  for (const blank of meta.blanks) {
    const raw = (r.blanks?.[blank.id] ?? "").trim();
    const accepted = key.blanks?.[blank.id] ?? blank.acceptedAnswers;
    const ok = accepted.some(
      (a) =>
        normalizeAnswer(a, blank.caseSensitive) ===
        normalizeAnswer(raw, blank.caseSensitive),
    );
    let pts = 0;
    if (ok) {
      correctCount++;
      if (scoring.mode === "per_part") pts = blank.points;
    }
    partScores.push(pts);
  }

  let score: number;
  let correct: boolean;
  if (scoring.mode === "per_part") {
    score = partScores.reduce((a, b) => a + b, 0);
    correct = correctCount === meta.blanks.length;
  } else {
    correct = correctCount === meta.blanks.length;
    score = correct ? maxPoints : 0;
    partScores.fill(score / Math.max(meta.blanks.length, 1));
  }

  return { score, maxPoints, partScores, correct };
}

function gradeMatching(
  payload: MatchingSlotsPayload,
  answerKey: unknown,
  response: StudentResponse,
  scoring: QuestionScoring,
  maxPoints: number,
): GradeResult {
  const key = answerKey as { slots: Record<string, string> };
  const r = response as { slots?: Record<string, string | null> };
  const partScores: number[] = [];
  let correctCount = 0;
  const perSlot =
    scoring.mode === "per_part"
      ? maxPoints / Math.max(payload.slots.length, 1)
      : 0;

  for (const slot of payload.slots) {
    const studentItem = r.slots?.[slot.id] ?? null;
    const expected = key.slots[slot.id];
    const ok = studentItem === expected;
    if (ok) correctCount++;
    const pts = scoring.mode === "per_part" ? (ok ? perSlot : 0) : 0;
    partScores.push(pts);
  }

  let score: number;
  let correct: boolean;
  if (scoring.mode === "per_part") {
    score = partScores.reduce((a, b) => a + b, 0);
    correct = correctCount === payload.slots.length;
  } else {
    correct = correctCount === payload.slots.length;
    score = correct ? maxPoints : 0;
  }

  return { score, maxPoints, partScores, correct };
}

export function gradeAttemptQuestions(
  questions: Array<{ snapshot: QuestionSnapshot; response: StudentResponse | null }>,
): { totalScore: number; maxScore: number; results: GradeResult[] } {
  const results = questions.map((q) => gradeAnswer(q.snapshot, q.response));
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = results.reduce((s, r) => s + r.maxPoints, 0);
  return { totalScore, maxScore, results };
}
