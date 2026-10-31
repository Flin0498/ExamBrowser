"use client";

import { autoRegradeAnswer, setManualAnswerScore } from "@/app/actions/grading-teacher";
import { QuestionView } from "@/components/question-view";
import type { QuestionSnapshot, StudentResponse } from "@/types/question";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type RegradeItem = {
  attemptQuestionId: string;
  index: number;
  title: string;
  maxPoints: number;
  score: number;
  manualOverride: boolean;
  snapshot: QuestionSnapshot;
  response: StudentResponse;
  studentAnswer: string;
  correctAnswer: string;
  correct: boolean;
};

export function AttemptRegradePanel({
  examId,
  attemptId,
  items,
}: {
  examId: string;
  attemptId: string;
  items: RegradeItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <section key={item.attemptQuestionId} className="card">
          <div className="card-body space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Question {item.index}
                </p>
                <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const score = Number(fd.get("score"));
                    startTransition(async () => {
                      await setManualAnswerScore(
                        attemptId,
                        item.attemptQuestionId,
                        score,
                        examId,
                      );
                      router.refresh();
                    });
                  }}
                >
                  <input
                    name="score"
                    type="number"
                    step={0.01}
                    min={0}
                    max={item.maxPoints}
                    defaultValue={item.score.toFixed(2)}
                    className="input w-24 py-1 text-sm"
                  />
                  <span className="text-slate-500">/ {item.maxPoints}</span>
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-secondary px-2 py-1 text-xs"
                  >
                    Set
                  </button>
                </form>
                <button
                  type="button"
                  disabled={pending}
                  className="link text-sm"
                  onClick={() =>
                    startTransition(async () => {
                      await autoRegradeAnswer(attemptId, item.attemptQuestionId, examId);
                      router.refresh();
                    })
                  }
                >
                  Auto regrade
                </button>
                {item.manualOverride && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Manual
                  </span>
                )}
              </div>
            </div>

            <dl className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Student answer
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{item.studentAnswer}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Correct answer
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{item.correctAnswer}</dd>
              </div>
            </dl>

            <QuestionView
              snapshot={item.snapshot}
              response={item.response}
              onChange={() => {}}
              readOnly
              reviewMode
              grade={{
                correct: item.correct,
                score: item.score,
                maxPoints: item.maxPoints,
              }}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
