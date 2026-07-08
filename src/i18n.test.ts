import { afterEach, describe, expect, it } from "vitest";
import { getAvailableLocales, getLocale, setLocale, t, translations } from "./i18n";

afterEach(() => {
  setLocale("en");
});

describe("translation key parity across locales", () => {
  const enKeys = new Set(Object.keys(translations.en));

  for (const { id } of getAvailableLocales()) {
    if (id === "en") continue;

    it(`${id} has exactly the same key set as en`, () => {
      const localeKeys = new Set(Object.keys(translations[id]));
      const missing = [...enKeys].filter((k) => !localeKeys.has(k));
      const extra = [...localeKeys].filter((k) => !enKeys.has(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  }
});

describe("t()", () => {
  it("returns the translation for the current locale", () => {
    setLocale("ja");
    expect(t("menu.new")).toBe(translations.ja["menu.new"]);
  });

  it("falls back to English when the current locale is missing a key", () => {
    setLocale("ja");
    const original = translations.ja["menu.new"];
    delete (translations.ja as Record<string, string>)["menu.new"];
    try {
      expect(t("menu.new")).toBe(translations.en["menu.new"]);
    } finally {
      translations.ja["menu.new"] = original;
    }
  });

  it("falls back to the raw key when no locale has a translation", () => {
    expect(t("this.key.does.not.exist")).toBe("this.key.does.not.exist");
  });

  it("substitutes {param} placeholders", () => {
    setLocale("en");
    expect(t("search.count", { n: 3 })).toBe("3 matches");
  });

  it("setLocale/getLocale round-trip", () => {
    setLocale("ko");
    expect(getLocale()).toBe("ko");
  });
});
