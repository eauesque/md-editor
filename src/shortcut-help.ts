let panelEl: HTMLElement | null = null;

const shortcuts = [
  { category: "全般", items: [
    ["Ctrl+1", "ソースペインにフォーカス"],
    ["Ctrl+2", "WYSIWYGペインにフォーカス"],
    ["Ctrl+Tab", "次のタブ"],
    ["Ctrl+Shift+Tab", "前のタブ"],
    ["Ctrl+N", "新規タブ"],
    ["Ctrl+W", "タブを閉じる"],
    ["Ctrl+O", "ファイルを開く"],
    ["Ctrl+S", "保存"],
    ["Ctrl+F", "検索・置換"],
    ["Ctrl+/", "ショートカット一覧"],
  ]},
  { category: "テキスト書式 (WYSIWYG)", items: [
    ["Ctrl+B", "太字"],
    ["Ctrl+I", "斜体"],
    ["Ctrl+Shift+X", "取り消し線"],
    ["Ctrl+Shift+S", "取り消し線 (Word式)"],
    ["Ctrl+`", "インラインコード"],
    ["Ctrl+Shift+K", "コードブロック"],
    ["Ctrl+K", "リンク挿入・編集"],
  ]},
  { category: "ブロック (WYSIWYG)", items: [
    ["Alt+1 / 2 / 3 / 4", "見出し 1〜4"],
    ["Ctrl+0", "通常の段落に戻す"],
    ["Ctrl+Shift+8", "箇条書きリスト"],
    ["Ctrl+Shift+7", "番号付きリスト"],
    ["Ctrl+Shift+B", "引用"],
    ["Ctrl+Shift+M", "書式をすべてクリア"],
  ]},
  { category: "検索パネル", items: [
    ["Enter", "次の一致へ"],
    ["Shift+Enter", "前の一致へ"],
    ["Esc", "閉じる"],
  ]},
  { category: "編集共通", items: [
    ["Ctrl+Z", "元に戻す"],
    ["Ctrl+Y", "やり直し"],
    ["Ctrl+A", "すべて選択"],
  ]},
];

export function createShortcutHelp(): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "shortcut-help-panel";
  panel.className = "hidden";

  let html = `<div class="shortcut-help-header">
    <span>キーボードショートカット</span>
    <button id="shortcut-help-close" title="閉じる (Ctrl+/)">✕</button>
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
