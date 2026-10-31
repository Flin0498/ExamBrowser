import { prisma } from "@/lib/db";

export async function listExamEnrollmentIds(examId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ studentId: string }>>`
    SELECT "studentId" FROM "ExamEnrollment" WHERE "examId" = ${examId}
  `;
  return rows.map((r) => r.studentId);
}

export async function getExamRestrictStudents(examId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ restrictStudents: boolean }>>`
    SELECT "restrictStudents" FROM "Exam" WHERE id = ${examId}
  `;
  return Boolean(rows[0]?.restrictStudents);
}

export async function listRestrictedExamIdsForStudent(studentId: string): Promise<{
  restrictedExamIds: Set<string>;
  enrolledExamIds: Set<string>;
}> {
  const restricted = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Exam" WHERE "restrictStudents" = true
  `;
  const enrolled = await prisma.$queryRaw<Array<{ examId: string }>>`
    SELECT "examId" FROM "ExamEnrollment" WHERE "studentId" = ${studentId}
  `;
  return {
    restrictedExamIds: new Set(restricted.map((r) => r.id)),
    enrolledExamIds: new Set(enrolled.map((r) => r.examId)),
  };
}

export async function replaceExamRoster(
  examId: string,
  restrictStudents: boolean,
  studentIds: string[],
) {
  await prisma.$executeRaw`
    UPDATE "Exam" SET "restrictStudents" = ${restrictStudents} WHERE id = ${examId}
  `;
  await prisma.$executeRaw`
    DELETE FROM "ExamEnrollment" WHERE "examId" = ${examId}
  `;
  for (const studentId of studentIds) {
    await prisma.$executeRaw`
      INSERT INTO "ExamEnrollment" ("examId", "studentId")
      VALUES (${examId}, ${studentId})
    `;
  }
}
