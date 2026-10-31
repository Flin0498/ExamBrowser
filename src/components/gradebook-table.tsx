"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type GradebookRow = {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentNo: string | null;
  classGroup: string | null;
  totalScore: number;
  maxScore: number;
  partScores: number[][];
  responses: unknown[];
};

export function GradebookTable({
  examId,
  rows,
  questionLabels,
  partLabels,
}: {
  examId: string;
  rows: GradebookRow[];
  questionLabels: string[];
  partLabels: string[][];
}) {
  const [sortKey, setSortKey] = useState<string>("name");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === "name") return a.studentName.localeCompare(b.studentName);
      if (sortKey === "studentNo") {
        return (a.studentNo ?? "").localeCompare(b.studentNo ?? "");
      }
      if (sortKey === "class") {
        return (a.classGroup ?? "").localeCompare(b.classGroup ?? "");
      }
      if (sortKey === "total") return b.totalScore - a.totalScore;
      if (sortKey.startsWith("q")) {
        const qi = Number(sortKey.slice(1));
        const as = a.partScores[qi]?.reduce((s, x) => s + x, 0) ?? 0;
        const bs = b.partScores[qi]?.reduce((s, x) => s + x, 0) ?? 0;
        return bs - as;
      }
      return 0;
    });
    return copy;
  }, [rows, sortKey]);

  const flatCols = partLabels.flatMap((parts, qi) =>
    parts.map((p, pi) => ({ key: `Q${qi + 1}-${pi + 1}`, label: `${questionLabels[qi]} ${p}` })),
  );

  return (
    <div className="space-y-3">
      <label className="text-sm">
        Sort by
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="ml-2 rounded border px-2 py-1"
        >
          <option value="name">Student name</option>
          <option value="studentNo">Student ID</option>
          <option value="class">Class</option>
          <option value="total">Total score</option>
          {questionLabels.map((_, i) => (
            <option key={i} value={`q${i}`}>Question {i + 1}</option>
          ))}
        </select>
      </label>
      <div className="max-h-[70vh] max-w-full overflow-auto rounded border border-slate-300 bg-white">
        <table className="min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              <th className="sticky left-0 z-20 border border-slate-300 bg-slate-100 px-3 py-2 text-left">
                Student
              </th>
              <th className="border border-slate-300 px-3 py-2">Total</th>
              <th className="border border-slate-300 px-3 py-2">Regrade</th>
              {flatCols.map((c) => (
                <th key={c.key} className="border border-slate-300 px-2 py-2 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <FragmentRow
                key={row.attemptId}
                examId={examId}
                row={row}
                expanded={expanded}
                setExpanded={setExpanded}
                flatCols={flatCols}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRow({
  examId,
  row,
  expanded,
  setExpanded,
  flatCols,
}: {
  examId: string;
  row: GradebookRow;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  flatCols: { key: string; label: string }[];
}) {
  return (
    <>
                <tr className="hover:bg-slate-50">
                  <td className="sticky left-0 z-10 border border-slate-300 bg-white px-3 py-2 font-medium">
                    <button
                      type="button"
                      className="text-left text-blue-700 hover:underline"
                      onClick={() =>
                        setExpanded(expanded === row.studentId ? null : row.studentId)
                      }
                    >
                      <span className="block">{row.studentName}</span>
                      <span className="mt-0.5 block font-normal text-[10px] text-slate-500">
                        {[row.studentNo, row.classGroup].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </button>
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    {row.totalScore.toFixed(2)} / {row.maxScore.toFixed(2)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    <Link
                      href={`/teacher/exams/${examId}/grade/${row.attemptId}`}
                      className="link whitespace-nowrap"
                    >
                      Edit scores
                    </Link>
                  </td>
                  {row.partScores.flatMap((parts, qi) =>
                    parts.map((score, pi) => (
                      <td key={`${row.studentId}-${qi}-${pi}`} className="border border-slate-300 px-2 py-2 text-center">
                        {score.toFixed(2)}
                      </td>
                    )),
                  )}
                </tr>
                {expanded === row.studentId && (
                  <tr>
                    <td colSpan={3 + flatCols.length} className="border border-slate-300 bg-slate-50 p-3">
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px]">
                        {JSON.stringify(row.responses, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
    </>
  );
}
