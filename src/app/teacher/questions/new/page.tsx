import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { QuestionForm } from "@/components/question-form";

const nav = [{ href: "/teacher/questions", label: "Question bank" }];

export default async function NewQuestionPage() {
  const [courses, categories] = await Promise.all([
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <AppShell title="New question" nav={nav}>
      <QuestionForm courses={courses} categories={categories} />
    </AppShell>
  );
}
