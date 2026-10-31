"use client";

import { QuestionNavigator } from "@/components/question-navigator";
import { submitAttempt } from "@/app/actions/student";
import type { AnswerCompletion } from "@prisma/client";
import { useTransition } from "react";

export function PreSubmitReview({
  attemptId,
  items,
}: {
  attemptId: string;
  items: Array<{ index: number; completion: AnswerCompletion }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="card w-full max-w-lg text-center">
        <div className="card-body">
          <h1 className="text-xl font-semibold text-slate-900">Review before submit</h1>
          <p className="mt-2 text-sm text-slate-600">
            Check each question number. Green marks mean fully answered.
          </p>
          <div className="mt-8 flex justify-center">
            <QuestionNavigator
              layout="center"
              items={items}
              currentIndex={-1}
              allowJump={false}
              onSelect={() => {}}
            />
          </div>
          <button
            type="button"
            disabled={pending}
            className="btn-primary mt-10 w-full max-w-xs py-2.5 text-base"
            onClick={() => startTransition(() => submitAttempt(attemptId))}
          >
            {pending ? "Submitting…" : "Submit"}
          </button>
          <p className="mt-4 text-sm">
            <a href={`/student/attempts/${attemptId}`} className="link">
              Return to exam
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
