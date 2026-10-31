import { prisma } from "@/lib/db";
import { parseSnapshot } from "@/lib/snapshot";
import { emptyResponse } from "@/lib/completion";
import type { StudentResponse } from "@/types/question";
import { gradeAnswer } from "@/lib/grading";

export async function loadAttemptForStudent(attemptId: string, studentId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      questions: { orderBy: { sortOrder: "asc" } },
      answers: true,
    },
  });
  if (!attempt || attempt.studentId !== studentId) return null;
  return attempt;
}

export function buildQuestionStates(
  attempt: Awaited<ReturnType<typeof loadAttemptForStudent>> & object,
) {
  return attempt.questions.map((aq) => {
    const snapshot = parseSnapshot(aq.snapshot);
    const answer = attempt.answers.find((a) => a.attemptQuestionId === aq.id);
    return {
      sortOrder: aq.sortOrder,
      snapshot,
      response: (answer?.response ?? emptyResponse(snapshot.type)) as StudentResponse,
      completion: answer?.completion ?? "EMPTY",
    };
  });
}

export function buildGraded(
  attempt: NonNullable<Awaited<ReturnType<typeof loadAttemptForStudent>>>,
) {
  return attempt.questions.map((aq) => {
    const snapshot = parseSnapshot(aq.snapshot);
    snapshot.maxPoints = aq.maxPoints;
    const answer = attempt.answers.find((a) => a.attemptQuestionId === aq.id);
    const response = (answer?.response ?? emptyResponse(snapshot.type)) as StudentResponse;
    const graded = gradeAnswer(snapshot, response);
    return {
      score: answer?.score ?? graded.score,
      maxPoints: aq.maxPoints,
      correct: graded.correct,
    };
  });
}
