"use client";

import { useRef, useState, useTransition } from "react";
import { importQuestionsFromUpload } from "@/app/actions/import-questions";
import type { ImportResult } from "@/lib/import/types";

type Course = { id: string; name: string };

export function QuestionImportPanel({ courses }: { courses: Course[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="card mb-6">
      <div className="card-body">
        <h2 className="font-semibold text-slate-900">Import from document</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload <strong>.json</strong>, <strong>.csv</strong>, <strong>.docx</strong>,{" "}
          <strong>.pdf</strong>, or <strong>.txt</strong>. PDFs with{" "}
          <strong>red-highlighted correct options</strong> auto-detect answers; otherwise use
          numbered questions + A/B/C/D (+ Answer line).
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href="/templates/questions-template.csv" className="link" download>
            Download CSV template
          </a>
          <a href="/templates/questions-template.json" className="link" download>
            Download JSON template
          </a>
        </div>

        <form
          ref={formRef}
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await importQuestionsFromUpload(fd);
              setResult(res);
              if (res.created > 0) formRef.current?.reset();
            });
          }}
        >
          <div>
            <label className="label">File</label>
            <input
              name="file"
              type="file"
              required
              accept=".json,.csv,.docx,.pdf,.txt,application/json,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="input mt-1.5"
            />
          </div>
          {courses.length > 0 && (
            <div>
              <p className="label">Default courses (optional)</p>
              <p className="text-xs text-slate-500">
                Applied to all imported questions. CSV/JSON can also list course names per row.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="courseIds" value={c.id} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
            {pending ? "Importing…" : "Import to question bank"}
          </button>
        </form>

        {result && (
          <div
            className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm"
            role="status"
          >
            <p className="font-medium text-slate-900">
              Created {result.created} question(s).
              {result.skipped > 0 && ` Skipped ${result.skipped}.`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-800">
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
