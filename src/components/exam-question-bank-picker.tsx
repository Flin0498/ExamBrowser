"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addQuestionsToExam } from "@/app/actions/teacher";
import type { QuestionType } from "@prisma/client";

type BankItem = {
  id: string;
  title: string;
  type: QuestionType;
};

export function ExamQuestionBankPicker({
  examId,
  courseName,
  bank,
  inPaperIds,
}: {
  examId: string;
  courseName: string;
  bank: BankItem[];
  inPaperIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inPaper = useMemo(() => new Set(inPaperIds), [inPaperIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const available = bank.filter((q) => !inPaper.has(q.id));
  const availableIds = available.map((q) => q.id);
  const selectedCount = [...selected].filter((id) => !inPaper.has(id)).length;
  const allAvailableChecked =
    availableIds.length > 0 && availableIds.every((id) => selected.has(id));
  const canSubmit = available.length > 0 && selectedCount > 0 && !pending;

  function toggleAllAvailable() {
    setSelected((prev) => {
      if (allAvailableChecked) return new Set();
      return new Set(availableIds);
    });
    setMessage(null);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMessage(null);
  }

  function handleAdd() {
    const ids = [...selected].filter((id) => !inPaper.has(id));
    if (ids.length === 0) {
      setMessage("Select at least one question.");
      return;
    }
    startTransition(async () => {
      await addQuestionsToExam(examId, ids);
      setSelected(new Set());
      setMessage(`${ids.length} question(s) added.`);
      router.refresh();
    });
  }

  if (bank.length === 0) {
    return (
      <div className="text-sm text-slate-600">
        <p>
          No questions in this course. In{" "}
          <a href="/teacher/questions/new" className="link">Question bank</a>, create questions and
          assign course &quot;{courseName}&quot;.
        </p>
        <button type="button" disabled className="btn-secondary mt-4 cursor-not-allowed opacity-50">
          Add selected
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm">
      {available.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={toggleAllAvailable}
          >
            {allAvailableChecked ? "Clear all" : "Select all"}
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={allAvailableChecked}
              onChange={toggleAllAvailable}
            />
            Select all available ({available.length})
          </label>
        </div>
      )}
      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {bank.map((q) => {
          const already = inPaper.has(q.id);
          const checked = selected.has(q.id);
          return (
            <li key={q.id}>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition ${
                  already
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                    : checked
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={already}
                  checked={already || checked}
                  onChange={() => !already && toggle(q.id)}
                />
                <span>
                  <span className="font-medium text-slate-900">{q.title}</span>
                  <span className="ml-2 text-slate-500">({q.type})</span>
                  {already && <span className="ml-2 text-xs text-slate-500">Already on paper</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {message && (
        <p className="mt-3 text-sm text-slate-700" role="status">{message}</p>
      )}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleAdd}
        className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Adding…" : `Add selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
      </button>
      {available.length > 0 && selectedCount === 0 && (
        <p className="mt-2 text-xs text-slate-500">Tick one or more questions above, then click Add selected.</p>
      )}
    </div>
  );
}
