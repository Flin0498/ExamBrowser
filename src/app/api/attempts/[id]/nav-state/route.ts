import { auth } from "@/lib/auth";
import { buildQuestionStates, loadAttemptForStudent } from "@/lib/attempt-data";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const attempt = await loadAttemptForStudent(id, session.user.id);
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const questions = buildQuestionStates(attempt);
  return NextResponse.json({
    items: questions.map((q, i) => ({ index: i, completion: q.completion })),
  });
}
