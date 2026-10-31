"use client";

import type { AnswerCompletion } from "@prisma/client";

export type NavItem = {
  index: number;
  completion: AnswerCompletion;
};

export function QuestionNavigator({
  items,
  currentIndex,
  onSelect,
  allowJump,
  minIndex = 0,
  layout = "sidebar",
}: {
  items: NavItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  allowJump: boolean;
  minIndex?: number;
  layout?: "sidebar" | "center";
}) {
  const wrapper =
    layout === "center"
      ? "flex flex-wrap justify-center gap-3"
      : "grid grid-cols-5 gap-1.5";

  return (
    <nav className={layout === "sidebar" ? "w-[13.5rem] shrink-0" : ""}>
      {layout === "sidebar" && (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Items
        </p>
      )}
      <div className={wrapper}>
        {items.map((item) => {
          const n = item.index + 1;
          const isCurrent = item.index === currentIndex;
          const color =
            item.completion === "COMPLETE"
              ? "text-slate-900"
              : item.completion === "PARTIAL"
                ? "text-amber-700"
                : "text-slate-400";

          return (
            <button
              key={item.index}
              type="button"
              disabled={
                (!allowJump && item.index !== currentIndex) || item.index < minIndex
              }
              onClick={() => {
                if (!allowJump && item.index !== currentIndex) return;
                if (item.index < minIndex) return;
                onSelect(item.index);
              }}
              className={`relative flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium shadow-sm transition ${
                isCurrent
                  ? "border-blue-600 bg-blue-600 text-white shadow-blue-600/20"
                  : `border-slate-200 bg-white ${color} ${allowJump ? "hover:border-blue-300 hover:bg-slate-50" : "cursor-default opacity-90"}`
              }`}
            >
              {item.completion === "COMPLETE" && (
                <span
                  className="absolute -left-0.5 -top-0.5 h-0 w-0 border-l-[6px] border-t-[6px] border-l-transparent border-t-green-500"
                  aria-hidden
                />
              )}
              {item.completion === "PARTIAL" && (
                <span
                  className="absolute -left-0.5 -top-0.5 h-0 w-0 border-l-[6px] border-t-[6px] border-l-transparent border-t-amber-400"
                  aria-hidden
                />
              )}
              {n}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
