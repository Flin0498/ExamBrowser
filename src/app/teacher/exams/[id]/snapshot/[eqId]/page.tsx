import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ExamSnapshotForm } from "@/components/exam-snapshot-form";
import { parseSnapshot } from "@/lib/snapshot";
import type { QuestionType } from "@prisma/client";

const nav = [{ href: "/teacher/exams", label: "Exams" }];

export default async function ExamSnapshotEditPage({
  params,
}: {
  params: Promise<{ id: string; eqId: string }>;
}) {
  const { id, eqId } = await params;
  const eq = await prisma.examQuestion.findFirst({
    where: { id: eqId, examId: id },
    include: { exam: true },
  });
  if (!eq) notFound();
  const snap = parseSnapshot(eq.snapshot);

  return (
    <AppShell title={`Edit snapshot — ${eq.exam.title}`} nav={nav}>
      <ExamSnapshotForm
        examId={id}
        examQuestionId={eqId}
        initial={{
          title: snap.title,
          type: snap.type as QuestionType,
          stem: snap.stem,
          payload: snap.payload,
          answerKey: snap.answerKey,
          scoring: snap.scoring,
          maxPoints: eq.maxPoints,
        }}
      />
    </AppShell>
  );
}
