import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      attempts: {
        where: { status: "SUBMITTED" },
        include: {
          student: true,
          answers: { include: { attemptQuestion: true } },
        },
      },
    },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const qHeaders = exam.questions.map((_, i) => `Q${i + 1}`);
  const header = [
    "Student ID",
    "Class",
    "Student",
    "Username",
    "Total",
    "Max",
    "Grade",
    ...qHeaders,
  ].join(",");

  const rows = exam.attempts.map((att) => {
    const total = att.totalScore ?? 0;
    const max = att.maxScore ?? 0;
    const grade = max > 0 ? (total / max) * exam.maxGrade : 0;
    const perQ = exam.questions.map((eq) => {
      const ans = att.answers.find((a) => a.attemptQuestion.sortOrder === eq.sortOrder);
      return (ans?.score ?? 0).toFixed(2);
    });
    return [
      csvEscape(att.student.studentNo ?? ""),
      csvEscape(att.student.classGroup ?? ""),
      csvEscape(att.student.name),
      csvEscape(att.student.username),
      total.toFixed(2),
      max.toFixed(2),
      grade.toFixed(2),
      ...perQ,
    ].join(",");
  });

  const body = [header, ...rows].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exam-${exam.id}-grades.csv"`,
    },
  });
}

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
