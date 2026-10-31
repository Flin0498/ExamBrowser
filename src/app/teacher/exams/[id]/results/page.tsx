import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradebookTable } from "@/components/gradebook-table";
import { parseSnapshot } from "@/lib/snapshot";

const nav = [{ href: "/teacher/exams", label: "Exams" }];

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      attempts: {
        where: { status: "SUBMITTED" },
        include: {
          student: true,
          answers: { include: { attemptQuestion: true } },
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!exam) notFound();

  const questionLabels = exam.questions.map((q, i) => {
    const snap = parseSnapshot(q.snapshot);
    return snap.title || `Q${i + 1}`;
  });

  const partLabels = exam.questions.map((eq) => {
    const snap = parseSnapshot(eq.snapshot);
    const ans = exam.attempts[0]?.answers.find(
      (a) => a.attemptQuestion.sortOrder === eq.sortOrder,
    );
    const parts = (ans?.partScores as number[]) ?? [];
    if (parts.length <= 1) return ["score"];
    return parts.map((_, i) => `part ${i + 1}`);
  });

  const rows = exam.attempts.map((att) => {
    const partScores = exam.questions.map((eq) => {
      const answer = att.answers.find((a) => a.attemptQuestion.sortOrder === eq.sortOrder);
      const ps = answer?.partScores as number[];
      if (ps?.length) return ps;
      return [answer?.score ?? 0];
    });
    return {
      attemptId: att.id,
      studentId: att.studentId,
      studentName: att.student.name,
      studentNo: att.student.studentNo,
      classGroup: att.student.classGroup,
      totalScore: att.totalScore ?? 0,
      maxScore: att.maxScore ?? exam.questions.reduce((s, q) => s + q.maxPoints, 0),
      partScores,
      responses: att.answers.map((a) => a.response),
    };
  });

  return (
    <AppShell title={`Gradebook — ${exam.title}`} nav={nav}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          {rows.length} submitted attempt(s).
          {rows.length === 0 && (
            <>
              {" "}
              <Link href={`/teacher/exams/${id}`} className="link">Edit exam &amp; add questions</Link>
              {" "}
              or wait for students to submit.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/teacher/exams/${id}`} className="link">← Back to exam editor</Link>
          <a href={`/api/teacher/exams/${id}/export`} className="link">Download CSV</a>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="card">
          <div className="card-body text-sm text-slate-600">
            The gradebook is empty until at least one student submits. Check exam dates, enrollment, and
            that the paper has questions.
          </div>
        </div>
      ) : (
      <GradebookTable
        examId={id}
        rows={rows}
        questionLabels={questionLabels}
        partLabels={partLabels}
      />
      )}
    </AppShell>
  );
}
