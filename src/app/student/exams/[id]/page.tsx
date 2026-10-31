import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { startAttempt } from "@/app/actions/student";
import { studentCanTakeExam } from "@/lib/exam-access";
import { getExamRestrictStudents, listExamEnrollmentIds } from "@/lib/exam-enrollment";

const nav = [{ href: "/student", label: "My exams" }];

export default async function ExamIntroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      course: true,
      questions: true,
    },
  });
  if (!exam) notFound();
  if (session?.user?.id) {
    const [restrictStudents, enrolledIds] = await Promise.all([
      getExamRestrictStudents(id),
      listExamEnrollmentIds(id),
    ]);
    if (!studentCanTakeExam({ restrictStudents }, enrolledIds, session.user.id)) {
      notFound();
    }
  }

  const submitted = session?.user
    ? await prisma.attempt.count({
        where: { examId: id, studentId: session.user.id, status: "SUBMITTED" },
      })
    : 0;

  const inProgress = session?.user
    ? await prisma.attempt.findFirst({
        where: { examId: id, studentId: session.user.id, status: "IN_PROGRESS" },
      })
    : null;

  const now = new Date();
  const open = now >= exam.startAt && now <= exam.endAt;

  return (
    <AppShell title={exam.title} nav={nav}>
      <div className="card mx-auto max-w-2xl text-center">
        <div className="card-body">
        <h1 className="page-title">{exam.title}</h1>
        <p className="page-desc">{exam.course.name}</p>
        <dl className="mt-8 space-y-2 text-left text-sm text-slate-700">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Opens</dt>
            <dd>{exam.startAt.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Closes</dt>
            <dd>{exam.endAt.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Attempts</dt>
            <dd>{exam.maxAttempts}</dd>
          </div>
          {exam.timeLimitMinutes && (
            <div className="flex justify-between border-b border-slate-100 py-2">
              <dt className="text-slate-500">Time limit</dt>
              <dd>{exam.timeLimitMinutes} min</dd>
            </div>
          )}
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Grade to pass</dt>
            <dd>{exam.passingGrade.toFixed(2)} / {exam.maxGrade.toFixed(2)}</dd>
          </div>
        </dl>
        {exam.quizPassword && (
          <p className="mt-4 text-sm text-slate-600">Quiz password required to start.</p>
        )}

        {inProgress ? (
          <a href={`/student/attempts/${inProgress.id}`} className="btn-primary mt-8 inline-flex px-8 py-2.5">
            Continue attempt
          </a>
        ) : (
          <form
            action={async (fd) => {
              "use server";
              await startAttempt(id, String(fd.get("password") || ""));
            }}
            className="mt-8 space-y-3"
          >
            {exam.quizPassword && (
              <input
                name="password"
                type="password"
                placeholder="Quiz password"
                className="input mx-auto max-w-xs"
              />
            )}
            <button
              type="submit"
              disabled={!open || submitted >= exam.maxAttempts}
              className="btn-primary px-8 py-2.5 disabled:opacity-40"
            >
              Start exam
            </button>
            {!open && <p className="text-sm text-red-600">This exam is not currently open.</p>}
            {submitted >= exam.maxAttempts && (
              <p className="text-sm text-red-600">No attempts remaining.</p>
            )}
          </form>
        )}
        </div>
      </div>
    </AppShell>
  );
}
