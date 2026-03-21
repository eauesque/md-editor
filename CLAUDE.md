# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (port 1420)
npm run build            # TypeScript compile + Vite production build
npm run tauri dev        # Launch Tauri desktop app in dev mode
npm run tauri build      # Build distributable desktop binary
```

No test framework is configured.

## Architecture

**Tauri 2 desktop app** with a TypeScript/Vite frontend. Minimal Rust backend (`src-tauri/`) — just plugin composition for dialog, filesystem, and opener APIs.

### Dual-Pane Editor with Bidirectional Sync

The core design is a split-pane markdown editor:
- **Left pane (Source):** CodeMirror 6 with markdown syntax highlighting (`editor-source.ts`)
- **Right pane (WYSIWYG):** TipTap/ProseMirror rich-text editor (`editor-wysiwyg.ts`)

The **focused pane is master** — only the active pane triggers sync to the other. Sync is debounced at 150ms to prevent loops. Each tab maintains its own document state.

### Markdown ↔ HTML Conversion

`editor-wysiwyg.ts` contains custom regex-based converters (not using remark for live conversion):
- `markdownToHtml()` — block-level parsing (headings, lists, tables, code blocks, blockquotes) then `inlineMarkdown()` for inline formatting
- `htmlToMarkdown()` — DOM-based recursive converter via `nodeToMarkdown()`

These converters are the most fragile part of the codebase. When editing them, test with markdown containing HTML-like characters (`<tag>`, `&amp;`), nested lists, and tables.

### Key Source Files

| File | Role |
|------|------|
| `src/main.ts` | App entry, orchestration, keyboard shortcuts, tab management, file dialogs |
| `src/editor-wysiwyg.ts` | TipTap setup, MD↔HTML converters, Word-style shortcuts extension |
| `src/editor-source.ts` | CodeMirror 6 setup |
| `src/i18n.ts` | All translations (en/ja/zh-tw/zh-cn/ko), `t()` function, `data-i18n` auto-translation |
| `src/search.ts` | Find & Replace across both panes, regex/case-sensitivity support |
| `src/tabs.ts` | Tab state management |
| `src/file-ops.ts` | File open/save via Tauri plugin-dialog + plugin-fs (UTF-8 only) |
| `src/table-picker.ts` | LibreOffice-style grid table insertion UI |
| `src/shortcut-help.ts` | Keyboard shortcut reference modal |

### i18n

All UI strings go through `t("key")` from `src/i18n.ts`. HTML elements with `data-i18n` attributes are auto-translated on init. When adding new UI text, add translation keys for all 5 locales.

## Tauri / Platform

- Target: Windows primary (also builds macOS/Linux via GitHub Actions)
- Identifier: `com.karaa.md-editor`
- Plugins: `plugin-dialog`, `plugin-fs`, `plugin-opener`
- CSP is disabled (null) in `tauri.conf.json`
- Recent files stored in `localStorage`
