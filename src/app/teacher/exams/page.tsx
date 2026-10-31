import { AppShell } from "@/components/app-shell";
import { ExamDeleteButton } from "@/components/exam-delete-button";
import { ExamQuickEdit } from "@/components/exam-quick-edit";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createExam } from "@/app/actions/teacher";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/questions", label: "Question bank" },
  { href: "/teacher/exams", label: "Exams" },
];

function formatWindow(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

export default async function ExamsPage() {
  const [exams, courses] = await Promise.all([
    prisma.exam.findMany({
      include: {
        course: true,
        questions: { select: { id: true } },
        attempts: { where: { status: "SUBMITTED" }, select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
  ]);

  const courseOptions = courses.map((c) => ({ id: c.id, name: c.name }));

  return (
    <AppShell title="Exams" nav={nav}>
      <p className="page-desc mb-6">
        Create exams, build papers, publish windows, and open the gradebook when students submit.
      </p>

      <section className="card mb-6">
        <div className="card-body">
          <h2 className="font-semibold text-slate-900">New exam</h2>
          {courses.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              <Link href="/teacher/courses" className="link">Create a course</Link> before adding exams.
            </p>
          ) : (
            <form
              action={async (fd) => {
                "use server";
                const id = await createExam(String(fd.get("courseId")), String(fd.get("title")));
                redirect(`/teacher/exams/${id}`);
              }}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-[10rem] flex-1 text-sm">
                <span className="label">Course</span>
                <select name="courseId" required className="input mt-1">
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="min-w-[12rem] flex-[2] text-sm">
                <span className="label">Title</span>
                <input name="title" required placeholder="e.g. Mid-term exam" className="input mt-1" />
              </label>
              <button type="submit" className="btn-primary">Create exam</button>
            </form>
          )}
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{exams.length} exam(s)</p>
      </div>

      {exams.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-sm text-slate-600">
            No exams yet. Use the form above to create one, then add questions from the bank.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Window</th>
                <th className="text-center">Questions</th>
                <th className="text-center">Submitted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/teacher/exams/${e.id}`} className="font-medium text-blue-700 hover:underline">
                      {e.title}
                    </Link>
                    <div className="mt-1">
                      <ExamQuickEdit
                        examId={e.id}
                        title={e.title}
                        courseId={e.courseId}
                        courses={courseOptions}
                      />
                    </div>
                  </td>
                  <td className="text-slate-600">{e.course.name}</td>
                  <td className="whitespace-nowrap text-slate-600 text-xs">
                    {formatWindow(e.startAt, e.endAt)}
                  </td>
                  <td className="text-center">{e.questions.length}</td>
                  <td className="text-center">{e.attempts.length}</td>
                  <td className="text-right whitespace-nowrap">
                    <Link href={`/teacher/exams/${e.id}`} className="link text-sm">
                      Edit paper
                    </Link>
                    <span className="mx-2 text-slate-300">|</span>
                    <Link href={`/teacher/exams/${e.id}/results`} className="link text-sm">
                      Gradebook
                    </Link>
                    <span className="mx-2 text-slate-300">|</span>
                    <ExamDeleteButton examId={e.id} title={e.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
