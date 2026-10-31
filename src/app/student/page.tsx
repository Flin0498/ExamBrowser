import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { studentCanTakeExamByMaps } from "@/lib/exam-access";
import { listRestrictedExamIdsForStudent } from "@/lib/exam-enrollment";
import Link from "next/link";

const nav = [{ href: "/student", label: "My exams" }];

export default async function StudentHomePage() {
  const session = await auth();
  const exams = await prisma.exam.findMany({
    include: { course: true },
    orderBy: { startAt: "desc" },
  });
  const studentId = session?.user?.id;
  const access = studentId
    ? await listRestrictedExamIdsForStudent(studentId)
    : { restrictedExamIds: new Set<string>(), enrolledExamIds: new Set<string>() };
  const visibleExams = studentId
    ? exams.filter((exam) =>
        studentCanTakeExamByMaps(
          exam.id,
          access.restrictedExamIds,
          access.enrolledExamIds,
        ),
      )
    : [];

  const attempts = session?.user
    ? await prisma.attempt.findMany({
        where: { studentId: session.user.id },
        select: { examId: true, status: true },
      })
    : [];

  return (
    <AppShell title="Student" nav={nav}>
      <PageHeader title="My exams" description="Select an exam to view details or continue an attempt." />
      {visibleExams.length === 0 && (
        <p className="mb-4 text-sm text-slate-600">No exams are assigned to you yet.</p>
      )}
      <ul className="space-y-3">
        {visibleExams.map((exam) => {
          const submitted = attempts.filter(
            (a) => a.examId === exam.id && a.status === "SUBMITTED",
          ).length;
          return (
            <li key={exam.id}>
              <Link
                href={`/student/exams/${exam.id}`}
                className="card block transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{exam.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{exam.course.name}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {submitted} / {exam.maxAttempts} attempts
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
