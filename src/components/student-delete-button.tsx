"use client";

import { deleteStudent } from "@/app/actions/teacher";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function StudentDeleteButton({
  studentId,
  label,
}: {
  studentId: string;
  label: string;
}) {
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
            `Delete student "${label}"?\n\nAll their exam attempts will be removed.`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          await deleteStudent(studentId);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
