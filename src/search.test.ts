import { describe, expect, it } from "vitest";
import { stripMarkdownSyntax } from "./search";

describe("stripMarkdownSyntax", () => {
  it("strips heading markers", () => {
    expect(stripMarkdownSyntax("# Title")).toBe("Title");
    expect(stripMarkdownSyntax("### Sub")).toBe("Sub");
  });

  it("strips bold and italic markers", () => {
    expect(stripMarkdownSyntax("**bold**")).toBe("bold");
    expect(stripMarkdownSyntax("__bold__")).toBe("bold");
    expect(stripMarkdownSyntax("*italic*")).toBe("italic");
    expect(stripMarkdownSyntax("_italic_")).toBe("italic");
  });

  it("strips inline code and code blocks", () => {
    expect(stripMarkdownSyntax("`code`")).toBe("code");
    expect(stripMarkdownSyntax("```\nblock\n```")).toBe("");
  });

  it("strips list markers", () => {
    expect(stripMarkdownSyntax("- item")).toBe("item");
    expect(stripMarkdownSyntax("1. item")).toBe("item");
  });

  it("strips blockquote markers", () => {
    expect(stripMarkdownSyntax("> quoted")).toBe("quoted");
  });

  it("strips link syntax, keeping only the label", () => {
    expect(stripMarkdownSyntax("[label](https://example.com)")).toBe("label");
  });

  it("leaves plain text untouched", () => {
    expect(stripMarkdownSyntax("plain text")).toBe("plain text");
  });
});
