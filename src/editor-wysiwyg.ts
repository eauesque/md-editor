import { Editor, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";

// Word-compatible keyboard shortcuts
const WordShortcuts = Extension.create({
  name: "wordShortcuts",
  addKeyboardShortcuts() {
    return {
      // Ctrl+Shift+S: Strikethrough (Word-style, StarterKit uses Ctrl+Shift+X)
      "Mod-Shift-s": () => this.editor.chain().focus().toggleStrike().run(),
      // Ctrl+E: Center align → repurpose as toggle code (no align in Markdown)
      // Ctrl+`: Inline code
      "Mod-`": () => this.editor.chain().focus().toggleCode().run(),
      // Ctrl+Shift+K: Code block
      "Mod-Shift-k": () => this.editor.chain().focus().toggleCodeBlock().run(),
      // Ctrl+1/2/3: Heading levels (Alt+ to avoid pane switch conflict)
      "Alt-1": () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      "Alt-2": () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      "Alt-3": () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      "Alt-4": () => this.editor.chain().focus().toggleHeading({ level: 4 }).run(),
      // Ctrl+Shift+7: Ordered list (StarterKit default, re-confirm)
      "Mod-Shift-7": () => this.editor.chain().focus().toggleOrderedList().run(),
      // Ctrl+Shift+8: Bullet list (StarterKit default, re-confirm)
      "Mod-Shift-8": () => this.editor.chain().focus().toggleBulletList().run(),
      // Ctrl+Shift+B: Blockquote (Word-style)
      "Mod-Shift-b": () => this.editor.chain().focus().toggleBlockquote().run(),
      // Ctrl+Shift+M: Remove formatting / lift block
      "Mod-Shift-m": () => this.editor.chain().focus().clearNodes().unsetAllMarks().run(),
      // Ctrl+0: Normal paragraph (clear heading)
      "Mod-0": () => this.editor.chain().focus().setParagraph().run(),
      // Ctrl+K: Insert/edit link
      "Mod-k": () => { promptAndSetLink(); return true; },
    };
  },
});

export type WysiwygChangeCallback = (markdown: string) => void;

let editor: Editor | null = null;
let changeCallback: WysiwygChangeCallback | null = null;
let suppressUpdates = false;

// Simple ProseMirror HTML → Markdown converter
// TipTap StarterKit outputs standard HTML; we convert back to Markdown
function htmlToMarkdown(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return nodeToMarkdown(div).trim();
}

function nodeToMarkdown(node: Node, listIndent: string = ""): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const childMd = () => {
    let result = "";
    for (const child of Array.from(el.childNodes)) {
      result += nodeToMarkdown(child, listIndent);
    }
    return result;
  };

  switch (tag) {
    case "h1": return `# ${childMd()}\n\n`;
    case "h2": return `## ${childMd()}\n\n`;
    case "h3": return `### ${childMd()}\n\n`;
    case "h4": return `#### ${childMd()}\n\n`;
    case "h5": return `##### ${childMd()}\n\n`;
    case "h6": return `###### ${childMd()}\n\n`;
    case "p": return `${childMd()}\n\n`;
    case "br": return "\n";
    case "strong":
    case "b": return `**${childMd()}**`;
    case "em":
    case "i": return `*${childMd()}*`;
    case "code": {
      if (el.parentElement?.tagName.toLowerCase() === "pre") {
        return childMd();
      }
      return `\`${childMd()}\``;
    }
    case "pre": {
      const code = el.querySelector("code");
      const text = code ? code.textContent || "" : el.textContent || "";
      return `\`\`\`\n${text}\n\`\`\`\n\n`;
    }
    case "blockquote": {
      const inner = childMd().trim();
      return inner.split("\n").map((l) => `> ${l}`).join("\n") + "\n\n";
    }
    case "ul": {
      let result = "";
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() === "li") {
          const content = nodeToMarkdown(li, listIndent + "  ").trim();
          result += `${listIndent}- ${content}\n`;
        }
      }
      return result + (listIndent === "" ? "\n" : "");
    }
    case "ol": {
      let result = "";
      let i = 1;
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() === "li") {
          const content = nodeToMarkdown(li, listIndent + "   ").trim();
          result += `${listIndent}${i}. ${content}\n`;
          i++;
        }
      }
      return result + (listIndent === "" ? "\n" : "");
    }
    case "li": return childMd();
    case "hr": return "---\n\n";
    case "a": {
      const href = el.getAttribute("href") || "";
      return `[${childMd()}](${href})`;
    }
    case "table": {
      const rows: string[][] = [];
      let hasHeader = false;
      for (const child of Array.from(el.children)) {
        const tagName = (child as HTMLElement).tagName.toLowerCase();
        const rowEls = tagName === "thead" || tagName === "tbody"
          ? Array.from(child.children)
          : [child];
        for (const row of rowEls) {
          if ((row as HTMLElement).tagName.toLowerCase() !== "tr") continue;
          const cells: string[] = [];
          for (const cell of Array.from(row.children)) {
            const cellEl = cell as HTMLElement;
            if (cellEl.tagName.toLowerCase() === "th") hasHeader = true;
            cells.push(nodeToMarkdown(cellEl, listIndent).trim().replace(/\n/g, " "));
          }
          rows.push(cells);
        }
      }
      if (rows.length === 0) return "";
      const colCount = Math.max(...rows.map((r) => r.length));
      const colWidths: number[] = [];
      for (let c = 0; c < colCount; c++) {
        colWidths.push(Math.max(3, ...rows.map((r) => (r[c] || "").length)));
      }
      const formatRow = (cells: string[]) => {
        const padded = colWidths.map((w, i) => (cells[i] || "").padEnd(w));
        return `| ${padded.join(" | ")} |`;
      };
      const sepRow = `| ${colWidths.map((w) => "-".repeat(w)).join(" | ")} |`;
      let result = "";
      if (hasHeader && rows.length > 0) {
        result += formatRow(rows[0]) + "\n";
        result += sepRow + "\n";
        for (let i = 1; i < rows.length; i++) {
          result += formatRow(rows[i]) + "\n";
        }
      } else {
        // No header: create empty header
        result += formatRow(colWidths.map(() => "")) + "\n";
        result += sepRow + "\n";
        for (const row of rows) {
          result += formatRow(row) + "\n";
        }
      }
      return result + "\n";
    }
    case "thead":
    case "tbody": return childMd();
    case "tr": return childMd();
    case "th":
    case "td": return childMd();
    case "div": return childMd();
    default: return childMd();
  }
}

function markdownToHtml(md: string): string {
  // Use remark for parsing, but we need a simple sync approach here
  // Convert markdown to HTML that TipTap can understand
  let html = md;

  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`;
  });

  // Split into blocks
  const blocks = html.split(/\n\n+/);
  html = blocks.map((block) => {
    block = block.trim();
    if (!block) return "";
    if (block.startsWith("<pre>")) return block;

    // Headings
    const headingMatch = block.match(/^(#{1,6})\s+(.*)$/m);
    if (headingMatch) {
      const level = headingMatch[1].length;
      return `<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`;
    }

    // HR
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(block)) {
      return "<hr>";
    }

    // Blockquote
    if (block.startsWith("> ")) {
      const content = block.replace(/^>\s?/gm, "");
      return `<blockquote><p>${inlineMarkdown(content)}</p></blockquote>`;
    }

    // Unordered list
    if (/^[-*+]\s/.test(block)) {
      const items = block.split(/\n(?=[-*+]\s)/);
      const lis = items.map((item) => {
        return `<li><p>${inlineMarkdown(item.replace(/^[-*+]\s+/, ""))}</p></li>`;
      }).join("");
      return `<ul>${lis}</ul>`;
    }

    // Ordered list
    if (/^\d+\.\s/.test(block)) {
      const items = block.split(/\n(?=\d+\.\s)/);
      const lis = items.map((item) => {
        return `<li><p>${inlineMarkdown(item.replace(/^\d+\.\s+/, ""))}</p></li>`;
      }).join("");
      return `<ol>${lis}</ol>`;
    }

    // Table (lines starting with |)
    if (/^\|/.test(block)) {
      const lines = block.split("\n").filter((l) => l.trim());
      if (lines.length >= 2) {
        const parseRow = (line: string) =>
          line.split("|").slice(1, -1).map((c) => c.trim());
        const headerCells = parseRow(lines[0]);
        // Check if second line is separator
        const isSep = /^\|[\s\-:|]+\|$/.test(lines[1].trim());
        if (isSep) {
          let html = "<table><thead><tr>";
          for (const cell of headerCells) {
            html += `<th><p>${inlineMarkdown(cell)}</p></th>`;
          }
          html += "</tr></thead><tbody>";
          for (let i = 2; i < lines.length; i++) {
            const cells = parseRow(lines[i]);
            html += "<tr>";
            for (let j = 0; j < headerCells.length; j++) {
              html += `<td><p>${inlineMarkdown(cells[j] || "")}</p></td>`;
            }
            html += "</tr>";
          }
          html += "</tbody></table>";
          return html;
        }
      }
    }

    // Paragraph
    return `<p>${inlineMarkdown(block)}</p>`;
  }).join("");

  return html;
}

function inlineMarkdown(text: string): string {
  // Inline code
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Line breaks within block
  text = text.replace(/\n/g, "<br>");
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createWysiwygEditor(
  container: HTMLElement,
  initialContent: string,
  onChange: WysiwygChangeCallback
): Editor {
  changeCallback = onChange;

  editor = new Editor({
    element: container,
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: null },
      }),
      WordShortcuts,
    ],
    content: markdownToHtml(initialContent),
    onUpdate: ({ editor: e }) => {
      if (!suppressUpdates) {
        const md = htmlToMarkdown(e.getHTML());
        changeCallback?.(md);
      }
    },
  });

  return editor;
}

export function setWysiwygContent(markdownContent: string) {
  if (!editor) return;
  suppressUpdates = true;
  editor.commands.setContent(markdownToHtml(markdownContent));
  suppressUpdates = false;
}

export function focusWysiwyg() {
  editor?.commands.focus();
}

export function getWysiwygEditor(): Editor | null {
  return editor;
}

export function setupToolbar(toolbarEl: HTMLElement) {
  // Format commands
  toolbarEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn || !editor) return;

    const cmd = btn.getAttribute("data-cmd");
    if (cmd) {
      e.preventDefault();
      switch (cmd) {
        case "bold": editor.chain().focus().toggleBold().run(); break;
        case "italic": editor.chain().focus().toggleItalic().run(); break;
        case "strike": editor.chain().focus().toggleStrike().run(); break;
        case "code": editor.chain().focus().toggleCode().run(); break;
        case "h1": editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
        case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
        case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
        case "bulletList": editor.chain().focus().toggleBulletList().run(); break;
        case "orderedList": editor.chain().focus().toggleOrderedList().run(); break;
        case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
        case "codeBlock": editor.chain().focus().toggleCodeBlock().run(); break;
        case "horizontalRule": editor.chain().focus().setHorizontalRule().run(); break;
      }
      updateToolbarState(toolbarEl);
      return;
    }

    // Table operation commands
    const tableCmd = btn.getAttribute("data-table");
    if (tableCmd) {
      e.preventDefault();
      switch (tableCmd) {
        case "addColumnBefore": editor.chain().focus().addColumnBefore().run(); break;
        case "addColumnAfter": editor.chain().focus().addColumnAfter().run(); break;
        case "addRowBefore": editor.chain().focus().addRowBefore().run(); break;
        case "addRowAfter": editor.chain().focus().addRowAfter().run(); break;
        case "deleteColumn": editor.chain().focus().deleteColumn().run(); break;
        case "deleteRow": editor.chain().focus().deleteRow().run(); break;
        case "deleteTable": editor.chain().focus().deleteTable().run(); break;
      }
      updateToolbarState(toolbarEl);
    }
  });
}

export function updateToolbarState(toolbarEl: HTMLElement) {
  if (!editor) return;
  for (const btn of toolbarEl.querySelectorAll("button[data-cmd]")) {
    const cmd = btn.getAttribute("data-cmd")!;
    let active = false;
    switch (cmd) {
      case "bold": active = editor.isActive("bold"); break;
      case "italic": active = editor.isActive("italic"); break;
      case "strike": active = editor.isActive("strike"); break;
      case "code": active = editor.isActive("code"); break;
      case "h1": active = editor.isActive("heading", { level: 1 }); break;
      case "h2": active = editor.isActive("heading", { level: 2 }); break;
      case "h3": active = editor.isActive("heading", { level: 3 }); break;
      case "bulletList": active = editor.isActive("bulletList"); break;
      case "orderedList": active = editor.isActive("orderedList"); break;
      case "blockquote": active = editor.isActive("blockquote"); break;
      case "codeBlock": active = editor.isActive("codeBlock"); break;
    }
    btn.classList.toggle("active", active);
  }

  // Show/hide table operations based on cursor position
  const tableOps = toolbarEl.querySelector("#table-ops");
  if (tableOps) {
    const inTable = editor.isActive("table");
    tableOps.classList.toggle("hidden", !inTable);
  }
}

export function promptAndSetLink() {
  if (!editor) return;

  const { from, to } = editor.state.selection;
  const existingHref = editor.getAttributes("link").href || "";

  const url = window.prompt("URL を入力:", existingHref);
  if (url === null) return; // cancelled

  if (url === "") {
    // Remove link
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  if (from === to) {
    // No selection: insert link text
    const text = window.prompt("リンクテキスト:", url) || url;
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${url}">${text}</a>`)
      .run();
  } else {
    // Wrap selection in link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }
}

export function insertTable(rows: number, cols: number) {
  if (!editor) return;
  editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
}

export function destroyWysiwyg() {
  editor?.destroy();
  editor = null;
}
