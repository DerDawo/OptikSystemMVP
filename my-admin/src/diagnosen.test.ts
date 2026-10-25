import { describe, expect, it } from "vitest";
import { baueDiagnose, zerlegeDiagnose } from "./diagnosen";

describe("Diagnosen zum Anhaken", () => {
  it("erkennt angehakte Diagnosen und behält Freitext", () => {
    expect(zerlegeDiagnose("glaukom, Siccasyndrom, H52.4 Presbyopie")).toEqual({
      gewaehlt: ["Siccasyndrom", "Glaukom"],
      rest: "H52.4 Presbyopie",
    });
    expect(zerlegeDiagnose(null)).toEqual({ gewaehlt: [], rest: "" });
  });

  it("baut den Text in fester Reihenfolge", () => {
    expect(baueDiagnose(["Glaukom", "Siccasyndrom"], " Freitext ")).toBe(
      "Siccasyndrom, Glaukom, Freitext",
    );
    expect(baueDiagnose([], "")).toBeNull();
  });

  it("übersteht Hin- und Rückweg unverändert", () => {
    const text = "Katarakt, Lider (XA/DC), alte Angabe";
    const { gewaehlt, rest } = zerlegeDiagnose(text);
    expect(baueDiagnose(gewaehlt, rest)).toBe(text);
  });
});
