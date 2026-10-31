import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function AttemptSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { exam: true, student: true },
  });
  if (!attempt || attempt.studentId !== session.user.id) notFound();
  if (attempt.status !== "SUBMITTED") redirect(`/student/attempts/${id}`);

  const exam = attempt.exam;
  const marks = attempt.totalScore ?? 0;
  const maxMarks = attempt.maxScore ?? 0;
  const grade = maxMarks > 0 ? (marks / maxMarks) * exam.maxGrade : 0;
  const passed = grade >= exam.passingGrade;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="card">
          <div className="card-body text-center">
            <h1 className="page-title">{exam.title}</h1>
            <p className="page-desc mt-2">
              {exam.startAt.toLocaleString()} — {exam.endAt.toLocaleString()}
            </p>
            <div className="mt-8 inline-flex flex-col items-center rounded-lg bg-slate-50 px-8 py-6">
              <p className="text-sm text-slate-600">Your final grade</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                {grade.toFixed(2)}
                <span className="text-lg font-normal text-slate-500"> / {exam.maxGrade.toFixed(2)}</span>
              </p>
              <span
                className={`mt-3 rounded-full px-3 py-1 text-xs font-medium ${
                  passed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                }`}
              >
                {passed ? "Passed" : "Below passing grade"} ({exam.passingGrade.toFixed(0)} required)
              </span>
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Attempt summary
        </h2>
        <div className="table-wrap mt-3">
          <table className="data-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Marks / {maxMarks.toFixed(2)}</th>
                <th>Grade / {exam.maxGrade.toFixed(2)}</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="font-medium text-slate-900">Finished</span>
                  <br />
                  <span className="text-xs text-slate-500">
                    Submitted {attempt.submittedAt?.toLocaleString()}
                  </span>
                </td>
                <td className="font-medium">{marks.toFixed(2)}</td>
                <td className="font-medium">{grade.toFixed(2)}</td>
                <td>
                  {exam.allowReview ? (
                    <Link href={`/student/attempts/${id}/answers`} className="link">
                      Review the answer
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-sm">
          <Link href="/student" className="link">Back to my exams</Link>
        </p>
      </div>
    </div>
  );
}
