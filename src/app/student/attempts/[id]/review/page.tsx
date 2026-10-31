import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { buildQuestionStates, loadAttemptForStudent } from "@/lib/attempt-data";
import { PreSubmitReview } from "@/components/pre-submit-review";

export default async function PreSubmitReviewPage({
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

  const questions = buildQuestionStates(attempt);
  const items = questions.map((q, i) => ({ index: i, completion: q.completion }));

  return <PreSubmitReview attemptId={id} items={items} />;
}
