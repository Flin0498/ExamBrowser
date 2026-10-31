"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { BlankExtension, type BlankAttrs } from "@/components/tiptap/blank-extension";
import { MathExtension } from "@/components/tiptap/math-extension";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useState } from "react";

type RichEditorProps = {
  value: unknown;
  onChange: (json: unknown) => void;
};

export function RichEditor({ value, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      BlankExtension,
      MathExtension,
    ],
    content: (value || { type: "doc", content: [{ type: "paragraph" }] }) as object,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON()),
  });

  const insertBlank = useCallback(() => {
    if (!editor) return;
    const id = `blank_${Math.random().toString(36).slice(2, 9)}`;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "blank",
        attrs: {
          id,
          widthCh: 10,
          acceptedAnswers: [],
          caseSensitive: false,
          points: 1,
        },
      })
      .run();
  }, [editor]);

  const insertMath = useCallback(() => {
    const latex = window.prompt("LaTeX formula", "x^2");
    if (!latex || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "mathInline", attrs: { latex } })
      .run();
  }, [editor]);

  const uploadImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    };
    input.click();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded border border-slate-300 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-2 text-xs">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} label="Bold" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic" />
        <ToolbarBtn onClick={insertMath} label="Formula" />
        <ToolbarBtn onClick={insertBlank} label="Blank" />
        <ToolbarBtn onClick={uploadImage} label="Image" />
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          label="Table"
        />
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[120px] p-3 prose max-w-none text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:max-h-[36rem] [&_.ProseMirror_img]:w-auto"
      />
      <BlankAttributesPanel editor={editor} />
    </div>
  );
}

function BlankAttributesPanel({ editor }: { editor: Editor }) {
  const [attrs, setAttrs] = useState<BlankAttrs | null>(null);

  useEffect(() => {
    const read = () => {
      const { selection } = editor.state;
      if (selection instanceof NodeSelection && selection.node.type.name === "blank") {
        const a = selection.node.attrs as BlankAttrs;
        setAttrs({
          id: a.id,
          widthCh: a.widthCh,
          acceptedAnswers: Array.isArray(a.acceptedAnswers) ? [...a.acceptedAnswers] : [],
          caseSensitive: a.caseSensitive,
          points: a.points,
        });
        return;
      }
      setAttrs(null);
    };
    read();
    editor.on("selectionUpdate", read);
    editor.on("transaction", read);
    return () => {
      editor.off("selectionUpdate", read);
      editor.off("transaction", read);
    };
  }, [editor]);

  if (!attrs) {
    return (
      <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        Click a blank in the stem to edit width, answers, case sensitivity, and points.
      </p>
    );
  }

  function patch(partial: Partial<BlankAttrs>) {
    const next: BlankAttrs = { ...attrs!, ...partial };
    setAttrs(next);
    editor.chain().focus().updateAttributes("blank", partial).run();
  }

  return (
    <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3 text-xs">
      <p className="font-medium text-slate-700">Blank: {attrs.id}</p>
      <label className="flex items-center gap-2">
        Width (ch)
        <input
          type="number"
          min={2}
          className="input w-20 py-0.5"
          value={attrs.widthCh}
          onChange={(e) => patch({ widthCh: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        Points
        <input
          type="number"
          step={0.5}
          min={0}
          className="input w-20 py-0.5"
          value={attrs.points}
          onChange={(e) => patch({ points: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={attrs.caseSensitive}
          onChange={(e) => patch({ caseSensitive: e.target.checked })}
        />
        Case sensitive
      </label>
      <label className="block">
        Accepted answers (one per line)
        <textarea
          className="input mt-1 min-h-[60px] w-full font-mono text-[11px]"
          value={attrs.acceptedAnswers.join("\n")}
          onChange={(e) =>
            patch({
              acceptedAnswers: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    </div>
  );
}

function ToolbarBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100"
    >
      {label}
    </button>
  );
}
