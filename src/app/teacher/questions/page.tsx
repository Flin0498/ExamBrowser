import { AppShell } from "@/components/app-shell";
import { QuestionImportPanel } from "@/components/question-import";
import { QuestionBankFilters } from "@/components/question-bank-filters";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { QuestionBankTable } from "@/components/question-bank-table";
import type { QuestionType } from "@prisma/client";
import { Suspense } from "react";

const nav = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/questions", label: "Question bank" },
  { href: "/teacher/exams", label: "Exams" },
];

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; courseId?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const [questions, courses] = await Promise.all([
    prisma.question.findMany({
      where: {
        ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" } } : {}),
        ...(sp.type ? { type: sp.type as QuestionType } : {}),
        ...(sp.courseId
          ? { courses: { some: { courseId: sp.courseId } } }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { courses: { include: { course: true } } },
    }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell title="Question bank" nav={nav}>
      <Suspense fallback={null}>
        <QuestionBankFilters courses={courses.map((c) => ({ id: c.id, name: c.name }))} />
      </Suspense>
      <QuestionImportPanel courses={courses.map((c) => ({ id: c.id, name: c.name }))} />
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-slate-600">{questions.length} questions</p>
        <Link href="/teacher/questions/new" className="btn-primary">
          New question
        </Link>
      </div>
      <QuestionBankTable
        questions={questions.map((q) => ({
          id: q.id,
          title: q.title,
          type: q.type,
          courses: q.courses.map((c) => c.course.name).join(", "),
        }))}
      />
    </AppShell>
  );
}
