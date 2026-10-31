"use server";

import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQuestionImportFile } from "@/lib/import/parse-file";
import { allocateQuestionSortOrders } from "@/lib/question-bank-order";
import type { ImportResult } from "@/lib/import/types";
import { revalidatePath } from "next/cache";

export async function importQuestionsFromUpload(
  formData: FormData,
): Promise<ImportResult> {
  const session = await requireTeacher();
  const file = formData.get("file");
  const defaultCourseIds = formData.getAll("courseIds") as string[];

  if (!file || !(file instanceof File)) {
    return { created: 0, skipped: 0, errors: ["No file selected."] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let drafts;
  try {
    drafts = await parseQuestionImportFile(buffer, file.name);
  } catch (e) {
    return {
      created: 0,
      skipped: 0,
      errors: [e instanceof Error ? e.message : "Failed to parse file"],
    };
  }

  if (drafts.length === 0) {
    return {
      created: 0,
      skipped: 0,
      errors: ["No questions found in file. Check format or template."],
    };
  }

  const courses = await prisma.course.findMany({
    where: { ownerId: session.user.id },
  });
  const courseByName = new Map(courses.map((c) => [c.name.toLowerCase(), c.id]));

  const errors: string[] = [];
  let created = 0;
  const sortOrders = await allocateQuestionSortOrders(session.user.id, drafts.length);

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const courseIds = new Set<string>(defaultCourseIds);
    for (const name of d.courseNames) {
      const id = courseByName.get(name.toLowerCase());
      if (id) courseIds.add(id);
      else if (name) errors.push(`Course not found: "${name}" (question: ${d.title})`);
    }

    try {
      await prisma.question.create({
        data: {
          sortOrder: sortOrders[i],
          title: d.title,
          type: d.type,
          stem: d.stem as object,
          payload: d.payload as object,
          answerKey: d.answerKey as object,
          scoring: d.scoring as object,
          ownerId: session.user.id,
          courses: {
            create: [...courseIds].map((courseId) => ({ courseId })),
          },
        },
      });
      created++;
    } catch (e) {
      errors.push(
        `Failed to save "${d.title}": ${e instanceof Error ? e.message : "unknown"}`,
      );
    }
  }

  revalidatePath("/teacher/questions");
  return {
    created,
    skipped: drafts.length - created,
    errors: errors.slice(0, 20),
  };
}
