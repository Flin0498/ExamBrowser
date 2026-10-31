import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AttemptWorkspace } from "@/components/attempt-workspace";
import { buildQuestionStates, loadAttemptForStudent } from "@/lib/attempt-data";
import { getAttemptDeadline, isAttemptPastDeadline } from "@/lib/attempt-deadline";
import { submitAttempt } from "@/app/actions/student";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const attempt = await loadAttemptForStudent(id, session.user.id);
  if (!attempt) notFound();
  if (attempt.status === "SUBMITTED") redirect(`/student/attempts/${id}/summary`);
  if (isAttemptPastDeadline(attempt.startedAt, attempt.exam)) {
    await submitAttempt(id);
  }

  const questions = buildQuestionStates(attempt);
  const deadline = getAttemptDeadline(attempt.startedAt, attempt.exam);

  return (
    <AttemptWorkspace
      attemptId={attempt.id}
      examTitle={attempt.exam.title}
      allowQuestionJump={attempt.exam.allowQuestionJump}
      allowGoBack={attempt.exam.allowGoBack}
      currentIndex={attempt.currentIndex}
      questions={questions}
      mode="attempt"
      deadlineIso={deadline.toISOString()}
    />
  );
}
