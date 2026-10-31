import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { updateExamSettings } from "@/app/actions/teacher";
import { ExamQuestionBankPicker } from "@/components/exam-question-bank-picker";
import { ExamPaperEditor } from "@/components/exam-paper-editor";
import { ExamStudentRoster } from "@/components/exam-student-roster";
import { getExamRestrictStudents, listExamEnrollmentIds } from "@/lib/exam-enrollment";
import Link from "next/link";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/exams", label: "Exams" },
];

export default async function ExamEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      course: true,
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!exam) notFound();

  const [bank, students, restrictStudents, enrolledIds] = await Promise.all([
    prisma.question.findMany({
      where: { courses: { some: { courseId: exam.courseId } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: [{ classGroup: "asc" }, { studentNo: "asc" }, { name: "asc" }],
      select: { id: true, name: true, studentNo: true, classGroup: true },
    }),
    getExamRestrictStudents(id),
    listExamEnrollmentIds(id),
  ]);

  const inPaperIds = exam.questions.map((q) => q.questionId).filter(Boolean) as string[];

  return (
    <AppShell title={exam.title} nav={nav}>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="card-body">
          <h2 className="font-semibold text-slate-900">Exam settings</h2>
          <form
            action={async (fd) => {
              "use server";
              await updateExamSettings(id, {
                title: String(fd.get("title")),
                description: String(fd.get("description") || ""),
                startAt: String(fd.get("startAt")),
                endAt: String(fd.get("endAt")),
                timeLimitMinutes: fd.get("timeLimitMinutes")
                  ? Number(fd.get("timeLimitMinutes"))
                  : null,
                passingGrade: Number(fd.get("passingGrade")),
                maxGrade: Number(fd.get("maxGrade")),
                maxAttempts: Number(fd.get("maxAttempts")),
                quizPassword: String(fd.get("quizPassword") || "") || null,
                allowQuestionJump: fd.get("allowQuestionJump") === "on",
                allowGoBack: fd.get("allowGoBack") === "on",
                allowReview: fd.get("allowReview") === "on",
                shuffleQuestions: fd.get("shuffleQuestions") === "on",
                shuffleOptions: fd.get("shuffleOptions") === "on",
              });
            }}
            className="mt-3 grid gap-2 text-sm"
          >
            <input name="title" defaultValue={exam.title} className="input" />
            <textarea
              name="description"
              defaultValue={exam.description ?? ""}
              className="input min-h-[72px]"
            />
            <label className="label">
              Start
              <input
                name="startAt"
                type="datetime-local"
                defaultValue={toLocalInput(exam.startAt)}
                className="input mt-1"
              />
            </label>
            <label className="label">
              End
              <input
                name="endAt"
                type="datetime-local"
                defaultValue={toLocalInput(exam.endAt)}
                className="input mt-1"
              />
            </label>
            <label className="label">
              Time limit (minutes)
              <input
                name="timeLimitMinutes"
                type="number"
                min={0}
                defaultValue={exam.timeLimitMinutes ?? ""}
                className="input mt-1 max-w-[8rem]"
              />
            </label>
            <label className="label">
              Passing grade
              <input
                name="passingGrade"
                type="number"
                step="0.01"
                defaultValue={exam.passingGrade}
                className="input mt-1 max-w-[8rem]"
              />
            </label>
            <label className="label">
              Max grade
              <input
                name="maxGrade"
                type="number"
                step="0.01"
                defaultValue={exam.maxGrade}
                className="input mt-1 max-w-[8rem]"
              />
            </label>
            <label className="label">
              Max attempts
              <input
                name="maxAttempts"
                type="number"
                min={1}
                defaultValue={exam.maxAttempts}
                className="input mt-1 max-w-[8rem]"
              />
            </label>
            <label className="label">
              Quiz password (optional)
              <input
                name="quizPassword"
                type="text"
                autoComplete="off"
                placeholder="Leave empty for no password"
                defaultValue={exam.quizPassword ?? ""}
                className="input mt-1"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowQuestionJump" defaultChecked={exam.allowQuestionJump} />
              Allow question jump
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowGoBack" defaultChecked={exam.allowGoBack} />
              Allow go back / redo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowReview" defaultChecked={exam.allowReview} />
              Allow review after submit
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="shuffleQuestions" defaultChecked={exam.shuffleQuestions} />
              Randomize question order per attempt
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="shuffleOptions" defaultChecked={exam.shuffleOptions} />
              Shuffle choice content per attempt (labels stay A, B, C, D)
            </label>
            <button type="submit" className="btn-primary mt-4">Save settings</button>
          </form>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2 className="font-semibold text-slate-900">Students who can take this exam</h2>
            <div className="mt-3">
              <ExamStudentRoster
                examId={id}
                restrictStudents={restrictStudents}
                enrolledIds={enrolledIds}
                students={students}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="font-semibold text-slate-900">Add from question bank</h2>
            <div className="mt-3">
              <ExamQuestionBankPicker
                examId={id}
                courseName={exam.course.name}
                bank={bank.map((q) => ({ id: q.id, title: q.title, type: q.type }))}
                inPaperIds={inPaperIds}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-body">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">
              Paper ({exam.questions.length} questions)
            </h2>
            <div className="flex gap-3 text-sm">
              <Link href={`/teacher/exams/${id}/results`} className="link">Open gradebook</Link>
              <a href={`/api/teacher/exams/${id}/export`} className="link">Export CSV</a>
            </div>
          </div>
          <ExamPaperEditor
            examId={id}
            questions={exam.questions.map((eq) => {
              const snap = eq.snapshot as { title?: string };
              return {
                id: eq.id,
                sortOrder: eq.sortOrder,
                maxPoints: eq.maxPoints,
                title: snap.title ?? "Question",
              };
            })}
          />
        </div>
      </section>
    </AppShell>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
