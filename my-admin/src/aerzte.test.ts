import { describe, expect, it } from "vitest";
import {
  ARZT_SUCHFELDER,
  arztAdressblock,
  arztFilter,
  arztKurzname,
  plzOrt,
} from "./aerzte";

const bag = {
  Name: "Dr. Büttner, Dr. Luger, Dr. med. K. Schwab-Gauch",
  Praxis: "BAG Dr. Büttner, Dr. Luger, Dr. med. K. Schwab-Gauch",
  Fachrichtung: "Facharzt für Augenheilkunde",
  BSNR: "935241298",
  Straße: "Fröbelstr. 15 e",
  PLZ: "07548",
  Ort: "Gera",
  Telefon: "0365 / 5 52 69 96",
  Fax: "0365 / 5 52 69 97",
};

describe("arztFilter", () => {
  it("lässt Filter ohne Suchtext unverändert und entfernt q", () => {
    expect(arztFilter({})).toEqual({});
    expect(arztFilter({ q: "   ", Ort: "Gera" })).toEqual({ Ort: "Gera" });
  });

  it("sucht ODER-verknüpft in allen Suchfeldern", () => {
    const f = arztFilter({ q: " Voigt " });
    const oder = f["@or"] as Record<string, string>;
    expect(Object.keys(oder)).toHaveLength(ARZT_SUCHFELDER.length);
    expect(oder["Name@ilike"]).toBe("Voigt");
    expect(oder["Praxis@ilike"]).toBe("Voigt");
    expect(f.q).toBeUndefined();
  });

  it("entfernt Zeichen, die die PostgREST-Syntax stören", () => {
    const f = arztFilter({ q: "Büttner, Dr. (Gera)*" });
    expect((f["@or"] as Record<string, string>)["Ort@ilike"]).toBe(
      "Büttner*Dr*Gera",
    );
  });
});

describe("Anzeige", () => {
  it("plzOrt", () => {
    expect(plzOrt(bag)).toBe("07548 Gera");
    expect(plzOrt({ Ort: "Jena" })).toBe("Jena");
  });

  it("arztKurzname", () => {
    expect(arztKurzname(null)).toBe("");
    expect(
      arztKurzname({
        Praxis: "Universitätsklinikum Jena",
        Name: "Dr. med. Ulrich Voigt",
        Ort: "Jena",
      }),
    ).toBe("Universitätsklinikum Jena – Dr. med. Ulrich Voigt (Jena)");
    expect(arztKurzname({ Name: "Dr. Müller" })).toBe("Dr. Müller");
  });

  it("arztAdressblock wie auf dem Stempel", () => {
    expect(arztAdressblock(bag)).toBe(
      [
        "BAG Dr. Büttner, Dr. Luger, Dr. med. K. Schwab-Gauch",
        "Dr. Büttner, Dr. Luger, Dr. med. K. Schwab-Gauch",
        "Facharzt für Augenheilkunde",
        "Fröbelstr. 15 e",
        "07548 Gera",
        "Tel. 0365 / 5 52 69 96, Fax 0365 / 5 52 69 97",
      ].join("\n"),
    );
  });
});
