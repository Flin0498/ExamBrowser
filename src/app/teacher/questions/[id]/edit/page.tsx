import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { QuestionForm } from "@/components/question-form";
import { notFound } from "next/navigation";

const nav = [{ href: "/teacher/questions", label: "Question bank" }];

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { courses: true, categories: true },
  });
  if (!question) notFound();

  const [courses, categories, bank] = await Promise.all([
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.question.findMany({
      where: { ownerId: question.ownerId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  const index = bank.findIndex((q) => q.id === question.id);

  return (
    <AppShell title="Edit question" nav={nav}>
      <QuestionForm
        key={question.id}
        courses={courses}
        categories={categories}
        sequence={bank.map((q) => q.id)}
        sequenceIndex={index < 0 ? 0 : index}
        initial={{
          id: question.id,
          title: question.title,
          type: question.type,
          stem: question.stem,
          payload: question.payload,
          answerKey: question.answerKey,
          scoring: question.scoring,
          courseIds: question.courses.map((c) => c.courseId),
          categoryIds: question.categories.map((c) => c.categoryId),
        }}
      />
    </AppShell>
  );
}
