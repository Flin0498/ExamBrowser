"use client";

import { deleteExam } from "@/app/actions/teacher";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ExamDeleteButton({ examId, title }: { examId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
      onClick={() => {
        if (
          !window.confirm(
            `Delete "${title}"?\n\nThis removes the paper, settings, and all student attempts.`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          await deleteExam(examId);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
