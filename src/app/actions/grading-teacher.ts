"use server";

import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSnapshot } from "@/lib/snapshot";
import { gradeAnswer } from "@/lib/grading";
import { emptyResponse } from "@/lib/completion";
import type { StudentResponse } from "@/types/question";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

async function recalcAttemptTotal(attemptId: string) {
  const answers = await prisma.attemptAnswer.findMany({ where: { attemptId } });
  const total = answers.reduce((s, a) => s + a.score, 0);
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { totalScore: total },
  });
}

export async function setManualAnswerScore(
  attemptId: string,
  attemptQuestionId: string,
  score: number,
  examId: string,
) {
  await requireTeacher();
  const aq = await prisma.attemptQuestion.findUnique({
    where: { id: attemptQuestionId },
    include: { answers: true },
  });
  if (!aq || aq.attemptId !== attemptId) throw new Error("Not found");

  const clamped = Math.max(0, Math.min(score, aq.maxPoints));
  const answer = aq.answers[0];
  if (!answer) throw new Error("No answer row");

  await prisma.attemptAnswer.update({
    where: { id: answer.id },
    data: {
      score: clamped,
      partScores: [clamped],
      manualOverride: true,
      gradedAt: new Date(),
    },
  });
  await recalcAttemptTotal(attemptId);
  revalidatePath(`/teacher/exams/${examId}/results`);
  revalidatePath(`/teacher/exams/${examId}/grade/${attemptId}`);
}

export async function autoRegradeAnswer(
  attemptId: string,
  attemptQuestionId: string,
  examId: string,
) {
  await requireTeacher();
  const answer = await prisma.attemptAnswer.findFirst({
    where: { attemptId, attemptQuestionId },
    include: { attemptQuestion: true },
  });
  if (!answer) throw new Error("Not found");

  const snapshot = parseSnapshot(answer.attemptQuestion.snapshot);
  snapshot.maxPoints = answer.attemptQuestion.maxPoints;
  const response = answer.response as StudentResponse;
  const graded = gradeAnswer(snapshot, response ?? emptyResponse(snapshot.type));

  await prisma.attemptAnswer.update({
    where: { id: answer.id },
    data: {
      score: graded.score,
      partScores: graded.partScores,
      manualOverride: false,
      gradedAt: new Date(),
    },
  });
  await recalcAttemptTotal(attemptId);
  revalidatePath(`/teacher/exams/${examId}/results`);
  revalidatePath(`/teacher/exams/${examId}/grade/${attemptId}`);
}

export async function saveExamQuestionSnapshot(
  examQuestionId: string,
  examId: string,
  data: {
    title: string;
    stem: unknown;
    payload: unknown;
    answerKey: unknown;
    scoring: unknown;
    maxPoints: number;
    type: string;
  },
) {
  await requireTeacher();
  const snapshot: Prisma.InputJsonValue = {
    title: data.title,
    type: data.type,
    stem: data.stem as Prisma.InputJsonValue,
    payload: data.payload as Prisma.InputJsonValue,
    answerKey: data.answerKey as Prisma.InputJsonValue,
    scoring: data.scoring as Prisma.InputJsonValue,
    maxPoints: data.maxPoints,
  };
  await prisma.examQuestion.update({
    where: { id: examQuestionId },
    data: {
      maxPoints: data.maxPoints,
      snapshot,
    },
  });
  revalidatePath(`/teacher/exams/${examId}`);
  revalidatePath(`/teacher/exams/${examId}/snapshot/${examQuestionId}`);
}
