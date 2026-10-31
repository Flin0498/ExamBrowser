"use client";

import { updateStudent } from "@/app/actions/teacher";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function StudentQuickEdit({
  studentId,
  username,
  name,
  studentNo,
  classGroup,
}: {
  studentId: string;
  username: string;
  name: string;
  studentNo: string | null;
  classGroup: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className="link text-sm" onClick={() => setOpen(true)}>
        Edit
      </button>
    );
  }

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await updateStudent(studentId, {
            username: String(fd.get("username")),
            name: String(fd.get("name")),
            studentNo: String(fd.get("studentNo") || ""),
            classGroup: String(fd.get("classGroup") || ""),
            password: String(fd.get("password") || ""),
          });
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <label className="text-xs text-slate-600">
        Student ID (学号)
        <input
          name="studentNo"
          placeholder="e.g. 20240001"
          defaultValue={studentNo ?? ""}
          className="input mt-0.5 w-28"
        />
      </label>
      <label className="text-xs text-slate-600">
        Class (班别)
        <input
          name="classGroup"
          placeholder="e.g. CS-370-A"
          defaultValue={classGroup ?? ""}
          className="input mt-0.5 w-28"
        />
      </label>
      <label className="text-xs text-slate-600">
        Name
        <input name="name" required defaultValue={name} className="input mt-0.5 min-w-[8rem]" />
      </label>
      <label className="text-xs text-slate-600">
        Username
        <input name="username" required defaultValue={username} className="input mt-0.5 w-28" />
      </label>
      <label className="text-xs text-slate-600">
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Leave blank to keep"
          className="input mt-0.5 w-32"
        />
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
