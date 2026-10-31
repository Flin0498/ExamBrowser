"use client";

import type { ChoiceOption } from "@/types/question";
import { StemRenderer } from "@/components/stem-renderer";

export function ChoiceQuestion({
  options,
  selectedIds,
  onToggle,
  multiple,
  maxSelect,
  readOnly,
  showResult,
  correctIds,
}: {
  options: ChoiceOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multiple: boolean;
  maxSelect?: number | null;
  readOnly?: boolean;
  showResult?: boolean;
  correctIds?: string[];
}) {
  const selected = new Set(selectedIds);
  const correct = new Set(correctIds ?? []);
  const atMax =
    multiple && maxSelect != null && selected.size >= maxSelect && !readOnly;

  return (
    <div className="mt-4">
      {multiple && maxSelect != null && !readOnly && (
        <p className="mb-2 text-sm text-slate-600">
          Select up to {maxSelect} answer{maxSelect === 1 ? "" : "s"}
          {atMax ? " (limit reached)" : ""}.
        </p>
      )}
    <ul className="space-y-3">
      {options.map((opt) => {
        const isSelected = selected.has(opt.id);
        const isCorrect = correct.has(opt.id);
        const showWrong = showResult && isSelected && !isCorrect;
        const showRight = showResult && isCorrect;
        const lockedOut = atMax && !isSelected;

        return (
          <li key={opt.id}>
            <button
              type="button"
              disabled={readOnly || lockedOut}
              onClick={() => onToggle(opt.id)}
              className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left shadow-sm transition ${
                isSelected
                  ? "border-blue-500 bg-blue-50/80 ring-1 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              } ${readOnly || lockedOut ? "cursor-default" : "cursor-pointer"} ${
                lockedOut ? "opacity-50" : ""
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                  isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400 bg-white"
                }`}
              >
                {isSelected ? "✓" : ""}
              </span>
              <span className="font-medium text-slate-700">{opt.label}.</span>
              <div className="flex-1">
                <StemRenderer doc={opt.content} />
              </div>
              {showWrong && <span className="text-red-600 font-bold">✗</span>}
              {showRight && showResult && (
                <span className="text-green-600 font-bold">✓</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
