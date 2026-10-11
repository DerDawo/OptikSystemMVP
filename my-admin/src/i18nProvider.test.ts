import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import englishMessages from "ra-language-english";
import { raSupabaseEnglishMessages } from "ra-supabase-language-english";
import { germanMessages, i18nProvider } from "./i18nProvider";

// Flacht verschachtelte Texte zu { "ra.action.save": "Speichern", ... } ab.
const flatten = (obj: object, prefix = ""): Record<string, string> =>
  Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? { ...acc, ...flatten(value, path) }
      : { ...acc, [path]: String(value) };
  }, {});

const placeholders = (text: string) =>
  [...new Set(text.match(/%\{\w+\}/g) ?? [])].sort();

const english = flatten({ ...englishMessages, ...raSupabaseEnglishMessages });
const german = flatten(germanMessages);

describe("i18nProvider (deutsche Oberflächentexte)", () => {
  it("übersetzt alle Texte von react-admin und ra-supabase", () => {
    const missing = Object.keys(english).filter((key) => !(key in german));
    expect(missing).toEqual([]);
  });

  it("übernimmt die Platzhalter der englischen Vorlage unverändert", () => {
    const mismatched = Object.keys(english).filter(
      (key) =>
        key in german &&
        placeholders(german[key]).join() !== placeholders(english[key]).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it("liefert deutsche Texte für die Login-Seite", () => {
    expect(i18nProvider.getLocale()).toBe("de");
    expect(i18nProvider.translate("ra.auth.sign_in")).toBe("Anmelden");
    expect(i18nProvider.translate("ra-supabase.auth.forgot_password")).toBe(
      "Passwort vergessen?",
    );
    // So reicht der LoginForm die Supabase-Fehlermeldung an notify() weiter.
    expect(
      i18nProvider.translate("Invalid login credentials", {
        _: "Invalid login credentials",
      }),
    ).toBe("E-Mail oder Passwort ist falsch");
  });

  it("hat für jede Ressource aus App.tsx einen deutschen Namen", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const registered = [...app.matchAll(/<Resource\s+name="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(registered.length).toBeGreaterThan(0);
    const missing = registered.filter(
      (name) => !(`resources.${name}.name` in german),
    );
    expect(missing).toEqual([]);
  });

  it("setzt die Ressourcennamen in Meldungen ein", () => {
    const kunden = i18nProvider.translate("resources.kunde.name", {
      smart_count: 0,
    });
    expect(
      i18nProvider.translate("ra.navigation.no_results", { name: kunden }),
    ).toBe("Keine Kunden gefunden");
    expect(
      i18nProvider.translate("resources.glass.name", { smart_count: 1 }),
    ).toBe("Glas");
  });

  it("wählt Singular und Plural über smart_count", () => {
    expect(
      i18nProvider.translate("ra.notification.deleted", { smart_count: 3 }),
    ).toBe("3 Einträge gelöscht");
  });
});
