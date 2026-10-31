"use client";

import type { QuestionSnapshot, StudentResponse } from "@/types/question";
import { StemRenderer } from "@/components/stem-renderer";
import { ChoiceQuestion } from "@/components/choice-question";
import { MatchingSlotsQuestion } from "@/components/matching-slots-question";
import { emptyResponse } from "@/lib/completion";
import { presentChoiceOptions, presentMatchingItems } from "@/lib/snapshot-attempt";
import { maxMultipleChoiceSelections } from "@/lib/choice-limit";
import type { QuestionType } from "@prisma/client";

type Props = {
  snapshot: QuestionSnapshot;
  response: StudentResponse;
  onChange: (r: StudentResponse) => void;
  readOnly?: boolean;
  reviewMode?: boolean;
  grade?: { correct: boolean; score: number; maxPoints: number };
  correctAnswerLabel?: string;
};

export function QuestionView({
  snapshot,
  response,
  onChange,
  readOnly,
  reviewMode,
  grade,
  correctAnswerLabel,
}: Props) {
  const type = snapshot.type as QuestionType;

  return (
    <div className="exam-panel">
      {reviewMode && grade && (
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4 text-sm">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              grade.correct
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {grade.correct ? "Correct" : "Incorrect"}
          </span>
          <span className="text-slate-600">
            Mark {grade.score.toFixed(2)} out of {grade.maxPoints.toFixed(2)}
          </span>
        </div>
      )}
      <div className="exam-panel-stem mb-4">
        <StemRenderer
          doc={snapshot.stem}
          blanks={
            type === "FILL_BLANK"
              ? {
                  values: (response as { blanks?: Record<string, string> }).blanks ?? {},
                  onChange: (id, v) => {
                    const r = response as { blanks: Record<string, string> };
                    onChange({ blanks: { ...r.blanks, [id]: v } });
                  },
                  readOnly: readOnly,
                }
              : undefined
          }
        />
      </div>

      {(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (
        <ChoiceQuestion
          options={presentChoiceOptions(snapshot, reviewMode ? "review" : "attempt")}
          selectedIds={(response as { selectedIds: string[] }).selectedIds ?? []}
          multiple={type === "MULTIPLE_CHOICE"}
          maxSelect={
            type === "MULTIPLE_CHOICE" ? maxMultipleChoiceSelections(snapshot) : 1
          }
          readOnly={readOnly}
          showResult={reviewMode}
          correctIds={
            reviewMode
              ? type === "MULTIPLE_CHOICE"
                ? (snapshot.answerKey as { correctOptionIds: string[] }).correctOptionIds
                : [
                    (snapshot.answerKey as { correctOptionId: string }).correctOptionId,
                  ]
              : undefined
          }
          onToggle={(id) => {
            const r = response as { selectedIds: string[] };
            if (type === "SINGLE_CHOICE") {
              const next =
                r.selectedIds[0] === id ? [] : [id];
              onChange({ selectedIds: next });
              return;
            }
            const set = new Set(r.selectedIds ?? []);
            if (set.has(id)) {
              set.delete(id);
              onChange({ selectedIds: [...set] });
              return;
            }
            const max = maxMultipleChoiceSelections(snapshot);
            if (max != null && set.size >= max) return;
            set.add(id);
            onChange({ selectedIds: [...set] });
          }}
        />
      )}

      {type === "TRUE_FALSE" && (
        <div className="mt-4 flex gap-4">
          {([true, false] as const).map((val) => {
            const r = response as { value: boolean | null };
            const selected = r.value === val;
            return (
              <button
                key={String(val)}
                type="button"
                disabled={readOnly}
                onClick={() =>
                  onChange({ value: selected ? null : val })
                }
                className={`flex items-center gap-2 rounded border px-4 py-2 ${
                  selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                    selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400"
                  }`}
                >
                  {selected ? "✓" : ""}
                </span>
                {val ? "True" : "False"}
              </button>
            );
          })}
        </div>
      )}

      {type === "MATCHING_SLOTS" && (
        <MatchingSlotsQuestion
          payload={snapshot.payload as import("@/types/question").MatchingSlotsPayload}
          items={presentMatchingItems(snapshot, reviewMode ? "review" : "attempt")}
          slots={(response as { slots: Record<string, string | null> }).slots ?? {}}
          readOnly={readOnly}
          onSlotChange={(slotId, itemId) => {
            const r = response as { slots: Record<string, string | null> };
            onChange({ slots: { ...r.slots, [slotId]: itemId } });
          }}
        />
      )}

      {reviewMode && !grade?.correct && correctAnswerLabel && (
        <div className="mt-4 rounded-md border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-slate-800">
          <p className="font-medium">Your answer is incorrect.</p>
          <p>The correct answer is: {correctAnswerLabel}</p>
        </div>
      )}
    </div>
  );
}

export function defaultResponseForSnapshot(snapshot: QuestionSnapshot): StudentResponse {
  return emptyResponse(snapshot.type);
}
