import { describe, expect, it } from "vitest";
import { htmlToMarkdown, inlineMarkdown, markdownToHtml } from "./editor-wysiwyg";

// Fixtures already canonical for markdownToHtml/htmlToMarkdown's output style
// (- bullets, 1. ordered lists, ** bold, * italic, no trailing whitespace).
// Round-tripping these must be a fixpoint: md -> html -> md === md.
const ROUND_TRIP_FIXTURES: Record<string, string> = {
  paragraph: "Hello world.",
  heading1: "# Title",
  heading3: "### Sub title",
  bold: "This is **bold** text.",
  italic: "This is *italic* text.",
  boldItalic: "This is **bold** and *italic* text.",
  inlineCode: "Run `npm install` first.",
  link: "See [the docs](https://example.com).",
  blockquote: "> A quoted line",
  unorderedList: "- one\n- two\n- three",
  orderedList: "1. first\n2. second\n3. third",
  hr: "---",
  codeBlock: "```\nconst x = 1;\n```",
  table: "| a   | b   |\n| --- | --- |\n| 1   | 2   |",
};

describe("markdown <-> html round-trip", () => {
  for (const [name, md] of Object.entries(ROUND_TRIP_FIXTURES)) {
    it(`is a fixpoint for: ${name}`, () => {
      const html = markdownToHtml(md);
      const roundTripped = htmlToMarkdown(html);
      expect(roundTripped).toBe(md);
    });
  }

  it("round-trips a nested list", () => {
    const md = "- parent\n  - child one\n  - child two";
    const html = markdownToHtml(md);
    const roundTripped = htmlToMarkdown(html);
    expect(roundTripped).toContain("parent");
    expect(roundTripped).toContain("child one");
    expect(roundTripped).toContain("child two");
  });
});

// Regression: 445c3ec "Fix WYSIWYG preview dropping content after HTML-like text"
// Literal angle brackets in markdown source must not be interpreted as real
// HTML tags by TipTap, which previously caused content after them to vanish.
describe("HTML-like text handling (regression for 445c3ec)", () => {
  it("escapes a bare tag-like string instead of dropping following content", () => {
    const md = "Before <script>alert(1)</script> after this text survives.";
    const html = markdownToHtml(md);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("after this text survives");
  });

  it("does not corrupt an inline code span containing angle brackets", () => {
    const md = "Use `<div>` for a container.";
    const html = markdownToHtml(md);
    expect(html).toContain("<code>&lt;div&gt;</code>");
  });

  it("round-trips text containing HTML-like tags", () => {
    const md = "Before <iframe> after.";
    const html = markdownToHtml(md);
    const roundTripped = htmlToMarkdown(html);
    expect(roundTripped).toBe(md);
  });
});

// Regression: 835cc17 "Fix WYSIWYG preview rendering bug" — CRLF line endings
// broke block splitting so only the first line rendered.
describe("CRLF handling (regression for 835cc17)", () => {
  it("renders every block when the source uses CRLF line endings", () => {
    const md = "# Title\r\n\r\nFirst paragraph.\r\n\r\nSecond paragraph.";
    const html = markdownToHtml(md);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
  });
});

describe("markdownToHtml block-level parsing", () => {
  it("parses headings h1-h6", () => {
    for (let level = 1; level <= 6; level++) {
      const hashes = "#".repeat(level);
      const html = markdownToHtml(`${hashes} Heading ${level}`);
      expect(html).toBe(`<h${level}>Heading ${level}</h${level}>`);
    }
  });

  it("parses a table with a header row", () => {
    const md = "| Name | Age |\n| --- | --- |\n| Alice | 30 |";
    const html = markdownToHtml(md);
    expect(html).toContain("<thead>");
    expect(html).toContain("<th><p>Name</p></th>");
    expect(html).toContain("<td><p>Alice</p></td>");
  });

  it("parses an unordered and ordered list", () => {
    expect(markdownToHtml("- a\n- b")).toBe("<ul><li><p>a</p></li><li><p>b</p></li></ul>");
    expect(markdownToHtml("1. a\n2. b")).toBe("<ol><li><p>a</p></li><li><p>b</p></li></ol>");
  });
});

describe("inlineMarkdown", () => {
  it("escapes HTML entities before applying formatting", () => {
    expect(inlineMarkdown("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("does not let bold/italic markers leak into escaped HTML", () => {
    expect(inlineMarkdown("**bold**")).toBe("<strong>bold</strong>");
    expect(inlineMarkdown("*italic*")).toBe("<em>italic</em>");
  });

  it("keeps inline code content escaped and unaffected by later replacements", () => {
    expect(inlineMarkdown("`<b>not bold</b>`")).toBe("<code>&lt;b&gt;not bold&lt;/b&gt;</code>");
  });

  it("converts a markdown link", () => {
    expect(inlineMarkdown("[go](https://example.com)")).toBe(
      '<a href="https://example.com">go</a>'
    );
  });

  it("escapes markdown link href attributes", () => {
    expect(inlineMarkdown('[go](https://example.com/"x)')).toBe(
      '<a href="https://example.com/&quot;x">go</a>'
    );
  });
});
