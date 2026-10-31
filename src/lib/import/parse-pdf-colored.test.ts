import { describe, expect, it } from "vitest";
import { parsePdfColoredText } from "@/lib/import/parse-pdf-colored";
import { poolChoicesFromTokens } from "@/lib/import/pdf-pool-choices";

function stemPlain(stem: unknown): string {
  const doc = stem as {
    content?: Array<{ content?: Array<{ text?: string }> }>;
  };
  return (
    doc.content
      ?.map((p) => p.content?.map((c) => c.text ?? "").join("") ?? "")
      .join("\n") ?? ""
  );
}

describe("parsePdfColoredText", () => {
  it("does not paste matching boxes onto a later choice option", () => {
    const pools = {
      7: [
        "Local Area Networks (LANs)",
        "Wide Area Networks (WANs)",
        "Metropolitan Area Networks (MANs)",
        "Personal Area Networks (PANs)",
      ],
    };
    const drafts = parsePdfColoredText(
      "11. Which are LAN technologies? ⟦a. Bluetooth⟧ b. Frame Relay f. ISDN Local Area Networks (LANs) Wide Area Networks (WANs) Metropolitan Area Networks (MANs) Personal Area Networks (PANs)",
      [],
      pools,
    );
    const choice = drafts.find((d) => d.type === "MULTIPLE_CHOICE" || d.type === "SINGLE_CHOICE");
    const payload = choice?.payload as { options: Array<{ label: string; content: { content: Array<{ content?: Array<{ text?: string }> }> } }> };
    const f = payload.options.find((o) => o.label === "F");
    const fText = f?.content.content.flatMap((p) => p.content ?? []).map((c) => c.text ?? "").join("");
    expect(fText).toBe("ISDN");
  });

  it("includes every printed box, including distractors, in the dropdown", () => {
    const pools = poolChoicesFromTokens([
      { x: 57, y: 770, text: "12." },
      { x: 72, y: 770, text: "Which type of these IPv4 addresses?" },
      { x: 57, y: 755, text: "111.111.111.111 /26 -" },
      { x: 149, y: 755, text: "Host Address" },
      { x: 57, y: 739, text: "111.111.111.111 /28 -" },
      { x: 149, y: 739, text: "Broadcast Address" },
      { x: 64, y: 702, text: "Host Address" },
      { x: 64, y: 668, text: "Network Address" },
      { x: 64, y: 632, text: "Broadcast" },
      { x: 108, y: 632, text: "Address" },
      { x: 57, y: 599, text: "13. What address is used?" },
    ]);
    expect(pools[12]).toEqual(["Host Address", "Network Address", "Broadcast Address"]);
    const drafts = parsePdfColoredText(
      "12. Which type of these IPv4 addresses? 111.111.111.111 /26 - ⟦Host Address⟧ 111.111.111.111 /28 - ⟦Broadcast Address⟧",
      [],
      pools,
    );
    const payload = drafts[0].payload as { items: Array<{ text: string }> };
    expect(payload.items.map((item) => item.text)).toEqual([
      "Host Address",
      "Network Address",
      "Broadcast Address",
    ]);
  });

  it("reads red-wrapped options as answers", () => {
    const text =
      "1. Pick two (2 Answers) ⟦a. One⟧ b. Two ⟦c. Three⟧ d. Four";
    const drafts = parsePdfColoredText(text);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe("MULTIPLE_CHOICE");
    expect(drafts[0].answerKey).toEqual({ correctOptionIds: ["a", "c"] });
    expect(stemPlain(drafts[0].stem)).toContain("(2 Answers)");
    expect(drafts[0].title).toContain("(2 Answers)");
  });

  it("does not treat the last letter of a word like determine. as option E", () => {
    const text =
      "2. The network portion of a hierarchical address can be used to determine. (2 Answers) ⟦a. The range of a subnet⟧ b. The size of a subnet c. The specific node in a subnet ⟦d. The prefix of a subnet⟧";
    const drafts = parsePdfColoredText(text);
    expect(drafts).toHaveLength(1);
    expect(stemPlain(drafts[0].stem)).toBe(
      "The network portion of a hierarchical address can be used to determine. (2 Answers)",
    );
    const payload = drafts[0].payload as { options: Array<{ label: string }> };
    expect(payload.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(JSON.stringify(drafts[0].payload)).not.toContain("(2 Answers)");
  });

  it("keeps split red option letters out of the stem", () => {
    const text =
      "9. Which are the functions defined at Layer 1 of the OSI reference model? (3 Answers) ⟦a⟧⟦. ⟧⟦Distinguish the frames.⟧ ⟦b⟧⟦.⟧⟦Retrieve the signals.⟧ c. Decide which host. d. Organize the bits.";
    const drafts = parsePdfColoredText(text);
    expect(drafts[0].type).toBe("MULTIPLE_CHOICE");
    expect(stemPlain(drafts[0].stem)).toBe(
      "Which are the functions defined at Layer 1 of the OSI reference model? (3 Answers)",
    );
    const labels = (drafts[0].payload as { options: Array<{ label: string }> }).options.map(
      (o) => o.label,
    );
    expect(labels).toEqual(["A", "B", "C", "D"]);
  });

  it("imports numbered dash prompts as matching slots", () => {
    const text =
      "7. Please sort the types of network technologies by scale in ascending order (smallest to largest). 1 - ⟦Personal Area Networks (PANs)⟧ 2 - ⟦Local Area Networks (LANs)⟧ 3 - ⟦Metropolitan Area Networks (MANs)⟧ 4 - ⟦Wide Area Networks (WANs)⟧";
    const drafts = parsePdfColoredText(text);
    expect(drafts[0].type).toBe("MATCHING_SLOTS");
    expect(stemPlain(drafts[0].stem)).toContain("(smallest to largest).");
    expect(stemPlain(drafts[0].stem)).not.toContain("Personal Area");
    const payload = drafts[0].payload as {
      slots: Array<{ label: string }>;
      items: Array<{ text: string }>;
    };
    expect(payload.slots.map((s) => s.label)).toEqual(["1", "2", "3", "4"]);
  });

  it("keeps a slot glued to the previous red answer", () => {
    const text =
      "7. Please sort the types. 1 - ⟦Personal Area Networks (PANs)⟧ 2 - ⟦Local Area Networks (LANs)⟧ 3 - ⟦Metropolitan Area Networks (MANs)⟧⟦ ⟧4 - ⟦Wide Area Networks (WANs)⟧";
    const drafts = parsePdfColoredText(text);
    const payload = drafts[0].payload as { slots: Array<{ label: string }>; items: Array<{ text: string }> };
    expect(payload.slots.map((s) => s.label)).toEqual(["1", "2", "3", "4"]);
    expect(payload.items.map((item) => item.text)).toEqual([
      "Personal Area Networks (PANs)",
      "Local Area Networks (LANs)",
      "Metropolitan Area Networks (MANs)",
      "Wide Area Networks (WANs)",
    ]);
  });

  it("joins a split capital letter back onto the rest of the word", () => {
    const text = "14. Layers? Layer 2 - ⟦Data ⟧⟦L⟧⟦ink⟧ Layer 3 - ⟦Network⟧";
    const drafts = parsePdfColoredText(text);
    const payload = drafts[0].payload as { items: Array<{ text: string }> };
    expect(payload.items[0].text).toBe("Data Link");
  });

  it("puts diagram images on the empty choice options", () => {
    const text =
      "20. Which is the header⟦ of⟧ Ipv4 packet? a. b. c. d. {{IMG:0}} {{IMG:1}} {{IMG:2}} {{IMG:3}}";
    const drafts = parsePdfColoredText(text, ["/uploads/a.png", "/uploads/b.png", "/uploads/c.png", "/uploads/d.png"]);
    const payload = drafts[0].payload as { options: Array<{ label: string; content: { content: Array<{ type: string; attrs?: { src?: string } }> } }> };
    expect(payload.options.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
    expect(payload.options[0].content.content.some((n) => n.attrs?.src === "/uploads/a.png")).toBe(true);
    expect(payload.options[3].content.content.some((n) => n.attrs?.src === "/uploads/d.png")).toBe(true);
  });

  it("drops the page header and the unrecorded tail", () => {
    const text =
      "2509 CS370 Mid-回忆版 Page 1 of 7 24. During the process? a. Layer 1 b. Layer 2 ⟦c. Layer 3⟧ 30-40 未录制 Protocol";
    const drafts = parsePdfColoredText(text);
    expect(drafts).toHaveLength(1);
    expect(JSON.stringify(drafts[0])).not.toContain("回忆版");
    expect(JSON.stringify(drafts[0])).not.toContain("未录制");
  });

  it("inserts a space after punctuation before the next letter", () => {
    const text =
      "5. Frames are checked.The result is added. ⟦a. Data field⟧ b. Other field.";
    const drafts = parsePdfColoredText(text);
    expect(stemPlain(drafts[0].stem)).toContain("checked. The");
  });

  it("keeps fill-in and numbered questions that are not a/b/c choices", () => {
    const text =
      "12. Which type of these IPv4 addresses? 111.111.111.111 /26 - ⟦Host Address⟧ 13. What address is used? ⟦a. Source MAC⟧ b. Other c. Third d. Fourth 23. How many bits? ⟦13⟧";
    const drafts = parsePdfColoredText(text);
    expect(drafts.map((d) => d.type)).toEqual(["FILL_BLANK", "SINGLE_CHOICE", "FILL_BLANK"]);
    expect(JSON.stringify(drafts[0].answerKey)).toContain("Host Address");
    expect(JSON.stringify(drafts[2].answerKey)).toContain("13");
    expect(JSON.stringify(drafts[0].stem)).toContain("111.111.111.111");
  });

  it("keeps (N Answers) in every question stem, not only the first", () => {
    const text =
      "1. First item (2 Answers) ⟦a. One⟧ b. Two 2. Second item (3 Answers) ⟦a. Alpha⟧ b. Beta ⟦c. Gamma⟧";
    const drafts = parsePdfColoredText(text);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    expect(stemPlain(drafts[0].stem)).toContain("(2 Answers)");
    expect(stemPlain(drafts[1].stem)).toContain("(3 Answers)");
    expect(drafts[1].title).toContain("(3 Answers)");
  });
});
