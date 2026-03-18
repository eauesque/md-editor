import {
  createSourceEditor,
  setSourceContent,
  getSourceContent,
  getSourceCursorInfo,
  focusSource,
  getSourceView,
} from "./editor-source";
import {
  createWysiwygEditor,
  setWysiwygContent,
  focusWysiwyg,
  setupToolbar,
  updateToolbarState,
  insertTable,
  getWysiwygEditor,
  promptAndSetLink,
} from "./editor-wysiwyg";
import { createSearchPanel, showSearch } from "./search";
import { createTablePicker } from "./table-picker";
import { toggleShortcutHelp, hideShortcutHelp, isShortcutHelpVisible } from "./shortcut-help";
import {
  createTab,
  switchToTab,
  closeTab,
  getActiveTab,
  getAllTabs,
  getActiveTabId,
  setTabCallbacks,
  updateActiveTabContent,
  markActiveTabSaved,
} from "./tabs";
import { openFile, saveFile, saveFileAs } from "./file-ops";
import { getVersion, getTauriVersion } from "@tauri-apps/api/app";
import { readTextFile } from "@tauri-apps/plugin-fs";

let focusedPane: "source" | "wysiwyg" = "source";

// Recent files history (persisted in localStorage)
const RECENT_FILES_KEY = "md-editor-recent-files";
const MAX_RECENT = 10;

function getRecentFiles(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]");
  } catch { return []; }
}

function addRecentFile(path: string) {
  let recent = getRecentFiles().filter((p) => p !== path);
  recent.unshift(path);
  if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
}

function fileNameFromPath(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() || p;
}
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// Debounced sync: master pane → slave pane
function syncFromSource(content: string) {
  updateActiveTabContent(content);
  if (focusedPane !== "source") return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    setWysiwygContent(content);
    updateStatusBar();
  }, 150);
}

function syncFromWysiwyg(markdown: string) {
  updateActiveTabContent(markdown);
  if (focusedPane !== "wysiwyg") return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    setSourceContent(markdown);
    updateStatusBar();
  }, 150);
}

function updateStatusBar() {
  const content = getSourceContent();
  const lines = content.split("\n").length;
  const chars = content.length;
  const cursor = getSourceCursorInfo();

  document.getElementById("status-chars")!.textContent = `${chars} 文字`;
  document.getElementById("status-lines")!.textContent = `${lines} 行`;
  document.getElementById("status-cursor")!.textContent = `${cursor.line}:${cursor.col}`;

  const tab = getActiveTab();
  document.getElementById("status-file")!.textContent =
    tab?.filePath || "新規ファイル";
}

// Tab UI rendering
function renderTabs() {
  const tabList = document.getElementById("tab-list")!;
  const tabs = getAllTabs();
  const activeId = getActiveTabId();

  tabList.innerHTML = "";
  for (const tab of tabs) {
    const el = document.createElement("div");
    el.className = `tab${tab.id === activeId ? " active" : ""}${tab.modified ? " modified" : ""}`;
    el.innerHTML = `
      <span class="tab-title">${tab.title}</span>
      <span class="tab-modified"></span>
      <span class="tab-close">✕</span>
    `;
    el.querySelector(".tab-title")!.addEventListener("click", () => {
      switchToTab(tab.id);
    });
    el.querySelector(".tab-close")!.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    tabList.appendChild(el);
  }
}

function onTabSwitch(tab: { content: string; filePath: string | null }) {
  setSourceContent(tab.content);
  setWysiwygContent(tab.content);
  updateStatusBar();
}

// Pane focus management
function setFocusedPane(pane: "source" | "wysiwyg") {
  focusedPane = pane;
  const sourceEl = document.getElementById("pane-source")!;
  const wysiwygEl = document.getElementById("pane-wysiwyg")!;
  sourceEl.classList.toggle("focused", pane === "source");
  wysiwygEl.classList.toggle("focused", pane === "wysiwyg");
}

// Divider drag
function setupDivider() {
  const divider = document.getElementById("pane-divider")!;
  const container = document.getElementById("editor-container")!;
  const sourcePane = document.getElementById("pane-source")!;
  const wysiwygPane = document.getElementById("pane-wysiwyg")!;

  let dragging = false;

  divider.addEventListener("mousedown", (e) => {
    dragging = true;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0.15, Math.min(0.85, ratio));
    sourcePane.style.flex = `${clamped}`;
    wysiwygPane.style.flex = `${1 - clamped}`;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

// Menu
function setupMenu() {
  const menuBtn = document.getElementById("menu-btn")!;
  const dropdown = document.getElementById("menu-dropdown")!;

  menuBtn.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("#menu-area")) {
      dropdown.classList.add("hidden");
    }
  });

  dropdown.addEventListener("click", async (e) => {
    const action = (e.target as HTMLElement).getAttribute("data-action");
    if (!action) return;
    dropdown.classList.add("hidden");

    switch (action) {
      case "new":
        createTab();
        break;
      case "open":
        await handleOpen();
        break;
      case "save":
        await handleSave();
        break;
      case "save-as":
        await handleSaveAs();
        break;
      case "shortcuts":
        toggleShortcutHelp();
        break;
      case "about":
        showAbout();
        break;
    }
  });
}

async function handleOpen() {
  const result = await openFile();
  if (!result) return;
  addRecentFile(result.path);
  createTab(result.path, result.content);
}

async function handleOpenRecent(path: string) {
  try {
    const content = await readTextFile(path);
    addRecentFile(path);
    createTab(path, content);
  } catch {
    // File may have been deleted/moved
    alert(`ファイルを開けません: ${path}`);
  }
}

async function handleSave() {
  const tab = getActiveTab();
  if (!tab) return;
  const content = getSourceContent();
  if (tab.filePath) {
    await saveFile(content, tab.filePath);
    markActiveTabSaved();
    addRecentFile(tab.filePath);
  } else {
    await handleSaveAs();
  }
}

async function handleSaveAs() {
  const content = getSourceContent();
  const path = await saveFileAs(content);
  if (path) {
    markActiveTabSaved(path);
    addRecentFile(path);
  }
}

// About dialog
async function showAbout() {
  const appVersion = await getVersion();
  const tauriVersion = await getTauriVersion();

  let overlay = document.getElementById("about-overlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    return;
  }

  overlay = document.createElement("div");
  overlay.id = "about-overlay";
  overlay.innerHTML = `
    <div id="about-panel">
      <h2>MD Editor</h2>
      <p class="about-subtitle">Machst Du Editor</p>
      <table class="about-info">
        <tr><td>バージョン</td><td>${appVersion}</td></tr>
        <tr><td>Tauri</td><td>${tauriVersion}</td></tr>
        <tr><td>ライセンス</td><td>MIT License</td></tr>
      </table>
      <p class="about-desc">AI生成テキストの確認・編集に最適化した<br>デュアルペインMarkdownエディタ</p>
      <button id="about-close">閉じる</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay!.classList.add("hidden");
  });
  overlay.querySelector("#about-close")!.addEventListener("click", () => {
    overlay!.classList.add("hidden");
  });
}

// Recent files dropdown rendering
function renderRecentFiles(dropdown: HTMLElement) {
  const recent = getRecentFiles();
  if (recent.length === 0) {
    dropdown.innerHTML = `<div class="dropdown-empty">最近使ったファイルはありません</div>`;
    return;
  }
  dropdown.innerHTML = recent.map((path) =>
    `<button data-path="${path.replace(/"/g, "&quot;")}" title="${path}">${fileNameFromPath(path)}</button>`
  ).join("");
  dropdown.querySelectorAll("button[data-path]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const path = btn.getAttribute("data-path")!;
      dropdown.classList.add("hidden");
      handleOpenRecent(path);
    });
  });
}

// Keyboard shortcuts
function setupKeyboard() {
  document.addEventListener("keydown", (e) => {
    // Ctrl+1: focus source
    if (e.ctrlKey && e.key === "1") {
      e.preventDefault();
      setFocusedPane("source");
      focusSource();
    }
    // Ctrl+2: focus wysiwyg
    if (e.ctrlKey && e.key === "2") {
      e.preventDefault();
      setFocusedPane("wysiwyg");
      focusWysiwyg();
    }
    // Ctrl+Tab: next tab
    if (e.ctrlKey && e.key === "Tab") {
      e.preventDefault();
      const tabs = getAllTabs();
      const activeId = getActiveTabId();
      const idx = tabs.findIndex((t) => t.id === activeId);
      if (e.shiftKey) {
        const prev = (idx - 1 + tabs.length) % tabs.length;
        switchToTab(tabs[prev].id);
      } else {
        const next = (idx + 1) % tabs.length;
        switchToTab(tabs[next].id);
      }
    }
    // Ctrl+/: shortcut help
    if (e.ctrlKey && e.key === "/") {
      e.preventDefault();
      toggleShortcutHelp();
    }
    // Escape: close shortcut help
    if (e.key === "Escape" && isShortcutHelpVisible()) {
      e.preventDefault();
      hideShortcutHelp();
    }
    // Ctrl+F / Ctrl+H: focus search
    if (e.ctrlKey && (e.key === "f" || e.key === "h")) {
      e.preventDefault();
      showSearch();
    }
    // Ctrl+S: save
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+O: open
    if (e.ctrlKey && e.key === "o") {
      e.preventDefault();
      handleOpen();
    }
    // Ctrl+N: new tab
    if (e.ctrlKey && e.key === "n") {
      e.preventDefault();
      createTab();
    }
    // Ctrl+W: close tab
    if (e.ctrlKey && e.key === "w") {
      e.preventDefault();
      const activeId = getActiveTabId();
      if (activeId) closeTab(activeId);
    }
  });
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  const sourceContainer = document.getElementById("source-content")!;
  const wysiwygContainer = document.getElementById("wysiwyg-content")!;
  const sourcePane = document.getElementById("pane-source")!;
  const wysiwygPane = document.getElementById("pane-wysiwyg")!;
  const toolbarEl = document.getElementById("wysiwyg-toolbar")!;

  // Set up tab system
  setTabCallbacks(onTabSwitch, renderTabs);

  // Create editors
  createSourceEditor(sourceContainer, "", syncFromSource);
  createWysiwygEditor(wysiwygContainer, "", syncFromWysiwyg);

  // Setup WYSIWYG toolbar
  setupToolbar(toolbarEl);

  // Setup table picker (LibreOffice-style grid)
  const tableBtn = document.getElementById("table-insert-btn")!;
  createTablePicker(tableBtn, (rows, cols) => {
    insertTable(rows, cols);
  });

  // Setup search panel (shared between both panes, above editor area)
  const editorContainer = document.getElementById("editor-container")!;
  const sourceView = getSourceView()!;
  const tiptapEditor = getWysiwygEditor()!;
  createSearchPanel(editorContainer.parentElement!, sourceView, tiptapEditor);
  // Move search panel to just before editor-container
  const searchPanel = document.getElementById("search-panel")!;
  editorContainer.parentElement!.insertBefore(searchPanel, editorContainer);

  // Update toolbar active state on selection changes
  setInterval(() => updateToolbarState(toolbarEl), 200);

  // Focus tracking
  sourcePane.addEventListener("focusin", () => setFocusedPane("source"));
  wysiwygPane.addEventListener("focusin", () => setFocusedPane("wysiwyg"));

  // Search buttons on both toolbars
  document.getElementById("source-search-btn")!.addEventListener("click", () => showSearch());
  document.getElementById("wysiwyg-search-btn")!.addEventListener("click", () => showSearch());

  // Source toolbar: file operations
  document.getElementById("btn-new")!.addEventListener("click", () => createTab());
  document.getElementById("btn-open")!.addEventListener("click", () => handleOpen());
  document.getElementById("btn-save")!.addEventListener("click", () => handleSave());

  // Save dropdown
  const saveDropdown = document.getElementById("save-dropdown")!;
  document.getElementById("btn-save-dropdown")!.addEventListener("click", (e) => {
    e.stopPropagation();
    saveDropdown.classList.toggle("hidden");
  });
  saveDropdown.addEventListener("click", async (e) => {
    const action = (e.target as HTMLElement).getAttribute("data-action");
    saveDropdown.classList.add("hidden");
    if (action === "save") await handleSave();
    if (action === "save-as") await handleSaveAs();
  });

  // Recent files dropdown
  const recentDropdown = document.getElementById("recent-files-dropdown")!;
  document.getElementById("btn-open-dropdown")!.addEventListener("click", (e) => {
    e.stopPropagation();
    renderRecentFiles(recentDropdown);
    recentDropdown.classList.toggle("hidden");
  });

  // Link button
  document.getElementById("btn-link")!.addEventListener("click", () => {
    promptAndSetLink();
  });

  // Clipboard buttons
  document.getElementById("btn-cut")!.addEventListener("click", () => {
    document.execCommand("cut");
  });
  document.getElementById("btn-copy")!.addEventListener("click", () => {
    document.execCommand("copy");
  });
  document.getElementById("btn-paste")!.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand("insertText", false, text);
    } catch {
      document.execCommand("paste");
    }
  });

  // Close dropdowns on outside click
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".dropdown-btn-group")) {
      document.querySelectorAll(".toolbar-dropdown").forEach((d) => d.classList.add("hidden"));
    }
  });

  // Periodically update cursor position in status bar
  setInterval(updateStatusBar, 500);

  // Tab add button
  document.getElementById("tab-add")!.addEventListener("click", () => {
    createTab();
  });

  setupDivider();
  setupMenu();
  setupKeyboard();

  // Create initial tab
  createTab();
  setFocusedPane("source");
  focusSource();
});
