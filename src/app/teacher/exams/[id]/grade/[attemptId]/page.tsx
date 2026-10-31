import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { AttemptRegradePanel } from "@/components/attempt-regrade-panel";
import { parseSnapshot } from "@/lib/snapshot";
import { emptyResponse } from "@/lib/completion";
import { gradeAnswer } from "@/lib/grading";
import {
  formatCorrectAnswerLabel,
  formatStudentResponseLabel,
} from "@/lib/correct-answer-label";
import type { StudentResponse } from "@/types/question";
import Link from "next/link";

const nav = [{ href: "/teacher/exams", label: "Exams" }];

export default async function AttemptRegradePage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, examId: id, status: "SUBMITTED" },
    include: {
      student: true,
      exam: true,
      questions: { orderBy: { sortOrder: "asc" } },
      answers: true,
    },
  });
  if (!attempt) notFound();

  const items = attempt.questions.map((aq, i) => {
    const snap = parseSnapshot(aq.snapshot);
    snap.maxPoints = aq.maxPoints;
    const ans = attempt.answers.find((a) => a.attemptQuestionId === aq.id);
    const response = (ans?.response ?? emptyResponse(snap.type)) as StudentResponse;
    const graded = gradeAnswer(snap, response);
    return {
      attemptQuestionId: aq.id,
      index: i + 1,
      title: snap.title,
      maxPoints: aq.maxPoints,
      score: ans?.score ?? 0,
      manualOverride: ans?.manualOverride ?? false,
      snapshot: snap,
      response,
      studentAnswer: formatStudentResponseLabel(snap, response),
      correctAnswer: formatCorrectAnswerLabel(snap),
      correct: graded.correct,
    };
  });

  return (
    <AppShell title={`Regrade — ${attempt.student.name}`} nav={nav}>
      <p className="mb-4 text-sm text-slate-600">
        <Link href={`/teacher/exams/${id}/results`} className="link">← Back to gradebook</Link>
      </p>
      <AttemptRegradePanel examId={id} attemptId={attemptId} items={items} />
    </AppShell>
  );
}
