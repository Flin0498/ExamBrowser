"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";

type TNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TNode[];
  marks?: Array<{ type: string }>;
};

export function StemRenderer({
  doc,
  blanks,
}: {
  doc: unknown;
  blanks?: {
    values: Record<string, string>;
    onChange?: (id: string, v: string) => void;
    readOnly?: boolean;
  };
}) {
  const root = doc as TNode;
  if (!root?.content) return null;
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-slate-900">
      {root.content.map((node, i) => (
        <Block key={i} node={node} blanks={blanks} />
      ))}
    </div>
  );
}

function Block({
  node,
  blanks,
}: {
  node: TNode;
  blanks?: {
    values: Record<string, string>;
    onChange?: (id: string, v: string) => void;
    readOnly?: boolean;
  };
}) {
  if (node.type === "paragraph") {
    return (
      <p>
        {node.content?.map((c, i) => (
          <Inline key={i} node={c} blanks={blanks} />
        ))}
      </p>
    );
  }
  if (node.type === "image" && node.attrs?.src) {
    return (
      <img
        src={String(node.attrs.src)}
        alt=""
        className="h-auto max-h-[36rem] w-auto max-w-full rounded"
      />
    );
  }
  if (node.type === "table") {
    return (
      <table className="border-collapse border border-slate-300 text-sm">
        <tbody>
          {node.content?.map((row, ri) => (
            <tr key={ri}>
              {row.content?.map((cell, ci) => (
                <td key={ci} className="border border-slate-300 px-2 py-1">
                  {cell.content?.map((c, i) => (
                    <Inline key={i} node={c} blanks={blanks} />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return null;
}

function Inline({
  node,
  blanks,
}: {
  node: TNode;
  blanks?: {
    values: Record<string, string>;
    onChange?: (id: string, v: string) => void;
    readOnly?: boolean;
  };
}) {
  if (node.type === "text") {
    let content: ReactNode = node.text;
    const marks = node.marks ?? [];
    if (marks.some((m) => m.type === "bold")) {
      content = <strong>{content}</strong>;
    }
    if (marks.some((m) => m.type === "italic")) {
      content = <em>{content}</em>;
    }
    return <>{content}</>;
  }
  if (node.type === "mathInline" && node.attrs?.latex) {
    const html = katex.renderToString(String(node.attrs.latex), {
      throwOnError: false,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (node.type === "blank" && node.attrs?.id) {
    const id = String(node.attrs.id);
    const w = Number(node.attrs.widthCh ?? 8);
    if (blanks) {
      return (
        <input
          type="text"
          disabled={blanks.readOnly}
          value={blanks.values[id] ?? ""}
          onChange={(e) => blanks.onChange?.(id, e.target.value)}
          className="mx-0.5 inline-block rounded border border-slate-400 bg-slate-50 px-1 py-0.5 font-mono text-sm align-middle disabled:bg-slate-100"
          style={{ width: `${w + 2}ch` }}
        />
      );
    }
    return (
      <span className="mx-1 inline-block rounded border border-dashed border-slate-400 px-2 font-mono text-xs text-slate-500">
        blank
      </span>
    );
  }
  return null;
}
