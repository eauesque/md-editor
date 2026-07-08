import { describe, expect, it } from "vitest";
import { markdownToMdast, mdastToMarkdown } from "./markdown";

describe("markdown <-> mdast (remark)", () => {
  it("parses a heading into an mdast tree", () => {
    const tree = markdownToMdast("# Title") as any;
    expect(tree.type).toBe("root");
    expect(tree.children[0].type).toBe("heading");
    expect(tree.children[0].depth).toBe(1);
  });

  it("round-trips canonical markdown through parse -> stringify", () => {
    const md = "# Title\n\n- item one\n- item two\n";
    const tree = markdownToMdast(md);
    expect(mdastToMarkdown(tree)).toBe(md);
  });

  it("normalizes a non-canonical bullet marker to the configured style (-)", () => {
    const md = "* item\n";
    const tree = markdownToMdast(md);
    expect(mdastToMarkdown(tree)).toBe("- item\n");
  });
});
