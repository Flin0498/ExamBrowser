import { Node, mergeAttributes } from "@tiptap/core";

export type BlankAttrs = {
  id: string;
  widthCh: number;
  acceptedAnswers: string[];
  caseSensitive: boolean;
  points: number;
};

export const BlankExtension = Node.create({
  name: "blank",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: "" },
      widthCh: { default: 8 },
      acceptedAnswers: { default: [] },
      caseSensitive: { default: false },
      points: { default: 1 },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-blank]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-blank": "true", class: "tiptap-blank" }),
      `[blank:${HTMLAttributes.id}]`,
    ];
  },
});
