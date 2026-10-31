"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExamRoster } from "@/app/actions/teacher";

export type RosterStudent = {
  id: string;
  name: string;
  studentNo: string | null;
  classGroup: string | null;
};

export function ExamStudentRoster({
  examId,
  restrictStudents,
  enrolledIds,
  students,
}: {
  examId: string;
  restrictStudents: boolean;
  enrolledIds: string[];
  students: RosterStudent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [limited, setLimited] = useState(restrictStudents);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(restrictStudents ? enrolledIds : students.map((s) => s.id)),
  );
  const [message, setMessage] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, RosterStudent[]>();
    for (const s of students) {
      const key = s.classGroup?.trim() || "No class";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [students]);

  const allIds = useMemo(() => students.map((s) => s.id), [students]);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMessage(null);
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
    setMessage(null);
  }

  function toggleClass(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      await updateExamRoster(examId, {
        restrictStudents: limited,
        studentIds: limited ? [...selected] : [],
      });
      setMessage(
        limited
          ? `Saved. ${selected.size} student(s) can take this exam.`
          : "Saved. All students can take this exam.",
      );
      router.refresh();
    });
  }

  return (
    <div className="text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={limited}
          onChange={(e) => {
            setLimited(e.target.checked);
            if (e.target.checked && selected.size === 0) {
              setSelected(new Set(allIds));
            }
            setMessage(null);
          }}
        />
        Only selected students may take this exam
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Leave unchecked so every student can see and start this exam.
      </p>

      {limited && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={toggleAll}>
              {allChecked ? "Clear all" : "Select all"}
            </button>
            <span className="text-xs text-slate-500">
              {selected.size} / {students.length} selected
            </span>
          </div>
          {students.length === 0 ? (
            <p className="text-slate-600">No students in the system yet.</p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {groups.map(([cls, rows]) => {
                const ids = rows.map((s) => s.id);
                const classAll = ids.every((id) => selected.has(id));
                return (
                  <div key={cls}>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={classAll}
                        onChange={() => toggleClass(ids)}
                      />
                      {cls}
                    </label>
                    <ul className="space-y-1">
                      {rows.map((s) => (
                        <li key={s.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 hover:border-slate-300">
                            <input
                              type="checkbox"
                              checked={selected.has(s.id)}
                              onChange={() => toggle(s.id)}
                            />
                            <span className="font-medium text-slate-900">{s.name}</span>
                            <span className="font-mono text-xs text-slate-500">
                              {s.studentNo ?? "—"}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {message && (
        <p className="mt-3 text-slate-700" role="status">
          {message}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="btn-primary mt-4 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save students"}
      </button>
    </div>
  );
}
