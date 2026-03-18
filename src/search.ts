import { EditorView } from "@codemirror/view";
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from "@codemirror/search";
import type { Editor } from "@tiptap/core";
import { t } from "./i18n";

let sourceView: EditorView | null = null;
let wysiwygEditor: Editor | null = null;
let searchPanelEl: HTMLElement | null = null;

interface SearchState {
  query: string;
  replace: string;
  regex: boolean;
  caseSensitive: boolean;
}

let searchState: SearchState = {
  query: "",
  replace: "",
  regex: false,
  caseSensitive: false,
};

export function createSearchPanel(
  container: HTMLElement,
  cmView: EditorView,
  tiptap: Editor
): HTMLElement {
  sourceView = cmView;
  wysiwygEditor = tiptap;

  const panel = document.createElement("div");
  panel.id = "search-panel";
  panel.innerHTML = `
    <div class="search-rows">
      <div class="search-nav-col">
        <button id="search-prev" title="${t("search.prev")}">▲</button>
        <button id="search-swap" title="${t("search.swap")}">⇅</button>
        <button id="search-next" title="${t("search.next")}">▼</button>
      </div>
      <div class="search-fields-col">
        <div class="search-row">
          <input type="text" id="search-input" placeholder="${t("search.placeholder")}" />
          <div class="search-actions">
            <span id="search-count"></span>
            <label class="search-toggle" title="${t("search.regex")}">
              <input type="checkbox" id="search-regex" />
              <span>.*</span>
            </label>
            <label class="search-toggle" title="${t("search.caseSensitive")}">
              <input type="checkbox" id="search-case" />
              <span>Aa</span>
            </label>
          </div>
        </div>
        <div class="search-row">
          <input type="text" id="replace-input" placeholder="${t("search.replacePlaceholder")}" />
          <div class="search-actions">
            <button id="replace-one" title="${t("search.replace")}">${t("search.replace")}</button>
            <button id="replace-all" title="${t("search.replaceAll")}">${t("search.replaceAll")}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.prepend(panel);
  searchPanelEl = panel;

  const searchInput = panel.querySelector("#search-input") as HTMLInputElement;
  const replaceInput = panel.querySelector("#replace-input") as HTMLInputElement;
  const regexCheck = panel.querySelector("#search-regex") as HTMLInputElement;
  const caseCheck = panel.querySelector("#search-case") as HTMLInputElement;

  function applySearch() {
    if (!sourceView) return;
    searchState.query = searchInput.value;
    searchState.replace = replaceInput.value;
    searchState.regex = regexCheck.checked;
    searchState.caseSensitive = caseCheck.checked;

    const query = new SearchQuery({
      search: searchState.query,
      replace: searchState.replace,
      regexp: searchState.regex,
      caseSensitive: searchState.caseSensitive,
    });

    sourceView.dispatch({ effects: setSearchQuery.of(query) });
    updateMatchCount();
  }

  searchInput.addEventListener("input", applySearch);
  replaceInput.addEventListener("input", () => {
    searchState.replace = replaceInput.value;
    applySearch();
  });
  regexCheck.addEventListener("change", applySearch);
  caseCheck.addEventListener("change", applySearch);

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        doFindPrev();
      } else {
        doFindNext();
      }
    }
    if (e.key === "Escape") {
      hideSearch();
    }
  });

  replaceInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideSearch();
    }
  });

  panel.querySelector("#search-swap")!.addEventListener("click", () => {
    const tmp = searchInput.value;
    searchInput.value = replaceInput.value;
    replaceInput.value = tmp;
    applySearch();
  });

  panel.querySelector("#search-next")!.addEventListener("click", doFindNext);
  panel.querySelector("#search-prev")!.addEventListener("click", doFindPrev);
  panel.querySelector("#replace-one")!.addEventListener("click", doReplace);
  panel.querySelector("#replace-all")!.addEventListener("click", doReplaceAll);

  return panel;
}

function doFindNext() {
  if (!sourceView) return;
  findNext(sourceView);
  syncWysiwygToSourceSelection();
}

function doFindPrev() {
  if (!sourceView) return;
  findPrevious(sourceView);
  syncWysiwygToSourceSelection();
}

function doReplace() {
  if (!sourceView) return;
  replaceNext(sourceView);
  setTimeout(updateMatchCount, 50);
}

function doReplaceAll() {
  if (!sourceView) return;
  replaceAll(sourceView);
  setTimeout(updateMatchCount, 50);
}

// Find the selected text in source and scroll WYSIWYG to matching position
function syncWysiwygToSourceSelection() {
  if (!sourceView || !wysiwygEditor) return;

  const { from, to } = sourceView.state.selection.main;
  if (from === to) return;

  const selectedText = sourceView.state.doc.sliceString(from, to);
  if (!selectedText) return;

  // Get text before the match to estimate position in plain text
  const textBefore = sourceView.state.doc.sliceString(0, from);
  // Strip markdown syntax to approximate plain text position
  const plainBefore = stripMarkdownSyntax(textBefore);

  // Search in WYSIWYG content for the matching text
  const wysiwygText = wysiwygEditor.getText();

  // Find the occurrence that best matches the position
  const searchNeedle = selectedText;
  let bestPos = -1;
  let bestDist = Infinity;
  let idx = 0;

  while (true) {
    const found = searchState.caseSensitive
      ? wysiwygText.indexOf(searchNeedle, idx)
      : wysiwygText.toLowerCase().indexOf(searchNeedle.toLowerCase(), idx);
    if (found === -1) break;

    const dist = Math.abs(found - plainBefore.length);
    if (dist < bestDist) {
      bestDist = dist;
      bestPos = found;
    }
    idx = found + 1;
  }

  if (bestPos !== -1) {
    // Set selection in TipTap and scroll into view
    // TipTap positions include node boundaries, so we need to find the text position
    try {
      const docText = wysiwygEditor.getText();
      const tiptapPos = textOffsetToTiptapPos(wysiwygEditor, bestPos, docText);
      if (tiptapPos !== null) {
        wysiwygEditor
          .chain()
          .setTextSelection({
            from: tiptapPos,
            to: tiptapPos + selectedText.length,
          })
          .scrollIntoView()
          .run();
      }
    } catch {
      // Fallback: just scroll the WYSIWYG to approximate position
      scrollWysiwygToRatio(from / sourceView.state.doc.length);
    }
  }
}

// Convert plain text offset to TipTap document position
function textOffsetToTiptapPos(
  editor: Editor,
  textOffset: number,
  _fullText: string
): number | null {
  const doc = editor.state.doc;
  let charCount = 0;

  // Walk through the document nodes counting text characters
  let result: number | null = null;
  doc.descendants((node, pos) => {
    if (result !== null) return false;
    if (node.isText && node.text) {
      if (charCount + node.text.length > textOffset) {
        result = pos + (textOffset - charCount);
        return false;
      }
      charCount += node.text.length;
    } else if (node.isBlock && charCount > 0) {
      // Block boundaries add implicit newlines in getText()
      charCount += 1;
      if (charCount > textOffset) {
        result = pos;
        return false;
      }
    }
    return true;
  });

  return result;
}

function stripMarkdownSyntax(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function scrollWysiwygToRatio(ratio: number) {
  const wysiwygContent = document.getElementById("wysiwyg-content");
  if (!wysiwygContent) return;
  const tiptapEl = wysiwygContent.querySelector(".tiptap") as HTMLElement;
  if (!tiptapEl) return;
  const scrollMax = tiptapEl.scrollHeight - tiptapEl.clientHeight;
  tiptapEl.scrollTop = scrollMax * Math.max(0, Math.min(1, ratio));
}

function updateMatchCount() {
  if (!searchPanelEl || !sourceView) return;
  const countEl = searchPanelEl.querySelector("#search-count") as HTMLElement;
  if (!searchState.query) {
    countEl.textContent = "";
    return;
  }
  let count = 0;
  try {
    const doc = sourceView.state.doc.toString();
    if (searchState.regex) {
      const flags = searchState.caseSensitive ? "g" : "gi";
      const re = new RegExp(searchState.query, flags);
      let m;
      while ((m = re.exec(doc)) !== null) {
        count++;
        if (m[0].length === 0) re.lastIndex++;
      }
    } else {
      const haystack = searchState.caseSensitive ? doc : doc.toLowerCase();
      const needle = searchState.caseSensitive
        ? searchState.query
        : searchState.query.toLowerCase();
      let idx = 0;
      while ((idx = haystack.indexOf(needle, idx)) !== -1) {
        count++;
        idx += needle.length;
      }
    }
  } catch {}
  countEl.textContent = t("search.count", { n: count });
}

export function showSearch() {
  if (!searchPanelEl) return;
  const input = searchPanelEl.querySelector("#search-input") as HTMLInputElement;
  input.focus();
  input.select();
}

export function hideSearch() {
  // Panel is always visible; just return focus to editor
  sourceView?.focus();
}

export function isSearchVisible(): boolean {
  return true;
}
