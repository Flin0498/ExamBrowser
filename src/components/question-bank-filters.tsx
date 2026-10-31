"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { QuestionType } from "@prisma/client";

const TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING_SLOTS",
];

export function QuestionBankFilters({
  courses,
}: {
  courses: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/teacher/questions?${next.toString()}`);
  }

  return (
    <form
      className="card mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        update("q", String(fd.get("q") || ""));
      }}
    >
      <div className="card-body flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="label">Search title</label>
          <input
            name="q"
            defaultValue={params.get("q") ?? ""}
            className="input mt-1"
            placeholder="Keyword"
          />
        </div>
        <div>
          <label className="label">Course</label>
          <select
            className="input mt-1"
            value={params.get("courseId") ?? ""}
            onChange={(e) => update("courseId", e.target.value)}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input mt-1"
            value={params.get("type") ?? ""}
            onChange={(e) => update("type", e.target.value)}
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </div>
    </form>
  );
}
