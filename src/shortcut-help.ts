import { t } from "./i18n";

let panelEl: HTMLElement | null = null;

function getShortcuts() {
  return [
    { category: t("shortcuts.general"), items: [
      ["Ctrl+1", t("shortcuts.focusSource")],
      ["Ctrl+2", t("shortcuts.focusWysiwyg")],
      ["Ctrl+Tab", t("shortcuts.nextTab")],
      ["Ctrl+Shift+Tab", t("shortcuts.prevTab")],
      ["Ctrl+N", t("shortcuts.newTab")],
      ["Ctrl+W", t("shortcuts.closeTab")],
      ["Ctrl+O", t("shortcuts.openFile")],
      ["Ctrl+S", t("shortcuts.save")],
      ["Ctrl+F", t("shortcuts.findReplace")],
      ["Ctrl+/", t("shortcuts.shortcutList")],
    ]},
    { category: t("shortcuts.textFormat"), items: [
      ["Ctrl+B", t("shortcuts.bold")],
      ["Ctrl+I", t("shortcuts.italic")],
      ["Ctrl+Shift+X", t("shortcuts.strikethrough")],
      ["Ctrl+Shift+S", t("shortcuts.strikethroughWord")],
      ["Ctrl+`", t("shortcuts.inlineCode")],
      ["Ctrl+Shift+K", t("shortcuts.codeBlock")],
      ["Ctrl+K", t("shortcuts.insertLink")],
    ]},
    { category: t("shortcuts.blocks"), items: [
      ["Alt+1 / 2 / 3 / 4", t("shortcuts.headings")],
      ["Ctrl+0", t("shortcuts.paragraph")],
      ["Ctrl+Shift+8", t("shortcuts.bulletList")],
      ["Ctrl+Shift+7", t("shortcuts.orderedList")],
      ["Ctrl+Shift+B", t("shortcuts.blockquote")],
      ["Ctrl+Shift+M", t("shortcuts.clearFormat")],
    ]},
    { category: t("shortcuts.searchPanel"), items: [
      ["Enter", t("shortcuts.nextMatch")],
      ["Shift+Enter", t("shortcuts.prevMatch")],
      ["Esc", t("shortcuts.closePanel")],
    ]},
    { category: t("shortcuts.editing"), items: [
      ["Ctrl+Z", t("shortcuts.undo")],
      ["Ctrl+Y", t("shortcuts.redo")],
      ["Ctrl+A", t("shortcuts.selectAll")],
    ]},
  ];
}

export function createShortcutHelp(): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "shortcut-help-panel";
  panel.className = "hidden";

  const shortcuts = getShortcuts();

  let html = `<div class="shortcut-help-header">
    <span>${t("shortcuts.title")}</span>
    <button id="shortcut-help-close" title="${t("shortcuts.close")}">✕</button>
  </div>
  <div class="shortcut-help-body">`;

  for (const group of shortcuts) {
    html += `<div class="shortcut-group">
      <h3>${group.category}</h3>
      <table>`;
    for (const [key, desc] of group.items) {
      const formattedKey = key
        .split("+")
        .map((k) => `<kbd>${k.trim()}</kbd>`)
        .join("+");
      html += `<tr><td class="shortcut-key">${formattedKey}</td><td>${desc}</td></tr>`;
    }
    html += `</table></div>`;
  }

  html += `</div>`;
  panel.innerHTML = html;

  // Insert before status bar
  const statusBar = document.getElementById("status-bar")!;
  statusBar.parentElement!.insertBefore(panel, statusBar);

  panel.querySelector("#shortcut-help-close")!.addEventListener("click", hideShortcutHelp);

  panelEl = panel;
  return panel;
}

export function toggleShortcutHelp() {
  if (!panelEl) createShortcutHelp();
  panelEl!.classList.toggle("hidden");
}

export function hideShortcutHelp() {
  panelEl?.classList.add("hidden");
}

export function isShortcutHelpVisible(): boolean {
  return panelEl ? !panelEl.classList.contains("hidden") : false;
}
