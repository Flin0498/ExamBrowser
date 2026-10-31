import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AttemptWorkspace } from "@/components/attempt-workspace";
import {
  buildGraded,
  buildQuestionStates,
  loadAttemptForStudent,
} from "@/lib/attempt-data";

export default async function AttemptAnswersReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const attempt = await loadAttemptForStudent(id, session.user.id);
  if (!attempt) notFound();
  if (attempt.status !== "SUBMITTED") redirect(`/student/attempts/${id}`);
  if (!attempt.exam.allowReview) notFound();

  const questions = buildQuestionStates(attempt);
  const graded = buildGraded(attempt);

  return (
    <AttemptWorkspace
      attemptId={attempt.id}
      examTitle={attempt.exam.title}
      allowQuestionJump
      allowGoBack
      currentIndex={0}
      questions={questions}
      mode="review"
      graded={graded}
    />
  );
}
