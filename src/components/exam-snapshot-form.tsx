"use client";

import { useState } from "react";
import type { QuestionType } from "@prisma/client";
import { RichEditor } from "@/components/rich-editor";
import { saveExamQuestionSnapshot } from "@/app/actions/grading-teacher";
import { useRouter } from "next/navigation";
import { extractBlanksFromStem } from "@/lib/stem";

export function ExamSnapshotForm({
  examId,
  examQuestionId,
  initial,
}: {
  examId: string;
  examQuestionId: string;
  initial: {
    title: string;
    type: QuestionType;
    stem: unknown;
    payload: unknown;
    answerKey: unknown;
    scoring: unknown;
    maxPoints: number;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [stem, setStem] = useState(initial.stem);
  const [maxPoints, setMaxPoints] = useState(initial.maxPoints);
  const [payload, setPayload] = useState(initial.payload);
  const [answerKey, setAnswerKey] = useState(initial.answerKey);
  const [scoring, setScoring] = useState(initial.scoring);
  const [pending, setPending] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const blanks = extractBlanksFromStem(stem);
    let nextPayload = payload;
    let nextKey = answerKey;
    if (initial.type === "FILL_BLANK") {
      nextPayload = { blanks };
      const b: Record<string, string[]> = {};
      for (const blank of blanks) {
        b[blank.id] = blank.acceptedAnswers.length ? blank.acceptedAnswers : [""];
      }
      nextKey = { blanks: b };
    }
    await saveExamQuestionSnapshot(examQuestionId, examId, {
      title,
      type: initial.type,
      stem,
      payload: nextPayload,
      answerKey: nextKey,
      scoring,
      maxPoints,
    });
    setPending(false);
    router.push(`/teacher/exams/${examId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSave} className="card">
      <div className="card-body space-y-4">
        <p className="text-sm text-slate-600">
          Changes apply to this exam paper only (snapshot). The question bank is not modified.
        </p>
        <input
          className="input font-medium"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <p className="text-xs text-slate-500">Type: {initial.type}</p>
        <label className="label">
          Max points
          <input
            type="number"
            step={0.5}
            className="input mt-1 max-w-[8rem]"
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
        </label>
        <div>
          <p className="label mb-2">Stem (edit blanks: select blank in editor)</p>
          <RichEditor value={stem} onChange={setStem} />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save snapshot"}
        </button>
      </div>
    </form>
  );
}
