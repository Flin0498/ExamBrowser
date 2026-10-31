"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { QuestionNavigator } from "@/components/question-navigator";
import { QuestionView } from "@/components/question-view";
import type { QuestionSnapshot, StudentResponse } from "@/types/question";
import type { AnswerCompletion } from "@prisma/client";
import { saveAnswer, navigateAttempt } from "@/app/actions/student";
import { computeCompletion } from "@/lib/completion";
import { useRouter } from "next/navigation";
import { AttemptTimer } from "@/components/attempt-timer";
import { formatCorrectAnswerLabel } from "@/lib/correct-answer-label";

type QState = {
  sortOrder: number;
  snapshot: QuestionSnapshot;
  response: StudentResponse;
  completion: AnswerCompletion;
};

export function AttemptWorkspace({
  attemptId,
  examTitle,
  allowQuestionJump,
  allowGoBack,
  currentIndex: initialIndex,
  questions,
  mode = "attempt",
  graded,
  deadlineIso,
}: {
  attemptId: string;
  examTitle: string;
  allowQuestionJump: boolean;
  allowGoBack: boolean;
  currentIndex: number;
  questions: QState[];
  mode?: "attempt" | "review";
  graded?: Array<{ score: number; maxPoints: number; correct: boolean }>;
  deadlineIso?: string;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [items, setItems] = useState(questions);
  const [, startTransition] = useTransition();

  const current = items[currentIndex];

  const navItems = useMemo(
    () => items.map((q, i) => ({ index: i, completion: q.completion })),
    [items],
  );

  const progress = items.length ? ((currentIndex + 1) / items.length) * 100 : 0;

  const persist = useCallback(
    (sortOrder: number, response: StudentResponse, completion: AnswerCompletion) => {
      setItems((prev) =>
        prev.map((q) =>
          q.sortOrder === sortOrder ? { ...q, response, completion } : q,
        ),
      );
      startTransition(() => {
        void saveAnswer(attemptId, sortOrder, response);
      });
    },
    [attemptId],
  );

  async function goNext() {
    if (mode !== "attempt") return;
    if (currentIndex >= items.length - 1) {
      router.push(`/student/attempts/${attemptId}/review`);
      return;
    }
    const res = await navigateAttempt(attemptId, "next");
    if (res.atEnd) {
      router.push(`/student/attempts/${attemptId}/review`);
      return;
    }
    setCurrentIndex(res.currentIndex);
    router.refresh();
  }

  async function goTo(index: number) {
    if (mode === "review") {
      setCurrentIndex(index);
      document.getElementById(`question-block-${index}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!allowQuestionJump) return;
    if (!allowGoBack && index < currentIndex) return;
    const res = await navigateAttempt(attemptId, "goto", index);
    setCurrentIndex(res.currentIndex);
  }

  if (mode === "review") {
    return (
      <ReviewScrollLayout
        examTitle={examTitle}
        items={items}
        graded={graded}
        navItems={navItems}
        onSelect={goTo}
      />
    );
  }

  if (!current) return null;

  const grade = graded?.[currentIndex];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">{examTitle}</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Question {currentIndex + 1} of {items.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {deadlineIso && (
                <AttemptTimer attemptId={attemptId} deadlineIso={deadlineIso} />
              )}
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-sm font-medium text-slate-800">{current.snapshot.title}</p>
          <QuestionView
            snapshot={current.snapshot}
            response={current.response}
            onChange={(r) => {
              const completion = computeCompletion(current.snapshot, r);
              persist(current.sortOrder, r, completion);
            }}
            readOnly={false}
            reviewMode={false}
            grade={grade}
          />
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200/80 pt-6">
            {allowGoBack && currentIndex > 0 && (
              <button type="button" onClick={() => goTo(currentIndex - 1)} className="btn-secondary">
                Back
              </button>
            )}
            <button type="button" onClick={goNext} className="btn-primary min-w-[7rem]">
              Next →
            </button>
          </div>
        </div>
        <aside className="hidden w-[15rem] shrink-0 md:block">
          <div className="card sticky top-24 p-3">
            <QuestionNavigator
              items={navItems}
              currentIndex={currentIndex}
              onSelect={goTo}
              allowJump={allowQuestionJump}
              minIndex={allowGoBack ? 0 : currentIndex}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewScrollLayout({
  examTitle,
  items,
  graded,
  navItems,
  onSelect,
}: {
  examTitle: string;
  items: QState[];
  graded?: Array<{ score: number; maxPoints: number; correct: boolean }>;
  navItems: Array<{ index: number; completion: AnswerCompletion }>;
  onSelect: (i: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <h1 className="text-lg font-semibold text-slate-900">{examTitle}</h1>
          <p className="text-sm text-slate-600">Answer review</p>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
        <div className="min-w-0 flex-1 space-y-10">
          {items.map((q, i) => (
            <div key={q.sortOrder} id={`question-block-${i}`} className="scroll-mt-24">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Question {i + 1}
              </p>
              <QuestionView
                snapshot={q.snapshot}
                response={q.response}
                onChange={() => {}}
                readOnly
                reviewMode
                grade={graded?.[i]}
                correctAnswerLabel={formatCorrectAnswerLabel(q.snapshot)}
              />
            </div>
          ))}
        </div>
        <aside className="hidden w-[15rem] shrink-0 md:block">
          <div className="card sticky top-8 p-3">
            <QuestionNavigator
              items={navItems}
              currentIndex={currentIndex}
              onSelect={(idx) => {
                setCurrentIndex(idx);
                onSelect(idx);
              }}
              allowJump
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
