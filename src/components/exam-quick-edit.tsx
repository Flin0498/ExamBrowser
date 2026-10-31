"use client";

import { updateExamBasics } from "@/app/actions/teacher";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Course = { id: string; name: string };

export function ExamQuickEdit({
  examId,
  title,
  courseId,
  courses,
}: {
  examId: string;
  title: string;
  courseId: string;
  courses: Course[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className="link text-sm" onClick={() => setOpen(true)}>
        Quick edit
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await updateExamBasics(examId, {
            title: String(fd.get("title")),
            courseId: String(fd.get("courseId")),
          });
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <label className="text-xs text-slate-600">
        Title
        <input name="title" required defaultValue={title} className="input mt-0.5 min-w-[12rem]" />
      </label>
      <label className="text-xs text-slate-600">
        Course
        <select name="courseId" defaultValue={courseId} className="input mt-0.5">
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="btn-primary px-3 py-1.5 text-xs">
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1.5 text-xs"
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </form>
  );
}
