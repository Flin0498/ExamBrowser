"use client";

import { deleteQuestion, deleteQuestions } from "@/app/actions/teacher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type BankRow = {
  id: string;
  title: string;
  type: string;
  courses: string;
};

export function QuestionBankTable({ questions }: { questions: BankRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const allChecked = questions.length > 0 && selected.length === questions.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allChecked ? [] : allIds);
  }

  function removeSelected() {
    if (selected.length === 0 || pending) return;
    const n = selected.length;
    if (!window.confirm(`Delete ${n} question${n === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    const ids = selected;
    startTransition(async () => {
      await deleteQuestions(ids);
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || selected.length === 0}
          onClick={removeSelected}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
        >
          {pending ? "Deleting…" : `Delete selected (${selected.length})`}
        </button>
        <span className="text-sm text-slate-500">
          {selected.length} selected
        </span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all questions"
                />
              </th>
              <th>Title</th>
              <th>Type</th>
              <th>Courses</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className={selected.includes(q.id) ? "bg-blue-50/60" : undefined}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={() => toggle(q.id)}
                    aria-label={`Select ${q.title}`}
                  />
                </td>
                <td className="font-medium">{q.title}</td>
                <td className="text-slate-600">{q.type}</td>
                <td className="text-slate-600">{q.courses}</td>
                <td className="text-right">
                  <Link href={`/teacher/questions/${q.id}/edit`} className="link">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="ml-3 text-sm text-red-600 hover:underline"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Delete "${q.title}"?`)) return;
                      startTransition(async () => {
                        await deleteQuestion(q.id);
                        setSelected((prev) => prev.filter((id) => id !== q.id));
                        router.refresh();
                      });
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
