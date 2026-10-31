"use client";

import type { MatchingSlotsPayload } from "@/types/question";

export function MatchingSlotsQuestion({
  payload,
  items,
  slots,
  onSlotChange,
  readOnly,
}: {
  payload: MatchingSlotsPayload;
  items: MatchingSlotsPayload["items"];
  slots: Record<string, string | null>;
  onSlotChange: (slotId: string, itemId: string | null) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="mt-4 space-y-3">
      {payload.slots.map((slot) => {
        const prompt = /[-–:]\s*$/.test(slot.label) ? slot.label : `${slot.label} -`;
        return (
          <div key={slot.id} className="flex items-center gap-3">
            <span className="flex w-40 shrink-0 items-center font-medium text-slate-700">{prompt}</span>
            <select
              className="input h-12 min-w-0 flex-1"
              disabled={readOnly}
              value={slots[slot.id] ?? ""}
              onChange={(e) => onSlotChange(slot.id, e.target.value || null)}
            >
              <option value="">Select</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.text}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
