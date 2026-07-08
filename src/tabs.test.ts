import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as TabsModule from "./tabs";

// tabs.ts keeps module-level singleton state, so each test gets a fresh
// module instance via resetModules() + dynamic import to avoid cross-test leakage.
async function freshTabs(): Promise<typeof TabsModule> {
  vi.resetModules();
  return await import("./tabs");
}

describe("tabs state management", () => {
  let tabs: typeof TabsModule;

  beforeEach(async () => {
    tabs = await freshTabs();
  });

  it("createTab adds a tab and makes it active", () => {
    const tab = tabs.createTab(null, "hello");
    expect(tabs.getActiveTab()).toEqual(tab);
    expect(tabs.getAllTabs()).toHaveLength(1);
    expect(tab.modified).toBe(false);
    expect(tab.content).toBe("hello");
  });

  it("derives the tab title from the file path", () => {
    const tab = tabs.createTab("C:\\notes\\readme.md", "content");
    expect(tab.title).toBe("readme.md");
  });

  it("normalizes backslashes when deriving the title", () => {
    const tab = tabs.createTab("a\\b\\c.md", "");
    expect(tab.title).toBe("c.md");
  });

  it("switchToTab changes the active tab", () => {
    const first = tabs.createTab(null, "first");
    const second = tabs.createTab(null, "second");
    expect(tabs.getActiveTabId()).toBe(second.id);

    tabs.switchToTab(first.id);
    expect(tabs.getActiveTabId()).toBe(first.id);
    expect(tabs.getActiveTab()?.content).toBe("first");
  });

  it("switchToTab is a no-op for an unknown id", () => {
    const first = tabs.createTab(null, "first");
    tabs.switchToTab("does-not-exist");
    expect(tabs.getActiveTabId()).toBe(first.id);
  });

  it("updateActiveTabContent marks the active tab modified", () => {
    const tab = tabs.createTab(null, "");
    expect(tab.modified).toBe(false);
    tabs.updateActiveTabContent("changed");
    expect(tabs.getActiveTab()?.content).toBe("changed");
    expect(tabs.getActiveTab()?.modified).toBe(true);
  });

  it("markActiveTabSaved clears the modified flag and updates the path/title", () => {
    tabs.createTab(null, "");
    tabs.updateActiveTabContent("changed");
    tabs.markActiveTabSaved("/tmp/saved.md");
    const tab = tabs.getActiveTab()!;
    expect(tab.modified).toBe(false);
    expect(tab.filePath).toBe("/tmp/saved.md");
    expect(tab.title).toBe("saved.md");
  });

  it("closeTab removes the tab and activates a neighbor", () => {
    const first = tabs.createTab(null, "first");
    const second = tabs.createTab(null, "second");
    tabs.closeTab(second.id);
    expect(tabs.getAllTabs()).toHaveLength(1);
    expect(tabs.getActiveTabId()).toBe(first.id);
  });

  it("closeTab creates a fresh tab when the last one is closed", () => {
    const only = tabs.createTab(null, "only");
    tabs.closeTab(only.id);
    expect(tabs.getAllTabs()).toHaveLength(1);
    expect(tabs.getActiveTab()?.id).not.toBe(only.id);
  });

  it("does not leak state between independently-loaded module instances", async () => {
    tabs.createTab(null, "in first instance");
    expect(tabs.getAllTabs()).toHaveLength(1);

    const secondInstance = await freshTabs();
    expect(secondInstance.getAllTabs()).toHaveLength(0);
  });
});
