"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useEffect, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { BlankExtension } from "@/components/tiptap/blank-extension";
import { MathExtension } from "@/components/tiptap/math-extension";
import type { StudentResponse } from "@/types/question";

type RichContentProps = {
  content: unknown;
  editable?: boolean;
  onChange?: (json: unknown) => void;
  fillValues?: Record<string, string>;
  onFillChange?: (blankId: string, value: string) => void;
  readOnlyFill?: boolean;
};

function renderMath(el: HTMLElement) {
  el.querySelectorAll("[data-math]").forEach((node) => {
    const latex = node.getAttribute("data-latex") || node.textContent || "";
    try {
      katex.render(latex, node as HTMLElement, { throwOnError: false, displayMode: false });
    } catch {
      /* keep text */
    }
  });
}

export function RichContent({
  content,
  editable = false,
  onChange,
  fillValues,
  onFillChange,
  readOnlyFill,
}: RichContentProps) {
  const extensions = useMemo(
    () => [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      BlankExtension,
      MathExtension,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: content as object,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON());
    },
  });

  useEffect(() => {
    if (!editor || content === undefined) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content);
    if (current !== next) {
      editor.commands.setContent(content as object);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    renderMath(root);
  }, [editor, content]);

  return (
    <div className="prose max-w-none text-sm leading-relaxed">
      <EditorContent editor={editor} />
      {!editable && fillValues && onFillChange && (
        <FillBlankOverlay
          editorRoot={editor?.view.dom}
          values={fillValues}
          onChange={onFillChange}
          readOnly={readOnlyFill}
        />
      )}
    </div>
  );
}

function FillBlankOverlay({
  editorRoot,
  values,
  onChange,
  readOnly,
}: {
  editorRoot?: HTMLElement;
  values: Record<string, string>;
  onChange: (id: string, v: string) => void;
  readOnly?: boolean;
}) {
  useEffect(() => {
    if (!editorRoot) return;
    const blanks = editorRoot.querySelectorAll("[data-blank]");
    blanks.forEach((node) => {
      const el = node as HTMLElement;
      const id = el.getAttribute("data-id") || el.getAttribute("id") || "";
      if (!id) return;
      if (el.querySelector("input")) return;
      const width = el.getAttribute("data-width") || "8";
      const input = document.createElement("input");
      input.type = "text";
      input.className =
        "mx-1 inline-block rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-sm align-middle";
      input.style.width = `${Number(width) + 2}ch`;
      input.value = values[id] ?? "";
      input.disabled = !!readOnly;
      input.addEventListener("input", () => onChange(id, input.value));
      el.textContent = "";
      el.appendChild(input);
    });
  }, [editorRoot, values, onChange, readOnly]);

  return null;
}

