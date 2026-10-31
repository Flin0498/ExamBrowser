"use server";

import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { questionToSnapshot } from "@/lib/snapshot";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { QuestionType } from "@prisma/client";
import { extractBlanksFromStem } from "@/lib/stem";
import { allocateQuestionSortOrders } from "@/lib/question-bank-order";
import { replaceExamRoster } from "@/lib/exam-enrollment";

export async function createCourse(name: string, description?: string) {
  const session = await requireTeacher();
  await prisma.course.create({
    data: { name, description, ownerId: session.user.id },
  });
  revalidatePath("/teacher/courses");
}

export async function deleteCourse(id: string) {
  await requireTeacher();
  await prisma.course.delete({ where: { id } });
  revalidatePath("/teacher/courses");
}

export async function createCategory(name: string) {
  const session = await requireTeacher();
  await prisma.category.create({
    data: { name, ownerId: session.user.id },
  });
  revalidatePath("/teacher/categories");
}

function normalizeStudentNo(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}

async function assertStudentNoAvailable(studentNo: string | null, excludeId?: string) {
  if (!studentNo) return;
  const taken = await prisma.user.findFirst({
    where: {
      studentNo,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (taken) throw new Error("Student ID (学号) already in use");
}

export async function createStudent(
  username: string,
  name: string,
  password: string,
  studentNo?: string,
  classGroup?: string,
) {
  await requireTeacher();
  const u = username.trim();
  const n = name.trim();
  if (!u || !n || !password) throw new Error("Username, name, and password are required");
  const taken = await prisma.user.findUnique({ where: { username: u } });
  if (taken) throw new Error("Username already taken");
  const no = normalizeStudentNo(studentNo);
  await assertStudentNoAvailable(no);
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username: u,
      name: n,
      studentNo: no,
      classGroup: classGroup?.trim() || null,
      passwordHash,
      role: "STUDENT",
    },
  });
  revalidatePath("/teacher/students");
}

export async function updateStudent(
  studentId: string,
  data: {
    username: string;
    name: string;
    studentNo?: string;
    classGroup?: string;
    password?: string;
  },
) {
  await requireTeacher();
  const user = await prisma.user.findUnique({ where: { id: studentId } });
  if (!user || user.role !== "STUDENT") throw new Error("Student not found");

  const username = data.username.trim();
  const name = data.name.trim();
  if (!username || !name) throw new Error("Username and name are required");

  const taken = await prisma.user.findFirst({
    where: { username, NOT: { id: studentId } },
  });
  if (taken) throw new Error("Username already taken");

  const studentNo = normalizeStudentNo(data.studentNo);
  await assertStudentNoAvailable(studentNo, studentId);

  const payload: {
    username: string;
    name: string;
    studentNo: string | null;
    classGroup: string | null;
    passwordHash?: string;
  } = {
    username,
    name,
    studentNo,
    classGroup: data.classGroup?.trim() || null,
  };
  const nextPassword = data.password?.trim();
  if (nextPassword) {
    payload.passwordHash = await bcrypt.hash(nextPassword, 10);
  }

  await prisma.user.update({ where: { id: studentId }, data: payload });
  revalidatePath("/teacher/students");
}

export async function deleteStudent(studentId: string) {
  await requireTeacher();
  const user = await prisma.user.findUnique({ where: { id: studentId } });
  if (!user || user.role !== "STUDENT") throw new Error("Student not found");
  await prisma.user.delete({ where: { id: studentId } });
  revalidatePath("/teacher/students");
}

export async function saveQuestion(data: {
  id?: string;
  title: string;
  type: QuestionType;
  stem: unknown;
  payload: unknown;
  answerKey: unknown;
  scoring: unknown;
  courseIds: string[];
  categoryIds: string[];
}) {
  const session = await requireTeacher();
  const stemBlanks = extractBlanksFromStem(data.stem);
  let payload = data.payload;
  let answerKey = data.answerKey;
  if (data.type === "FILL_BLANK") {
    payload = { blanks: stemBlanks };
    const blanks: Record<string, string[]> = {};
    for (const b of stemBlanks) {
      blanks[b.id] = b.acceptedAnswers.length ? b.acceptedAnswers : [""];
    }
    answerKey = { blanks };
  }

  if (data.id) {
    await prisma.question.update({
      where: { id: data.id },
      data: {
        title: data.title,
        type: data.type,
        stem: data.stem as object,
        payload: payload as object,
        answerKey: answerKey as object,
        scoring: data.scoring as object,
        courses: {
          deleteMany: {},
          create: data.courseIds.map((courseId) => ({ courseId })),
        },
        categories: {
          deleteMany: {},
          create: data.categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    });
  } else {
    const [sortOrder] = await allocateQuestionSortOrders(session.user.id, 1);
    await prisma.question.create({
      data: {
        sortOrder,
        title: data.title,
        type: data.type,
        stem: data.stem as object,
        payload: payload as object,
        answerKey: answerKey as object,
        scoring: data.scoring as object,
        ownerId: session.user.id,
        courses: { create: data.courseIds.map((courseId) => ({ courseId })) },
        categories: { create: data.categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
  }
  revalidatePath("/teacher/questions");
}

export async function deleteQuestion(id: string) {
  await requireTeacher();
  await prisma.question.delete({ where: { id } });
  revalidatePath("/teacher/questions");
}

export async function deleteQuestions(ids: string[]) {
  await requireTeacher();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  await prisma.question.deleteMany({ where: { id: { in: unique } } });
  revalidatePath("/teacher/questions");
}

export async function createExam(courseId: string, title: string) {
  await requireTeacher();
  const now = new Date();
  const exam = await prisma.exam.create({
    data: {
      courseId,
      title,
      startAt: now,
      endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/teacher/exams");
  return exam.id;
}

export async function updateExamBasics(
  examId: string,
  data: { title: string; courseId: string },
) {
  await requireTeacher();
  const title = data.title.trim();
  if (!title) throw new Error("Title is required");
  await prisma.exam.update({
    where: { id: examId },
    data: { title, courseId: data.courseId },
  });
  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${examId}`);
}

export async function deleteExam(examId: string) {
  await requireTeacher();
  await prisma.exam.delete({ where: { id: examId } });
  revalidatePath("/teacher/exams");
}

export async function updateExamSettings(
  examId: string,
  data: {
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    timeLimitMinutes?: number | null;
    passingGrade: number;
    maxGrade: number;
    maxAttempts: number;
    quizPassword?: string | null;
    allowQuestionJump: boolean;
    allowGoBack: boolean;
    allowReview: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  },
) {
  await requireTeacher();
  await prisma.exam.update({
    where: { id: examId },
    data: {
      title: data.title,
      description: data.description,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      timeLimitMinutes: data.timeLimitMinutes ?? null,
      passingGrade: data.passingGrade,
      maxGrade: data.maxGrade,
      maxAttempts: data.maxAttempts,
      quizPassword: data.quizPassword || null,
      allowQuestionJump: data.allowQuestionJump,
      allowGoBack: data.allowGoBack,
      allowReview: data.allowReview,
      shuffleQuestions: data.shuffleQuestions,
      shuffleOptions: data.shuffleOptions,
    },
  });
  revalidatePath(`/teacher/exams/${examId}`);
}

export async function addQuestionsToExam(examId: string, questionIds: string[]) {
  await requireTeacher();
  const maxOrder = await prisma.examQuestion.aggregate({
    where: { examId },
    _max: { sortOrder: true },
  });
  let order = (maxOrder._max.sortOrder ?? -1) + 1;

  for (const qid of questionIds) {
    const q = await prisma.question.findUnique({ where: { id: qid } });
    if (!q) continue;
    const maxPoints =
      (q.scoring as { maxPoints?: number })?.maxPoints ?? 1;
    await prisma.examQuestion.create({
      data: {
        examId,
        questionId: qid,
        sortOrder: order++,
        maxPoints,
        snapshot: questionToSnapshot(q, maxPoints) as object,
      },
    });
  }
  revalidatePath(`/teacher/exams/${examId}`);
}

export async function removeExamQuestion(examQuestionId: string, examId: string) {
  await requireTeacher();
  await prisma.examQuestion.delete({ where: { id: examQuestionId } });
  revalidatePath(`/teacher/exams/${examId}`);
}

export async function updateExamQuestionSnapshot(
  examQuestionId: string,
  examId: string,
  snapshot: unknown,
  maxPoints: number,
) {
  await requireTeacher();
  await prisma.examQuestion.update({
    where: { id: examQuestionId },
    data: { snapshot: snapshot as object, maxPoints },
  });
  revalidatePath(`/teacher/exams/${examId}`);
}

export async function updateExamQuestionPoints(
  examQuestionId: string,
  examId: string,
  maxPoints: number,
) {
  await requireTeacher();
  const eq = await prisma.examQuestion.findUnique({ where: { id: examQuestionId } });
  if (!eq) return;
  const snap = eq.snapshot as Record<string, unknown>;
  const scoring = (snap.scoring as Record<string, unknown>) ?? {};
  await prisma.examQuestion.update({
    where: { id: examQuestionId },
    data: {
      maxPoints,
      snapshot: {
        ...snap,
        maxPoints,
        scoring: { ...scoring, maxPoints },
      },
    },
  });
  revalidatePath(`/teacher/exams/${examId}`);
}

export async function updateExamRoster(
  examId: string,
  data: { restrictStudents: boolean; studentIds: string[] },
) {
  await requireTeacher();
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error("Exam not found");

  const uniqueIds = [...new Set(data.studentIds.filter(Boolean))];
  const students = data.restrictStudents && uniqueIds.length
    ? await prisma.user.findMany({
        where: { id: { in: uniqueIds }, role: "STUDENT" },
        select: { id: true },
      })
    : [];
  const valid = new Set(students.map((s) => s.id));
  const studentIds = uniqueIds.filter((id) => valid.has(id));
  await replaceExamRoster(
    examId,
    data.restrictStudents,
    data.restrictStudents ? studentIds : [],
  );
  revalidatePath(`/teacher/exams/${examId}`);
  revalidatePath("/student");
}

export async function moveExamQuestion(
  examId: string,
  examQuestionId: string,
  direction: "up" | "down",
) {
  await requireTeacher();
  const questions = await prisma.examQuestion.findMany({
    where: { examId },
    orderBy: { sortOrder: "asc" },
  });
  const idx = questions.findIndex((q) => q.id === examQuestionId);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= questions.length) return;

  const reordered = [...questions];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  await prisma.$transaction(
    reordered.map((q, i) =>
      prisma.examQuestion.update({
        where: { id: q.id },
        data: { sortOrder: i },
      }),
    ),
  );
  revalidatePath(`/teacher/exams/${examId}`);
}
