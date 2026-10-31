"use client";

import { useState } from "react";
import type { QuestionType } from "@prisma/client";
import { RichEditor } from "@/components/rich-editor";
import { saveQuestion } from "@/app/actions/teacher";
import { useRouter } from "next/navigation";

type Course = { id: string; name: string };
type Category = { id: string; name: string };

const TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING_SLOTS",
];

export function QuestionForm({
  courses,
  categories,
  initial,
  sequence,
  sequenceIndex = 0,
}: {
  courses: Course[];
  categories: Category[];
  sequence?: string[];
  sequenceIndex?: number;
  initial?: {
    id: string;
    title: string;
    type: QuestionType;
    stem: unknown;
    payload: unknown;
    answerKey: unknown;
    scoring: unknown;
    courseIds: string[];
    categoryIds: string[];
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SINGLE_CHOICE");
  const [stem, setStem] = useState<unknown>(
    initial?.stem ?? { type: "doc", content: [{ type: "paragraph" }] },
  );
  const [courseIds, setCourseIds] = useState<string[]>(initial?.courseIds ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);

  const [options, setOptions] = useState(
    (initial?.payload as { options?: Array<{ id: string; label: string; content: unknown }> })
      ?.options ?? [
      { id: "a", label: "A", content: { type: "doc", content: [{ type: "paragraph" }] } },
      { id: "b", label: "B", content: { type: "doc", content: [{ type: "paragraph" }] } },
    ],
  );
  const [correctSingle, setCorrectSingle] = useState(
    (initial?.answerKey as { correctOptionId?: string })?.correctOptionId ?? "a",
  );
  const [correctMulti, setCorrectMulti] = useState<string[]>(
    (initial?.answerKey as { correctOptionIds?: string[] })?.correctOptionIds ?? [],
  );
  const [trueFalse, setTrueFalse] = useState(
    (initial?.answerKey as { value?: boolean })?.value ?? true,
  );
  const [matching, setMatching] = useState<{
    slots: Array<{ id: string; label: string }>;
    items: Array<{ id: string; text: string }>;
  }>(() => {
    const p = initial?.payload as {
      slots?: Array<{ id: string; label: string }>;
      items?: Array<{ id: string; text: string }>;
    };
    return {
      slots: p?.slots ?? [{ id: "s1", label: "Slot 1" }],
      items: p?.items ?? [{ id: "i1", text: "Item 1" }],
    };
  });
  const [matchingKey, setMatchingKey] = useState<Record<string, string>>(
    (initial?.answerKey as { slots?: Record<string, string> })?.slots ?? { s1: "i1" },
  );
  const [maxPoints, setMaxPoints] = useState(
    Number((initial?.scoring as { maxPoints?: number })?.maxPoints ?? 1),
  );
  const [scoringMode, setScoringMode] = useState(() => {
    const s = initial?.scoring as { mode?: string } | undefined;
    if (s?.mode) return s.mode;
    return "all_or_nothing";
  });
  const [pointsPerCorrect, setPointsPerCorrect] = useState(
    Number((initial?.scoring as { pointsPerCorrect?: number })?.pointsPerCorrect ?? 1),
  );
  const [penaltyPerWrong, setPenaltyPerWrong] = useState(
    Number((initial?.scoring as { penaltyPerWrong?: number })?.penaltyPerWrong ?? 0),
  );
  const [floorAtZero, setFloorAtZero] = useState(
    (initial?.scoring as { floorAtZero?: boolean })?.floorAtZero ?? true,
  );
  const [saving, setSaving] = useState(false);

  function buildScoring() {
    if (type === "MULTIPLE_CHOICE" && scoringMode === "multiple_choice") {
      return {
        mode: "multiple_choice",
        maxPoints,
        pointsPerCorrect,
        penaltyPerWrong,
        floorAtZero,
      };
    }
    if (
      (type === "FILL_BLANK" || type === "MATCHING_SLOTS") &&
      scoringMode === "per_part"
    ) {
      return { mode: "per_part", maxPoints };
    }
    return { mode: "all_or_nothing", maxPoints };
  }

  function buildPayloadAndKey() {
    switch (type) {
      case "SINGLE_CHOICE":
      case "MULTIPLE_CHOICE":
        return {
          payload: { options },
          answerKey:
            type === "SINGLE_CHOICE"
              ? { correctOptionId: correctSingle }
              : { correctOptionIds: correctMulti },
          scoring: buildScoring(),
        };
      case "TRUE_FALSE":
        return {
          payload: {},
          answerKey: { value: trueFalse },
          scoring: buildScoring(),
        };
      case "FILL_BLANK":
        return {
          payload: { blanks: [] },
          answerKey: { blanks: {} },
          scoring: buildScoring(),
        };
      case "MATCHING_SLOTS":
        return {
          payload: matching,
          answerKey: { slots: matchingKey },
          scoring: buildScoring(),
        };
      default:
        return { payload: {}, answerKey: {}, scoring: buildScoring() };
    }
  }

  async function persist() {
    const built = buildPayloadAndKey();
    await saveQuestion({
      id: initial?.id,
      title,
      type,
      stem,
      payload: built.payload,
      answerKey: built.answerKey,
      scoring: built.scoring,
      courseIds,
      categoryIds,
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await persist();
    setSaving(false);
    router.push("/teacher/questions");
    router.refresh();
  }

  async function openQuestion(id: string) {
    if (!id || id === initial?.id || saving) return;
    if (!title.trim()) return;
    setSaving(true);
    try {
      await persist();
      router.push(`/teacher/questions/${id}/edit`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const prevId = sequence && sequenceIndex > 0 ? sequence[sequenceIndex - 1] : undefined;
  const nextId =
    sequence && sequenceIndex < sequence.length - 1 ? sequence[sequenceIndex + 1] : undefined;

  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
    <form onSubmit={onSubmit} className="order-2 min-w-0 w-full flex-1 space-y-6 rounded border bg-white p-6 lg:order-1">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="Question title"
        className="w-full rounded border px-3 py-2 font-medium"
      />
      <div className="flex flex-wrap gap-4">
        <label className="text-sm">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="ml-2 rounded border px-2 py-1"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Max points
          <input
            type="number"
            min={0}
            step={0.5}
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
            className="ml-2 w-20 rounded border px-2 py-1"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Stem</p>
        <RichEditor value={stem} onChange={setStem} />
      </div>

      {(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Options</p>
          {options.map((opt, idx) => (
            <div key={opt.id} className="rounded border p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = { ...opt, label: e.target.value };
                    setOptions(next);
                  }}
                  className="w-12 rounded border px-1"
                />
                {type === "SINGLE_CHOICE" ? (
                  <input
                    type="radio"
                    name="correct"
                    checked={correctSingle === opt.id}
                    onChange={() => setCorrectSingle(opt.id)}
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={correctMulti.includes(opt.id)}
                    onChange={() => {
                      setCorrectMulti((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((x) => x !== opt.id)
                          : [...prev, opt.id],
                      );
                    }}
                  />
                )}
                <span className="text-xs text-slate-500">Correct</span>
              </div>
              <RichEditor
                value={opt.content}
                onChange={(json) => {
                  const next = [...options];
                  next[idx] = { ...opt, content: json };
                  setOptions(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-blue-600"
            onClick={() =>
              setOptions([
                ...options,
                {
                  id: `opt_${options.length}`,
                  label: String.fromCharCode(65 + options.length),
                  content: { type: "doc", content: [{ type: "paragraph" }] },
                },
              ])
            }
          >
            + Add option
          </button>
        </div>
      )}

      {type === "TRUE_FALSE" && (
        <label className="flex items-center gap-2 text-sm">
          Correct answer:
          <select
            value={trueFalse ? "true" : "false"}
            onChange={(e) => setTrueFalse(e.target.value === "true")}
            className="rounded border px-2 py-1"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-medium text-slate-900">Scoring rules</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(type === "FILL_BLANK" || type === "MATCHING_SLOTS") && (
            <label>
              Mode
              <select
                value={scoringMode}
                onChange={(e) => setScoringMode(e.target.value)}
                className="ml-2 rounded border px-2 py-1"
              >
                <option value="per_part">Partial credit per blank/slot</option>
                <option value="all_or_nothing">All or nothing</option>
              </select>
            </label>
          )}
          {type === "MULTIPLE_CHOICE" && (
            <>
              <label>
                Mode
                <select
                  value={scoringMode}
                  onChange={(e) => setScoringMode(e.target.value)}
                  className="ml-2 rounded border px-2 py-1"
                >
                  <option value="multiple_choice">Custom (+/− per option)</option>
                  <option value="all_or_nothing">All or nothing</option>
                </select>
              </label>
              {scoringMode === "multiple_choice" && (
                <>
                  <label>
                    + per correct
                    <input
                      type="number"
                      step={0.25}
                      value={pointsPerCorrect}
                      onChange={(e) => setPointsPerCorrect(Number(e.target.value))}
                      className="ml-1 w-16 rounded border px-1"
                    />
                  </label>
                  <label>
                    − per wrong
                    <input
                      type="number"
                      step={0.25}
                      value={penaltyPerWrong}
                      onChange={(e) => setPenaltyPerWrong(Number(e.target.value))}
                      className="ml-1 w-16 rounded border px-1"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={floorAtZero}
                      onChange={(e) => setFloorAtZero(e.target.checked)}
                    />
                    Floor at 0
                  </label>
                </>
              )}
            </>
          )}
          {(type === "SINGLE_CHOICE" || type === "TRUE_FALSE") && (
            <p className="text-slate-600">All or nothing ({maxPoints} pt max).</p>
          )}
        </div>
      </div>

      {type === "MATCHING_SLOTS" && (
        <MatchingEditor
          matching={matching}
          matchingKey={matchingKey}
          onChange={(m, k) => {
            setMatching(m);
            setMatchingKey(k);
          }}
        />
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Courses</p>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={courseIds.includes(c.id)}
                onChange={() =>
                  setCourseIds((prev) =>
                    prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                  )
                }
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Categories</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={categoryIds.includes(c.id)}
                onChange={() =>
                  setCategoryIds((prev) =>
                    prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                  )
                }
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {sequence && sequence.length > 1 && (
          <>
            <button
              type="button"
              disabled={saving || !prevId}
              onClick={() => prevId && openQuestion(prevId)}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={saving || !nextId}
              onClick={() => nextId && openQuestion(nextId)}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
            <span className="text-sm text-slate-500">
              {sequenceIndex + 1} / {sequence.length}
            </span>
          </>
        )}
      </div>
    </form>
    {sequence && sequence.length > 1 && (
      <aside className="order-1 w-full shrink-0 lg:sticky lg:top-24 lg:order-2 lg:w-48">
        <div className="card max-h-[70vh] overflow-y-auto p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Questions
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {sequence.map((id, i) => (
              <button
                key={id}
                type="button"
                disabled={saving}
                onClick={() => openQuestion(id)}
                className={`h-8 rounded text-xs font-medium ${
                  i === sequenceIndex
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </aside>
    )}
    </div>
  );
}

function MatchingEditor({
  matching,
  matchingKey,
  onChange,
}: {
  matching: { slots: Array<{ id: string; label: string }>; items: Array<{ id: string; text: string }> };
  matchingKey: Record<string, string>;
  onChange: (m: typeof matching, k: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">Slots & items</p>
      {matching.slots.map((slot, si) => (
        <div key={slot.id} className="flex flex-wrap items-center gap-2">
          <input
            value={slot.label}
            onChange={(e) => {
              const slots = [...matching.slots];
              slots[si] = { ...slot, label: e.target.value };
              onChange({ ...matching, slots }, matchingKey);
            }}
            className="w-32 rounded border px-2 py-1"
          />
          <span>→</span>
          <select
            value={matchingKey[slot.id] ?? ""}
            onChange={(e) =>
              onChange(matching, { ...matchingKey, [slot.id]: e.target.value })
            }
            className="rounded border px-2 py-1"
          >
            {matching.items.map((it) => (
              <option key={it.id} value={it.id}>{it.text}</option>
            ))}
          </select>
        </div>
      ))}
      {matching.items.map((item, ii) => (
        <input
          key={item.id}
          value={item.text}
          onChange={(e) => {
            const items = [...matching.items];
            items[ii] = { ...item, text: e.target.value };
            onChange({ ...matching, items }, matchingKey);
          }}
          className="input"
          placeholder={`Draggable item ${ii + 1}`}
        />
      ))}
    </div>
  );
}
