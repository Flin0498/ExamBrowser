"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  moveExamQuestion,
  removeExamQuestion,
  updateExamQuestionPoints,
} from "@/app/actions/teacher";

type PaperQ = {
  id: string;
  sortOrder: number;
  maxPoints: number;
  title: string;
};

export function ExamPaperEditor({
  examId,
  questions,
}: {
  examId: string;
  questions: PaperQ[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  if (questions.length === 0) {
    return <p className="text-sm text-slate-600">No questions on this paper yet.</p>;
  }

  return (
    <ol className="space-y-2 text-sm">
      {questions.map((eq, i) => (
        <li key={eq.id} className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium text-slate-900">
              {i + 1}. {eq.title}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const pts = Number(fd.get("points"));
                  run(() => updateExamQuestionPoints(eq.id, examId, pts));
                }}
                className="flex items-center gap-2"
              >
                <label className="text-xs text-slate-500">
                  Points
                  <input
                    name="points"
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={eq.maxPoints}
                    className="input ml-1 w-20 py-1 text-xs"
                  />
                </label>
                <button type="submit" disabled={pending} className="btn-secondary px-2 py-1 text-xs">
                  Set
                </button>
              </form>
              <button
                type="button"
                disabled={pending || i === 0}
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => run(() => moveExamQuestion(examId, eq.id, "up"))}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={pending || i === questions.length - 1}
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => run(() => moveExamQuestion(examId, eq.id, "down"))}
              >
                ↓
              </button>
              <Link
                href={`/teacher/exams/${examId}/snapshot/${eq.id}`}
                className="btn-secondary px-2 py-1 text-xs"
              >
                Edit snapshot
              </Link>
              <button
                type="button"
                disabled={pending}
                className="text-xs text-red-600 hover:underline"
                onClick={() => run(() => removeExamQuestion(eq.id, examId))}
              >
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
