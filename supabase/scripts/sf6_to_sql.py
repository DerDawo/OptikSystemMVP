#!/usr/bin/env python3
"""SF6-Glaskatalog (ZIP) -> SQL-Import für glashersteller/glaskatalog (#80).

Python-Portierung von my-admin/src/glaskatalog/sf6Format.ts (Parser) und
sf6Import.ts (Import-Semantik), damit ein Herstellerkatalog ohne Browser bzw.
ohne Node direkt per SQL (Supabase SQL Editor, MCP `execute_sql` oder psql)
in Dev oder Prod eingespielt werden kann. Feldpositionen und Annahmen sind
identisch zum TypeScript-Parser - bei Änderungen dort hier mitpflegen.

Wie der Import in der App:
  - Hersteller per (code) upserten
  - Grundgläser per (glashersteller_id, esd_code) upserten, nicht mehr
    gelieferte Grundgläser auf aktiv=false setzen (nie löschen)
  - Optionen per (glashersteller_id, code) upserten
  - Verfügbarkeits-Verknüpfungen der importierten Grundgläser neu aufbauen

Aufruf:
  python3 supabase/scripts/sf6_to_sql.py KATALOG.ZIP AUSGABE_VERZEICHNIS

Erzeugt drei SQL-Dateien (01_..., 02_..., 03_...), die in dieser
Reihenfolge auszuführen sind (z. B. im Supabase SQL Editor). Ein erneuter
Lauf mit einer neuen Preisliste aktualisiert bestehende Einträge.
"""

import re
import sys
import zipfile
from pathlib import Path

# Preisfeld-Typen aus Head.dat ("pricefield-01".."pricefield-05"):
# 10 = Einkaufspreis, 20 = UVP. Importiert wird die UVP (siehe sf6Format.ts).
PREISTYP_UVP = "20"
STANDARD_PREISFELDER = ("10", "20", "00", "00", "00")
# Bekannte Zeilenbreiten von LensPrice/OptionsPrice -> Anzahl Preisfelder.
PREISZEILEN_LAYOUTS = {32: 2, 53: 5, 69: 5}
PREISFELD_START = 18
PREISFELD_BREITE = 7

REQUIRED_FILES = {
    "head.dat": "head",
    "lenstype.dat": "lensType",
    "lensprice.dat": "lensPrice",
    "options.dat": "options",
    "optionsprice.dat": "optionsPrice",
    "optionscolor.dat": "optionsColor",
    "combination.dat": "combination",
}


def split_lines(text):
    return [line for line in re.split(r"\r\n|\r|\n", text) if line.strip()]


def read_zip(path):
    found = {}
    with zipfile.ZipFile(path) as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            key = REQUIRED_FILES.get(name.split("/")[-1].lower())
            if key:
                # SF6-.dat-Dateien sind ISO-8859-1-kodiert.
                found[key] = zf.read(name).decode("iso-8859-1")
    missing = [k for k in REQUIRED_FILES.values() if k not in found]
    if missing:
        sys.exit(f"SF6-ZIP unvollständig, es fehlen: {', '.join(missing)}")
    return found


def parse_head(text):
    values = {}
    for line in split_lines(text):
        m = re.match(r"^(\S+)\s+(.*)$", line)
        if m:
            values[m.group(1)] = m.group(2).strip()
    code = values.get("manufacturer-code", "")
    if not code:
        sys.exit("Head.dat enthält keinen manufacturer-code")
    return {"code": code, "name": values.get("manufacturer-name") or code}


def extract_brechungsindex(bezeichnung):
    m = re.search(r"(\d\.\d{2})", bezeichnung)
    return float(m.group(1)) if m else None


def parse_code_name_lines(text):
    """LensType.dat / Options.dat: Code in Spalte 1-6, Bezeichnung in 7-62."""
    rows = []
    for line in split_lines(text):
        if len(line) < 62:
            continue
        code, bezeichnung = line[0:6].strip(), line[6:62].strip()
        if code and bezeichnung:
            rows.append((code, bezeichnung))
    return rows


def parse_preisfeld_typen(text):
    """Head.dat: Preisfeld-Typen in Feldreihenfolge; [] wenn nicht deklariert
    oder pricefield-decimals nicht leer/0 ist (unbekannte Preis-Einheit)."""
    values = {}
    for line in split_lines(text):
        m = re.match(r"^(\S+)\s*(.*)$", line)
        if m:
            values[m.group(1).lower()] = m.group(2).strip()
    if values.get("pricefield-decimals", "") not in ("", "0"):
        return []
    typen = [values.get(f"pricefield-0{i}", "") for i in range(1, 6)]
    return typen if any(typen) else []


def parse_preiszeilen(text, schluessel_breite, preisfeld_typen):
    """(Schlüssel, UVP in Euro) je Zeile. Layout per Zeilenbreite; bei
    unbekannter/uneinheitlicher Breite oder ohne UVP-Feld: keine Preise."""
    lines = split_lines(text)
    breiten = {len(line) for line in lines}
    if len(breiten) != 1:
        return []
    anzahl_felder = PREISZEILEN_LAYOUTS.get(breiten.pop())
    if anzahl_felder is None or PREISTYP_UVP not in preisfeld_typen:
        return []
    feld_index = list(preisfeld_typen).index(PREISTYP_UVP)
    if feld_index >= anzahl_felder:
        return []
    start = PREISFELD_START + feld_index * PREISFELD_BREITE
    zeilen = []
    for line in lines:
        schluessel = line[0:schluessel_breite].strip()
        field = line[start:start + PREISFELD_BREITE].strip()
        if not schluessel or not field.isdigit():
            continue
        preis = int(field) / 100
        if preis > 0:
            zeilen.append((schluessel, preis))
    return zeilen


def parse_lens_price(text, preisfeld_typen=STANDARD_PREISFELDER):
    basispreise = {}
    for esd_code, preis in parse_preiszeilen(text, 6, preisfeld_typen):
        if esd_code not in basispreise or preis < basispreise[esd_code]:
            basispreise[esd_code] = preis
    return basispreise


def parse_options_price(text, preisfeld_typen=STANDARD_PREISFELDER):
    return dict(parse_preiszeilen(text, 12, preisfeld_typen))


def parse_options_color_groups(text):
    return {line[3:6].strip() for line in split_lines(text) if len(line) >= 6 and line[3:6].strip()}


def parse_combination(text):
    verfuegbar = {}
    for line in split_lines(text):
        if len(line) < 13:
            continue
        esd_code, option_code = line[0:6].strip(), line[7:13].strip()
        if not esd_code or not option_code or re.fullmatch(r"\*+", option_code):
            continue
        verfuegbar.setdefault(esd_code, set()).add(option_code)
    return verfuegbar


def sql_str(value):
    return "'" + value.replace("'", "''") + "'"


def sql_num(value):
    return "null" if value is None else repr(value)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    files = read_zip(sys.argv[1])
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)

    hersteller = parse_head(files["head"])
    preisfeld_typen = parse_preisfeld_typen(files["head"])
    basispreise = parse_lens_price(files["lensPrice"], preisfeld_typen)
    # dict statt Liste: doppelte Codes würden ein einzelnes upsert-Statement
    # sprengen ("cannot affect row a second time"); letzter Eintrag gewinnt,
    # wie bei aufeinanderfolgenden Batches in sf6Import.ts.
    produkte = dict(parse_code_name_lines(files["lensType"]))
    option_preise = parse_options_price(files["optionsPrice"], preisfeld_typen)
    farb_gruppen = parse_options_color_groups(files["optionsColor"])
    optionen = dict(parse_code_name_lines(files["options"]))
    verfuegbar = parse_combination(files["combination"])

    h = f"(select id from public.glashersteller where code = {sql_str(hersteller['code'])})"

    # 01: Hersteller + Grundgläser + Deaktivierung entfallener Grundgläser
    produkt_values = ",\n".join(
        f"({sql_str(c)}, {sql_str(b)}, {sql_num(extract_brechungsindex(b))}, {sql_num(basispreise.get(c))})"
        for c, b in produkte.items()
    )
    (out / "01_hersteller_grundglaeser.sql").write_text(
        f"""-- SF6-Import {hersteller['name']} ({hersteller['code']}): Hersteller und Grundgläser
begin;
insert into public.glashersteller (code, name, updated_at)
values ({sql_str(hersteller['code'])}, {sql_str(hersteller['name'])}, now())
on conflict (code) do update set name = excluded.name, updated_at = excluded.updated_at;

insert into public.glaskatalog (glashersteller_id, esd_code, bezeichnung, brechungsindex, basispreis, aktiv, updated_at)
select {h}, v.esd_code, v.bezeichnung, v.brechungsindex, v.basispreis, true, now()
from (values
{produkt_values}
) as v(esd_code, bezeichnung, brechungsindex, basispreis)
on conflict (glashersteller_id, esd_code) do update set
  bezeichnung = excluded.bezeichnung, brechungsindex = excluded.brechungsindex,
  basispreis = excluded.basispreis, aktiv = true, updated_at = excluded.updated_at;

-- now() ist innerhalb der Transaktion konstant: alles, was eben nicht
-- upserted wurde, ist im neuen Katalog entfallen.
update public.glaskatalog set aktiv = false, updated_at = now()
where glashersteller_id = {h} and aktiv and updated_at <> now();
commit;
""",
        encoding="utf-8",
    )

    # 02: Optionen + alte Verknüpfungen der importierten Grundgläser entfernen
    option_values = ",\n".join(
        f"({sql_str(c)}, {sql_str(b)}, {sql_str('farbe' if c in farb_gruppen else 'beschichtung')}, {sql_num(option_preise.get(c))})"
        for c, b in optionen.items()
    )
    (out / "02_optionen.sql").write_text(
        f"""-- SF6-Import {hersteller['name']}: Optionen, alte Verknüpfungen entfernen
begin;
insert into public.glaskatalog_option (glashersteller_id, code, bezeichnung, typ, preis, updated_at)
select {h}, v.code, v.bezeichnung, v.typ, v.preis, now()
from (values
{option_values}
) as v(code, bezeichnung, typ, preis)
on conflict (glashersteller_id, code) do update set
  bezeichnung = excluded.bezeichnung, typ = excluded.typ,
  preis = excluded.preis, updated_at = excluded.updated_at;

delete from public.glaskatalog_hat_option
where glaskatalog_id in (
  select id from public.glaskatalog
  where glashersteller_id = {h} and aktiv
);
commit;
""",
        encoding="utf-8",
    )

    # 03: Verknüpfungen. Combination.dat ordnet sehr vielen Grundgläsern
    # dieselbe Optionsmenge zu (POL: 2495 Gläser, 13 verschiedene Mengen) -
    # gruppiert bleibt die Datei klein genug für einen einzelnen Aufruf.
    gruppen = {}
    for esd, opts in verfuegbar.items():
        if esd not in produkte:
            continue
        menge = frozenset(o for o in opts if o in optionen)
        if menge:
            gruppen.setdefault(menge, []).append(esd)
    anzahl_links = sum(len(m) * len(e) for m, e in gruppen.items())
    def sql_array(items):
        return "array[" + ",".join(sql_str(x) for x in sorted(items)) + "]"
    gruppen_values = ",\n".join(
        f"({sql_array(esds)}, {sql_array(menge)})" for menge, esds in gruppen.items()
    )
    (out / "03_verknuepfungen.sql").write_text(
        f"""-- SF6-Import {hersteller['name']}: {anzahl_links} Verknüpfungen Grundglas <-> Option
insert into public.glaskatalog_hat_option (glaskatalog_id, glaskatalog_option_id)
select g.id, o.id
from (values
{gruppen_values}
) as v(esd_codes, option_codes)
cross join lateral unnest(v.esd_codes) as e(esd_code)
cross join lateral unnest(v.option_codes) as oc(option_code)
join public.glaskatalog g on g.glashersteller_id = {h} and g.esd_code = e.esd_code
join public.glaskatalog_option o on o.glashersteller_id = {h} and o.code = oc.option_code
on conflict (glaskatalog_id, glaskatalog_option_id) do nothing;
""",
        encoding="utf-8",
    )

    print(f"Hersteller:      {hersteller['name']} ({hersteller['code']})")
    print(f"Grundgläser:     {len(produkte)} (davon mit Basispreis: {sum(1 for c in produkte if c in basispreise)})")
    print(f"Optionen:        {len(optionen)} (davon Farben: {sum(1 for c in optionen if c in farb_gruppen)})")
    print(f"Verknüpfungen:   {anzahl_links}")
    print(f"SQL-Dateien in:  {out}")


if __name__ == "__main__":
    main()
