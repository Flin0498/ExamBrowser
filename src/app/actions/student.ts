"use server";

import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { parseSnapshot } from "@/lib/snapshot";
import { computeCompletion, emptyResponse } from "@/lib/completion";
import { gradeAnswer } from "@/lib/grading";
import type { StudentResponse } from "@/types/question";
import { redirect } from "next/navigation";
import { isAttemptPastDeadline } from "@/lib/attempt-deadline";
import { shuffleArray } from "@/lib/shuffle";
import { prepareAttemptSnapshot } from "@/lib/snapshot-attempt";
import { studentCanTakeExam } from "@/lib/exam-access";
import { clampChoiceSelection, maxMultipleChoiceSelections } from "@/lib/choice-limit";
import { getExamRestrictStudents, listExamEnrollmentIds } from "@/lib/exam-enrollment";

export async function startAttempt(examId: string, password?: string) {
  const session = await requireStudent();
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!exam) throw new Error("Exam not found");
  const [restrictStudents, enrolledIds] = await Promise.all([
    getExamRestrictStudents(examId),
    listExamEnrollmentIds(examId),
  ]);
  if (!studentCanTakeExam({ restrictStudents }, enrolledIds, session.user.id)) {
    throw new Error("You are not assigned to this exam");
  }

  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) {
    throw new Error("Exam is not open");
  }
  if (exam.quizPassword && exam.quizPassword !== password) {
    throw new Error("Invalid password");
  }

  const attempts = await prisma.attempt.count({
    where: { examId, studentId: session.user.id, status: "SUBMITTED" },
  });
  if (attempts >= exam.maxAttempts) {
    throw new Error("No attempts remaining");
  }

  const inProgress = await prisma.attempt.findFirst({
    where: { examId, studentId: session.user.id, status: "IN_PROGRESS" },
  });
  if (inProgress) {
    redirect(`/student/attempts/${inProgress.id}`);
  }

  const paper = exam.shuffleQuestions
    ? shuffleArray([...exam.questions])
    : [...exam.questions];

  const attempt = await prisma.attempt.create({
    data: {
      examId,
      studentId: session.user.id,
      maxScore: paper.reduce((s, q) => s + q.maxPoints, 0),
      questions: {
        create: paper.map((eq, index) => ({
          sortOrder: index,
          maxPoints: eq.maxPoints,
          snapshot: prepareAttemptSnapshot(
            eq.snapshot,
            eq.maxPoints,
            exam.shuffleOptions,
          ) as object,
        })),
      },
    },
  });

  const aqs = await prisma.attemptQuestion.findMany({
    where: { attemptId: attempt.id },
    orderBy: { sortOrder: "asc" },
  });
  for (const aq of aqs) {
    const snap = parseSnapshot(aq.snapshot);
    await prisma.attemptAnswer.create({
      data: {
        attemptId: attempt.id,
        attemptQuestionId: aq.id,
        response: emptyResponse(snap.type),
        completion: "EMPTY",
      },
    });
  }

  redirect(`/student/attempts/${attempt.id}`);
}

export async function saveAnswer(
  attemptId: string,
  sortOrder: number,
  response: StudentResponse,
) {
  const session = await requireStudent();
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: true },
  });
  if (!attempt || attempt.studentId !== session.user.id) throw new Error("Forbidden");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Submitted");
  if (isAttemptPastDeadline(attempt.startedAt, attempt.exam)) {
    await submitAttempt(attemptId);
    return;
  }

  const aq = await prisma.attemptQuestion.findUnique({
    where: { attemptId_sortOrder: { attemptId, sortOrder } },
  });
  if (!aq) throw new Error("Question not found");

  const snapshot = parseSnapshot(aq.snapshot);
  if (snapshot.type === "MULTIPLE_CHOICE") {
    const r = response as { selectedIds?: string[] };
    response = {
      selectedIds: clampChoiceSelection(
        r.selectedIds ?? [],
        maxMultipleChoiceSelections(snapshot),
      ),
    };
  }
  const completion = computeCompletion(snapshot, response);

  await prisma.attemptAnswer.update({
    where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId: aq.id } },
    data: { response: response as object, completion },
  });
}

export async function navigateAttempt(
  attemptId: string,
  direction: "next" | "goto",
  targetIndex?: number,
) {
  const session = await requireStudent();
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: true, questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!attempt || attempt.studentId !== session.user.id) throw new Error("Forbidden");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Submitted");
  if (isAttemptPastDeadline(attempt.startedAt, attempt.exam)) {
    await submitAttempt(attemptId);
    return { currentIndex: attempt.currentIndex, atEnd: true };
  }

  const count = attempt.questions.length;
  const exam = attempt.exam;
  let nextIndex = attempt.currentIndex;

  if (direction === "goto") {
    if (!exam.allowQuestionJump) throw new Error("Jump not allowed");
    if (targetIndex === undefined) throw new Error("No target");
    if (!exam.allowGoBack && targetIndex < attempt.furthestIndex) {
      throw new Error("Cannot go back");
    }
    nextIndex = targetIndex;
  } else if (attempt.currentIndex >= count - 1) {
    return { currentIndex: attempt.currentIndex, atEnd: true };
  } else {
    nextIndex = attempt.currentIndex + 1;
  }

  if (targetIndex !== undefined && !exam.allowGoBack && targetIndex < attempt.lockedThrough) {
    throw new Error("Cannot revisit");
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      currentIndex: nextIndex,
      furthestIndex: Math.max(attempt.furthestIndex, nextIndex),
      lockedThrough: !exam.allowGoBack
        ? Math.max(attempt.lockedThrough, attempt.currentIndex)
        : attempt.lockedThrough,
    },
  });

  return { currentIndex: nextIndex, atEnd: false };
}

export async function submitAttempt(attemptId: string) {
  const session = await requireStudent();
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      questions: { orderBy: { sortOrder: "asc" } },
      answers: true,
    },
  });
  if (!attempt || attempt.studentId !== session.user.id) throw new Error("Forbidden");
  if (attempt.status === "SUBMITTED") {
    redirect(`/student/attempts/${attemptId}/summary`);
  }

  let totalScore = 0;
  const maxScore = attempt.questions.reduce((s, q) => s + q.maxPoints, 0);

  for (const aq of attempt.questions) {
    const ans = attempt.answers.find((a) => a.attemptQuestionId === aq.id);
    if (ans?.manualOverride) {
      totalScore += ans.score;
      continue;
    }
    const snapshot = parseSnapshot(aq.snapshot);
    snapshot.maxPoints = aq.maxPoints;
    const response = (ans?.response ?? emptyResponse(snapshot.type)) as StudentResponse;
    const graded = gradeAnswer(snapshot, response);
    totalScore += graded.score;
    await prisma.attemptAnswer.update({
      where: {
        attemptId_attemptQuestionId: {
          attemptId,
          attemptQuestionId: aq.id,
        },
      },
      data: {
        score: graded.score,
        partScores: graded.partScores,
        gradedAt: new Date(),
        completion: computeCompletion(snapshot, response),
      },
    });
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      totalScore,
      maxScore,
    },
  });

  redirect(`/student/attempts/${attemptId}/summary`);
}
