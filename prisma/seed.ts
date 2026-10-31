import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const stemParagraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

async function main() {
  await prisma.attemptAnswer.deleteMany();
  await prisma.attemptQuestion.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.questionCategory.deleteMany();
  await prisma.questionCourse.deleteMany();
  await prisma.question.deleteMany();
  await prisma.category.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("teacher123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  const teacher = await prisma.user.create({
    data: {
      username: "teacher",
      name: "Dr. Smith",
      passwordHash: hash,
      role: "TEACHER",
    },
  });

  await prisma.user.createMany({
    data: [
      {
        username: "student1",
        name: "Alice Johnson",
        studentNo: "20240001",
        classGroup: "CS-370-A",
        passwordHash: studentHash,
        role: "STUDENT",
      },
      {
        username: "student2",
        name: "Bob Lee",
        studentNo: "20240002",
        classGroup: "CS-370-A",
        passwordHash: studentHash,
        role: "STUDENT",
      },
    ],
  });

  const course = await prisma.course.create({
    data: {
      name: "Computer Architecture (D1)",
      description: "Midterm topics",
      ownerId: teacher.id,
    },
  });

  const category = await prisma.category.create({
    data: { name: "Number Systems", ownerId: teacher.id },
  });

  const q1 = await prisma.question.create({
    data: {
      title: "32-bit signed largest",
      type: QuestionType.SINGLE_CHOICE,
      stem: stemParagraph(
        "Which of the following 32-bit signed numbers is the largest one?",
      ),
      payload: {
        options: [
          { id: "a", label: "A", content: stemParagraph("0x80000000") },
          { id: "b", label: "B", content: stemParagraph("0xFFFFFFFF") },
          { id: "c", label: "C", content: stemParagraph("0x00000001") },
          { id: "d", label: "D", content: stemParagraph("0x10000000") },
        ],
      },
      answerKey: { correctOptionId: "d" },
      scoring: { mode: "all_or_nothing", maxPoints: 1 },
      ownerId: teacher.id,
      courses: { create: [{ courseId: course.id }] },
      categories: { create: [{ categoryId: category.id }] },
    },
  });

  const q2 = await prisma.question.create({
    data: {
      title: "8-bit binary conversion",
      type: QuestionType.FILL_BLANK,
      stem: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Convert 8-bit integer 0x3C into binary representation 0b" },
              {
                type: "blank",
                attrs: {
                  id: "bin",
                  widthCh: 10,
                  acceptedAnswers: ["00111100"],
                  caseSensitive: true,
                  points: 1,
                },
              },
            ],
          },
        ],
      },
      payload: {
        blanks: [
          {
            id: "bin",
            widthCh: 10,
            acceptedAnswers: ["00111100"],
            caseSensitive: true,
            points: 1,
          },
        ],
      },
      answerKey: { blanks: { bin: ["00111100"] } },
      scoring: { mode: "per_part", maxPoints: 1 },
      ownerId: teacher.id,
      courses: { create: [{ courseId: course.id }] },
    },
  });

  const q3 = await prisma.question.create({
    data: {
      title: "OSI layers",
      type: QuestionType.MATCHING_SLOTS,
      stem: stemParagraph("Which are the 7 layers in the OSI reference model?"),
      payload: {
        slots: [
          { id: "l1", label: "Layer 1" },
          { id: "l2", label: "Layer 2" },
          { id: "l3", label: "Layer 3" },
          { id: "l4", label: "Layer 4" },
          { id: "l5", label: "Layer 5" },
          { id: "l6", label: "Layer 6" },
          { id: "l7", label: "Layer 7" },
        ],
        items: [
          { id: "physical", text: "Physical" },
          { id: "datalink", text: "Data Link" },
          { id: "network", text: "Network" },
          { id: "transport", text: "Transport" },
          { id: "session", text: "Session" },
          { id: "presentation", text: "Presentation" },
          { id: "application", text: "Application" },
        ],
      },
      answerKey: {
        slots: {
          l1: "physical",
          l2: "datalink",
          l3: "network",
          l4: "transport",
          l5: "session",
          l6: "presentation",
          l7: "application",
        },
      },
      scoring: { mode: "per_part", maxPoints: 7 },
      ownerId: teacher.id,
      courses: { create: [{ courseId: course.id }] },
    },
  });

  const now = new Date();
  const startAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const exam = await prisma.exam.create({
    data: {
      courseId: course.id,
      title: "Midterm Exam (D1)",
      description: "Closed book. Show your work where required.",
      startAt,
      endAt,
      timeLimitMinutes: 120,
      passingGrade: 50,
      maxGrade: 100,
      maxAttempts: 3,
      allowQuestionJump: true,
      allowGoBack: true,
      allowReview: true,
    },
  });

  const snapshots = [
    { q: q1, points: 1 },
    { q: q2, points: 1 },
    { q: q3, points: 7 },
  ];

  for (let i = 0; i < snapshots.length; i++) {
    const { q, points } = snapshots[i];
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: q.id,
        sortOrder: i,
        maxPoints: points,
        snapshot: {
          title: q.title,
          type: q.type,
          stem: q.stem,
          payload: q.payload,
          answerKey: q.answerKey,
          scoring: q.scoring,
          maxPoints: points,
        },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
