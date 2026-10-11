import { describe, expect, it } from "vitest";
import {
  leseIcs,
  leseZeitpunkt,
  passenderKunde,
} from "../../supabase/functions/google-kalender/ics";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "UID:abc@google.com",
  "DTSTART;TZID=Europe/Berlin:20260412T100000",
  "DTEND;TZID=Europe/Berlin:20260412T103000",
  "SUMMARY:Sehtest Müller Anja",
  "DESCRIPTION:Gleitsicht\\, neue Werte\\nbitte Brille mitbringen",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:winter@google.com",
  "DTSTART:20260115T090000Z",
  "DTEND:20260115T091500Z",
  "SUMMARY:Abholung Schulze",
  "STATUS:CONFIRMED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:serie@google.com",
  "DTSTART;TZID=Europe/Berlin:20260105T120000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO",
  "SUMMARY:Mittagspause",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:serie@google.com",
  "RECURRENCE-ID;TZID=Europe/Berlin:20260112T120000",
  "DTSTART;TZID=Europe/Berlin:20260112T130000",
  "SUMMARY:Mittagspause verschoben",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:ganztag@google.com",
  "DTSTART;VALUE=DATE:20260501",
  "DTEND;VALUE=DATE:20260502",
  "SUMMARY:Feiertag",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:abgesagt@google.com",
  "DTSTART:20260601T080000Z",
  "SUMMARY:Kontrolle Beispiel",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:lang@google.com",
  "DTSTART:20260602T080000Z",
  "SUMMARY:Anpassung Kontakt",
  " linsen Weber",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("leseIcs", () => {
  const termine = leseIcs(ICS);
  const nach = (uid: string) => termine.find((t) => t.uid === uid);

  it("liest Ortszeit mit Sommerzeit und Text mit Sonderzeichen", () => {
    const t = nach("abc@google.com")!;
    expect(t.start.toISOString()).toBe("2026-04-12T08:00:00.000Z");
    expect(t.ende.toISOString()).toBe("2026-04-12T08:30:00.000Z");
    expect(t.titel).toBe("Sehtest Müller Anja");
    expect(t.beschreibung).toBe(
      "Gleitsicht, neue Werte\nbitte Brille mitbringen",
    );
  });

  it("liest UTC-Zeiten und setzt ohne Ende eine Stunde", () => {
    expect(nach("winter@google.com")!.start.toISOString()).toBe(
      "2026-01-15T09:00:00.000Z",
    );
    expect(nach("lang@google.com")!.ende.toISOString()).toBe(
      "2026-06-02T09:00:00.000Z",
    );
  });

  it("überspringt Serien, übernimmt aber verschobene Einzeltermine", () => {
    expect(nach("serie@google.com")).toBeUndefined();
    const einzeln = nach("serie@google.com#20260112T120000")!;
    expect(einzeln.titel).toBe("Mittagspause verschoben");
    expect(einzeln.start.toISOString()).toBe("2026-01-12T12:00:00.000Z");
  });

  it("erkennt ganztägige, abgesagte und gefaltete Einträge", () => {
    const g = nach("ganztag@google.com")!;
    expect(g.ganztags).toBe(true);
    expect(g.start.toISOString()).toBe("2026-04-30T22:00:00.000Z");
    expect(nach("abgesagt@google.com")!.abgesagt).toBe(true);
    expect(nach("lang@google.com")!.titel).toBe(
      "Anpassung Kontaktlinsen Weber",
    );
  });
});

describe("leseZeitpunkt", () => {
  it("behandelt Zeiten ohne Zone als deutsche Ortszeit", () => {
    expect(
      leseZeitpunkt("DTSTART", "20261212T100000")!.datum.toISOString(),
    ).toBe("2026-12-12T09:00:00.000Z");
    expect(leseZeitpunkt("DTSTART", "kaputt")).toBeNull();
  });
});

describe("passenderKunde", () => {
  const kunden = [
    { id: 1, Vorname: "Anja", Nachname: "Müller" },
    { id: 2, Vorname: "Hans", Nachname: "Müller" },
    { id: 3, Vorname: "Eva", Nachname: "Schulze" },
  ];
  it("ordnet über Vor- und Nachname zu", () => {
    expect(passenderKunde("Sehtest Müller Anja", kunden)).toBe(1);
  });
  it("nimmt einen eindeutigen Nachnamen", () => {
    expect(passenderKunde("Abholung Schulze", kunden)).toBe(3);
  });
  it("lässt mehrdeutige Termine offen", () => {
    expect(passenderKunde("Abholung Müller", kunden)).toBeNull();
    expect(passenderKunde("Mittagspause", kunden)).toBeNull();
  });
});
