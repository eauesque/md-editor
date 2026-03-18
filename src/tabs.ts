export interface TabState {
  id: string;
  title: string;
  filePath: string | null;
  content: string;
  modified: boolean;
}

let tabs: TabState[] = [];
let activeTabId: string | null = null;
let nextId = 1;

type TabChangeCallback = (tab: TabState) => void;
type TabListCallback = () => void;

let onTabSwitch: TabChangeCallback | null = null;
let onTabListChange: TabListCallback | null = null;

export function setTabCallbacks(
  switchCb: TabChangeCallback,
  listChangeCb: TabListCallback
) {
  onTabSwitch = switchCb;
  onTabListChange = listChangeCb;
}

export function createTab(
  filePath: string | null = null,
  content: string = "",
  title?: string
): TabState {
  const tab: TabState = {
    id: `tab-${nextId++}`,
    title: title || (filePath ? fileNameFromPath(filePath) : "新規ファイル"),
    filePath,
    content,
    modified: false,
  };
  tabs.push(tab);
  onTabListChange?.();
  switchToTab(tab.id);
  return tab;
}

export function switchToTab(id: string) {
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;
  activeTabId = id;
  onTabSwitch?.(tab);
  onTabListChange?.();
}

export function closeTab(id: string) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    createTab();
    return;
  }
  if (activeTabId === id) {
    const newIdx = Math.min(idx, tabs.length - 1);
    switchToTab(tabs[newIdx].id);
  } else {
    onTabListChange?.();
  }
}

export function getActiveTab(): TabState | null {
  return tabs.find((t) => t.id === activeTabId) || null;
}

export function getAllTabs(): TabState[] {
  return tabs;
}

export function getActiveTabId(): string | null {
  return activeTabId;
}

export function updateActiveTabContent(content: string) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.content = content;
  if (!tab.modified) {
    tab.modified = true;
    onTabListChange?.();
  }
}

export function markActiveTabSaved(filePath?: string) {
  const tab = getActiveTab();
  if (!tab) return;
  if (filePath) {
    tab.filePath = filePath;
    tab.title = fileNameFromPath(filePath);
  }
  tab.modified = false;
  onTabListChange?.();
}

function fileNameFromPath(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() || p;
}
