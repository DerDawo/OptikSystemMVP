#!/usr/bin/env python3
"""Echtdaten aus dem Altsystem Prisma (AOWin) nach Supabase übernehmen (#80).

Quelle ist eine Prisma-Datensicherung:
  - prismadb/backupN.dat  PostgreSQL-Dump (pg_dump custom format) der
                          Prisma-Datenbank "OPTIK"
  - Resource/prisma/glaspreise/<Hersteller>/*.dat  SF6-Glaskataloge

Übernommen werden Kunden, Brillen-Aufträge (inkl. Fassung, Glastyp, Gläser
links/rechts), Kontaktlinsen-Aufträge, alle SF6-Glaskataloge und die
Betriebsdaten. Termine gibt es in Prisma keine (Kalendertabellen leer).

Alles läuft in EINER Transaktion. Ohne --commit wird nach dem Import und der
Prüfung zurückgerollt (Probelauf) - die Datenbank bleibt unverändert.

Aufruf (Passwort wird abgefragt, alternativ Umgebungsvariable PGPASSWORD):

  python3 supabase/scripts/prisma_import/prisma_import.py \\
      --dump ".../prismadb/backup4.dat" \\
      --sf6-dir ".../Resource/prisma/glaspreise" \\
      --project-ref cktdtojgrxskihihmnjm [--commit]

Echte Kundendaten gehören nie ins Repository - Dump und Kataloge bleiben
lokal, nur dieses Skript ist eingecheckt.
"""

import argparse
import datetime as dt
import getpass
import os
import re
import ssl
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))

from pgdump_reader import Dump, rows  # noqa: E402
import sf6_to_sql as sf6  # noqa: E402

DEFAULT_POOLER_HOST = "aws-1-eu-west-1.pooler.supabase.com"

BETRIEB = {
    "Name": "Augenoptik Ulm, Werdauer Str. 38, 07551 Gera",
    "IKNummer": "311600532",
    "Praequalifiziert": True,
}

# Prisma-Filiale 999 = gelöschte Datensätze. Auf Wunsch mit übernommen,
# aber in den Notizen gekennzeichnet.
FILIALE_GELOESCHT = "999"

# Aufträge, die jünger sind, gelten evtl. noch als in Arbeit - für sie wird
# kein Glas-Auftragsstatus gesetzt statt pauschal "abgeholt".
OFFENE_AUFTRAEGE_TAGE = 60

GUELTIGE_JAHRE = range(1900, 2031)


# --------------------------------------------------------------------------
# Hilfsfunktionen
# --------------------------------------------------------------------------

def clean(value):
    if value is None:
        return None
    value = value.strip()
    return value or None


def num(value):
    value = clean(value)
    if value is None:
        return None
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def nonzero(value):
    n = num(value)
    return n if n not in (None, Decimal(0)) else None


def date(value):
    value = clean(value)
    if value is None:
        return None
    try:
        d = dt.date.fromisoformat(value)
    except ValueError:
        return None
    return d if d.year in GUELTIGE_JAHRE else None


def euro(n):
    return f"{n:.2f}".replace(".", ",") + " €"


def lines(*parts):
    text = "\n".join(p for p in parts if p)
    return text or None


ANREDE_MAP = [
    (re.compile(r"^prof\.?\s*dr", re.I), "Prof. Dr.", None),
    (re.compile(r"^prof", re.I), "Prof.", None),
    (re.compile(r"^herr\s*dr", re.I), "Dr.", "männlich"),
    (re.compile(r"^frau\s*dr", re.I), "Dr.", "weiblich"),
    (re.compile(r"^dr", re.I), "Dr.", None),
    (re.compile(r"^frau", re.I), "Frau", "weiblich"),
    (re.compile(r"^her", re.I), "Herr", "männlich"),
]


def anrede(value):
    """-> (Anrede-Enumwert oder None, Geschlecht, unverändert übernehmbar?)"""
    raw = clean(value)
    if raw is None:
        return None, None, True
    for pattern, enum_value, geschlecht in ANREDE_MAP:
        if pattern.match(raw):
            return enum_value, geschlecht, True
    return None, None, False


STRASSE_RE = re.compile(
    r"^(?P<str>.*?[^\d\s,])[\s,.]*(?P<nr>\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d*\s*[a-zA-Z]?)?)\s*$"
)


def strasse(value):
    raw = clean(value)
    if raw is None:
        return None, None
    m = STRASSE_RE.match(raw)
    if not m:
        return raw, None
    s = m.group("str").strip()
    # "Musterstr.12" -> Punkt der Abkürzung erhalten
    if raw[len(s):len(s) + 1] == ".":
        s += "."
    return s, re.sub(r"\s+", "", m.group("nr"))


ORT_RE = re.compile(r"^\s*(?:D\s*-\s*)?(?P<plz>\d{4,5})\s*(?P<ort>.*)$")


def ort(value):
    raw = clean(value)
    if raw is None:
        return None, None
    m = ORT_RE.match(raw)
    if not m:
        return None, raw
    return m.group("plz"), clean(m.group("ort"))


TEL_PREFIX_RE = re.compile(r"\b([PG]):\s*")


def telefon(value):
    """'P:0365 123 G:0365 456' -> {'P': '0365 123', 'G': '0365 456'}"""
    raw = clean(value)
    if raw is None:
        return {}
    parts = TEL_PREFIX_RE.split(raw)
    result = {}
    if clean(parts[0]):
        result["P"] = clean(parts[0])
    for i in range(1, len(parts) - 1, 2):
        v = clean(parts[i + 1])
        if v:
            result[parts[i]] = f"{result[parts[i]]}, {v}" if parts[i] in result else v
    return result


def radius(value):
    """Kontaktlinsen-Radius aus Freitext ('8,6' / '8.60')."""
    raw = clean(value)
    if raw is None:
        return None
    m = re.search(r"\d+[.,]\d+|\d+", raw)
    return num(m.group(0).replace(",", ".")) if m else None


# --------------------------------------------------------------------------
# Mapping Prisma -> Supabase
# --------------------------------------------------------------------------

def map_kunden(dump):
    kassen = {r["nr"]: r for r in rows(dump, "kassen")}
    result, report = [], {"anrede_unbekannt": 0, "geloescht": 0}
    for r in rows(dump, "kunden"):
        an, geschlecht, an_ok = anrede(r["anrede"])
        if not an_ok:
            report["anrede_unbekannt"] += 1
        str_, hausnr = strasse(r["strasse"])
        plz, stadt = ort(r["ort"])
        tel = telefon(r["tel"])
        handy = telefon(r["ku_handy"])
        kasse = kassen.get(r["kassen_nr"]) or {}
        kassen_name = clean(r["kassen_name"])
        gesetzlich = kassen_name not in (None, "Privat")
        geloescht = r["filnr"] == FILIALE_GELOESCHT
        report["geloescht"] += geloescht

        notizen = lines(
            clean(r["memo"]),
            None if an_ok else f"Anrede (Prisma): {clean(r['anrede'])}",
            f"Krankenkasse: {kassen_name}" if gesetzlich else None,
            f"Telefon geschäftlich (Prisma): {tel['G']}" if "G" in tel and clean(r["tel_job"]) else None,
            "In Prisma als gelöscht markiert (Filiale 999)." if geloescht else None,
        )
        result.append({
            "id": int(r["nr"]),
            "created_at": date(r["aufnahme"]),
            "KundenNummer": r["nr"],
            "Aufnahmedatum": date(r["aufnahme"]),
            "Anrede": an,
            "Nachname": clean(r["nachname"]),
            "Vorname": clean(r["vorname"]),
            "Geburtsdatum": date(r["gebdatum"]),
            "Geschlecht": geschlecht,
            "Straße": str_,
            "Hausnummer": hausnr,
            "Postleitzahl": plz,
            "Stadt": stadt,
            "TelefonnummerPrivat": tel.get("P"),
            "TelefonnummerGeschaeftlich": clean(r["tel_job"]) or tel.get("G"),
            "Handy": ", ".join(v for v in (handy.get("P"), handy.get("G")) if v) or None,
            "Email": clean(r["ku_email"]),
            "KrankenkassenNummer": clean(kasse.get("kk_nr")) if gesetzlich else None,
            "VersichertenNummer": clean(r["versnr"]),
            "KrankenversicherungsTyp": "Gesetzlich Krankenversichert" if gesetzlich else "Unbekannt",
            "Werbeeinwilligung": r["werbungjn"] == "J",
            "WerbeeinwilligungFuer": clean(r["werbungjndetails"]),
            "Merkmal1": clean(r["ku_merkmal1"]),
            "Merkmal2": clean(r["ku_merkmal2"]),
            "Merkmal3": clean(r["ku_merkmal3"]),
            "Merkmal4": clean(r["ku_merkmal4"]),
            "Notizen": notizen,
        })
    return result, report


def leistungen_text(r, n):
    out = []
    for i in range(1, n + 1):
        name, preis = clean(r.get(f"leistung{i}")), num(r.get(f"vkleistung{i}"))
        if name or preis:
            name = re.sub(r"\s{2,}", " ", name or "Leistung")
            out.append(f"- {name}" + (f": {euro(preis)}" if preis is not None else ""))
    return "Leistungen:\n" + "\n".join(out) if out else None


def map_brillen(dump, kunden_ids, heute):
    brillen, glaeser, glastypen, fassungen = [], [], [], []
    report = {"geloescht": 0, "ohne_kunde": 0}
    for r in rows(dump, "brillen"):
        kunde_id = int(r["kunden_nr"])
        if kunde_id not in kunden_ids:
            report["ohne_kunde"] += 1
            continue
        nr = int(r["nr"])
        datum = date(r["br_datum"])
        geloescht = r["filnr"] == FILIALE_GELOESCHT
        report["geloescht"] += geloescht
        noch_offen = datum is not None and (heute - datum).days < OFFENE_AUFTRAEGE_TAGE

        fassung_id = None
        if any(clean(r[c]) for c in ("famodell", "faherst", "fafarbe", "fagr", "vkfa", "fa_nr")):
            fassung_id = len(fassungen) + 1
            fassungen.append({
                "id": fassung_id,
                "Lagernummer": str(int(Decimal(r["fa_nr"]))) if nonzero(r["fa_nr"]) else None,
                "Bezeichnung": clean(r["famodell"]),
                "Linie": clean(r["fa_linie"]),
                "Farbe": clean(r["fafarbe"]),
                "Groesse": clean(r["fagr"]),
                "Betrag": num(r["vkfa"]),
                "Hersteller": clean(r["faherst"]),
            })

        glastyp_id = None
        if any(clean(r[c]) for c in ("glbez", "glherst", "globfl", "glgr", "glfarbe", "glmat")):
            glastyp_id = len(glastypen) + 1
            gr_r, gr_l = clean(r["glgr"]), clean(r["glgr_l"])
            glastypen.append({
                "id": glastyp_id,
                "Bezeichnung": clean(r["glbez"]),
                "Hersteller": clean(r["glherst"]),
                "Verguetung": ", ".join(v for v in (clean(r[c]) for c in ("globfl", "glveredel2", "glveredel3", "glveredel4", "glveredel5")) if v) or None,
                "GlasGroesse": f"R {gr_r} / L {gr_l}" if gr_l and gr_l != gr_r else gr_r,
                "Sonstiges": ", ".join(v for v in (clean(r["glmat"]), clean(r["gledvcodes"])) if v) or None,
                "Farbe": clean(r["glfarbe"]),
            })

        glas_ids = {}
        for seite, s in (("Rechts", "r"), ("Links", "l")):
            werte = {
                "Sph": num(r[f"sph{s}"]), "Cyl": num(r[f"cyl{s}"]), "A": num(r[f"a{s}"]),
                "PD": num(r[f"pd{s}"]), "Add": num(r[f"add{s}"]), "y_h": num(r[f"nh{s}"]),
                "Pr": num(r[f"pr{s}"]), "B": num(r[f"b{s}"]), "HSA": num(r[f"hsa{s}"]),
                "Vis": num(r[f"vis{s}"]), "iod": num(r[f"iod{s}"]), "Betrag": num(r[f"vkgl{s}"]),
            }
            if all(v is None for v in werte.values()):
                continue
            glas_ids[seite] = len(glaeser) + 1
            glaeser.append({
                "id": glas_ids[seite], **werte, "Seite": seite,
                "Auftragsstatus": None if noch_offen else "abgeholt",
            })

        kabrechnung = re.sub(r"\s{2,}", " ", clean(r["kabrechnung"]) or "")
        kk = lines(
            f"Kassenabrechnung: {kabrechnung}" if kabrechnung else None,
            f"Kassenpositionen: {clean(r['kpos'])}" if clean(r["kpos"]) else None,
            f"Zuzahlung: {euro(num(r['kzuzahlung']))}" if nonzero(r["kzuzahlung"]) else None,
        )
        notizen = lines(
            clean(r["memo"]),
            leistungen_text(r, 4),
            kk,
            *(f"Merkmal: {clean(r[f'br_merkmal{i}'])}" for i in (1, 2, 3) if clean(r[f"br_merkmal{i}"])),
            f"Rechnungsdatum: {date(r['rech_datum']).strftime('%d.%m.%Y')}" if date(r["rech_datum"]) else None,
            f"Übernommen aus Prisma (Auftrag Nr. {nr}).",
            "In Prisma als gelöscht markiert (Filiale 999)." if geloescht else None,
        )
        rech_nr = clean(r["rech_nr"])
        brillen.append({
            "id": nr,
            "created_at": datum,
            "kunde_id": kunde_id,
            "Datum": datum,
            "BrillenArt": clean(r["brille"]),
            "Berater": clean(r["berater"]),
            "Refraktion": clean(r["refraktion"]),
            "Werkstatt": clean(r["werkstatt"]),
            "Abholung": date(r["br_datum2"]),
            "Notizen": notizen,
            "GlasLinks": glas_ids.get("Links"),
            "GlasRechts": glas_ids.get("Rechts"),
            "Fassung": fassung_id,
            "Glastyp": glastyp_id,
            "Summe": num(r["vksumme"]),
            "Anzahlung": num(r["anzahlung"]) or Decimal(0),
            "KKAnteil": num(r["kanteil"]) or Decimal(0),
            "Rechnungsnummer": rech_nr if rech_nr and rech_nr != "0" else None,
            "Zahlungsstatus": "bezahlt",
            "Mahnstufe": 0,
        })
    return brillen, glaeser, glastypen, fassungen, report


def map_kontaktlinsen(dump, kunden_ids):
    result, report = [], {"geloescht": 0, "ohne_kunde": 0}
    for r in rows(dump, "cl"):
        kunde_id = int(r["kunden_nr"])
        if kunde_id not in kunden_ids:
            report["ohne_kunde"] += 1
            continue
        geloescht = r["filnr"] == FILIALE_GELOESCHT
        report["geloescht"] += geloescht
        seiten = {}
        for seite, s in (("Rechts", "r"), ("Links", "l")):
            seiten.update({
                f"Linsentyp{seite}": clean(r[f"typ{s}"]),
                f"Radius{seite}": num(r[f"bc{s}"]) or radius(r[f"bc_{s}"]),
                f"Durchmesser{seite}": num(r[f"dm{s}"]),
                f"Sph{seite}": num(r[f"sph{s}"]),
                f"Cyl{seite}": num(r[f"cyl{s}"]),
                f"Achse{seite}": num(r[f"a{s}"]),
                f"Hersteller{seite}": clean(r[f"herst{s}"]),
                f"Preis{seite}": num(r[f"vk{s}"]),
            })
        rech_nr = clean(r["rech_nr"])
        notizen = lines(
            f"Art: {clean(r['clart'])}" if clean(r["clart"]) else None,
            f"Grund: {clean(r['grund'])}" if clean(r["grund"]) else None,
            f"Addition R/L: {clean(r['addr']) or '-'} / {clean(r['addl']) or '-'}" if clean(r["addr"]) or clean(r["addl"]) else None,
            f"Visus R/L: {clean(r['cl_visr']) or '-'} / {clean(r['cl_visl']) or '-'}" if clean(r["cl_visr"]) or clean(r["cl_visl"]) else None,
            f"Pflege/Bestellung: {clean(r['pflege'])}" if clean(r["pflege"]) else None,
            leistungen_text(r, 4),
            f"Kommentar rechts: {clean(r['kommr'])}" if clean(r["kommr"]) else None,
            f"Kommentar links: {clean(r['komml'])}" if clean(r["komml"]) else None,
            f"Rechnungsnummer (Prisma): {rech_nr}" if rech_nr and rech_nr != "0" else None,
            f"Übernommen aus Prisma (KL-Auftrag Nr. {r['nr']}).",
            "In Prisma als gelöscht markiert (Filiale 999)." if geloescht else None,
        )
        datum = date(r["cl_datum"])
        result.append({
            "id": int(r["nr"]),
            "created_at": datum,
            "kunde_id": kunde_id,
            "Berater": clean(r["anpasser"]),
            "Datum": datum,
            "Abholung": date(r["cl_bezdatum"]) or date(r["cl_datum2"]),
            "Nachkontrolltermin": date(r["naechsterkontakt"]),
            "Notizen": notizen,
            **seiten,
            "Summe": num(r["vksumme"]),
        })
    return result, report


def load_sf6_catalogs(sf6_dir):
    """Liest alle nicht-leeren SF6-Kataloge eines Verzeichnisses ein."""
    catalogs, skipped = [], []
    for d in sorted(p for p in Path(sf6_dir).iterdir() if p.is_dir()):
        files = {f.name.lower(): f for f in d.iterdir() if f.is_file()}
        if any(k not in files or files[k].stat().st_size == 0 for k in ("head.dat", "lenstype.dat")):
            skipped.append(d.name)
            continue
        t = {v: (files[k].read_text(encoding="iso-8859-1") if k in files else "") for k, v in sf6.REQUIRED_FILES.items()}
        hersteller = sf6.parse_head(t["head"])
        # Die Preisspalten sind nur für das 69 Zeichen breite LensPrice- bzw.
        # 53 Zeichen breite OptionsPrice-Layout (POL, SF6 6.10) verifiziert;
        # andere Layouts liefern mit diesen Positionen falsche Werte -> ohne
        # Preise importieren statt falsche Preise zu speichern.
        lens_widths = {len(x) for x in sf6.split_lines(t["lensPrice"])}
        opt_widths = {len(x) for x in sf6.split_lines(t["optionsPrice"])}
        basispreise = sf6.parse_lens_price(t["lensPrice"]) if lens_widths == {69} else {}
        option_preise = sf6.parse_options_price(t["optionsPrice"]) if opt_widths == {53} else {}
        farb_gruppen = sf6.parse_options_color_groups(t["optionsColor"])
        produkte = dict(sf6.parse_code_name_lines(t["lensType"]))
        optionen = dict(sf6.parse_code_name_lines(t["options"]))
        verfuegbar = sf6.parse_combination(t["combination"])
        catalogs.append({
            "ordner": d.name,
            "code": hersteller["code"],
            "name": hersteller["name"] if hersteller["name"] not in ("neu", "") else d.name,
            "produkte": [(c, b, sf6.extract_brechungsindex(b), basispreise.get(c)) for c, b in produkte.items()],
            "optionen": [(c, b, "farbe" if c in farb_gruppen else "beschichtung", option_preise.get(c)) for c, b in optionen.items()],
            "links": [(e, o) for e, opts in verfuegbar.items() if e in produkte for o in opts if o in optionen],
            "mit_preisen": bool(basispreise),
        })
    return catalogs, skipped


# --------------------------------------------------------------------------
# Datenbank
# --------------------------------------------------------------------------

MAX_PARAMS = 30000

# Enum-Spalten: Parameter explizit casten, damit Postgres den Text annimmt.
CASTS = {"Anrede": "anrede", "KrankenversicherungsTyp": "krankenversicherung", "Seite": "seite"}


def insert_rows(con, table, records, conflict=None):
    if not records:
        return 0
    cols = list(records[0].keys())
    collist = ", ".join(f'"{c}"' for c in cols)
    per_batch = max(1, MAX_PARAMS // len(cols))
    for i in range(0, len(records), per_batch):
        batch = records[i:i + per_batch]
        params, values = {}, []
        for j, rec in enumerate(batch):
            ph = []
            for k, c in enumerate(cols):
                key = f"p{j}_{k}"
                params[key] = rec[c]
                ph.append(f":{key}::public.{CASTS[c]}" if c in CASTS else f":{key}")
            values.append("(" + ", ".join(ph) + ")")
        sql = f"insert into public.{table} ({collist}) values {', '.join(values)}"
        if conflict:
            sql += " " + conflict
        con.run(sql, **params)
    return len(records)


def import_sf6(con, catalogs):
    summary = []
    for cat in catalogs:
        h = con.run(
            "insert into public.glashersteller (code, name, updated_at) values (:c, :n, now()) "
            "on conflict (code) do update set name = excluded.name, updated_at = excluded.updated_at returning id",
            c=cat["code"], n=cat["name"],
        )[0][0]
        insert_rows(con, "glaskatalog", [
            {"glashersteller_id": h, "esd_code": c, "bezeichnung": b, "brechungsindex": idx, "basispreis": p, "aktiv": True}
            for c, b, idx, p in cat["produkte"]
        ], 'on conflict (glashersteller_id, esd_code) do update set bezeichnung = excluded.bezeichnung, '
           'brechungsindex = excluded.brechungsindex, basispreis = excluded.basispreis, aktiv = true, updated_at = now()')
        con.run("update public.glaskatalog set aktiv = false, updated_at = now() "
                "where glashersteller_id = :h and aktiv and updated_at <> now()", h=h)
        insert_rows(con, "glaskatalog_option", [
            {"glashersteller_id": h, "code": c, "bezeichnung": b, "typ": t, "preis": p}
            for c, b, t, p in cat["optionen"]
        ], 'on conflict (glashersteller_id, code) do update set bezeichnung = excluded.bezeichnung, '
           'typ = excluded.typ, preis = excluded.preis, updated_at = now()')
        con.run("delete from public.glaskatalog_hat_option where glaskatalog_id in "
                "(select id from public.glaskatalog where glashersteller_id = :h and aktiv)", h=h)
        produkt_ids = dict(con.run("select esd_code, id from public.glaskatalog where glashersteller_id = :h", h=h))
        option_ids = dict(con.run("select code, id from public.glaskatalog_option where glashersteller_id = :h", h=h))
        insert_rows(con, "glaskatalog_hat_option", [
            {"glaskatalog_id": produkt_ids[e], "glaskatalog_option_id": option_ids[o]} for e, o in cat["links"]
        ], "on conflict (glaskatalog_id, glaskatalog_option_id) do nothing")
        summary.append((cat["name"], cat["code"], len(cat["produkte"]), len(cat["optionen"]), len(cat["links"]), cat["mit_preisen"]))
    return summary


def reset_identity(con, table):
    con.run(f"select setval(pg_get_serial_sequence('public.{table}', 'id'), "
            f"greatest((select coalesce(max(id), 0) from public.{table}), 1))")


def validate(con):
    checks = {
        "Kunden": "select count(*) from public.kunde",
        "Brillen-Aufträge": "select count(*) from public.brille",
        "Gläser": "select count(*) from public.glass",
        "Glastypen": "select count(*) from public.glastyp",
        "Fassungen": "select count(*) from public.fassung",
        "Kontaktlinsen-Aufträge": "select count(*) from public.kontaktlinse",
        "Glashersteller": "select count(*) from public.glashersteller",
        "Katalog-Grundgläser": "select count(*) from public.glaskatalog",
        "Katalog-Optionen": "select count(*) from public.glaskatalog_option",
        "Katalog-Verknüpfungen": "select count(*) from public.glaskatalog_hat_option",
        "Brillen ohne gültigen Kunden": "select count(*) from public.brille b left join public.kunde k on k.id = b.kunde_id where k.id is null",
        "Offene Posten in Mahnungen": "select count(*) from public.brille where \"Zahlungsstatus\" = 'offen' and \"Rechnungsnummer\" is not null",
        "Kunden ohne Nachname": "select count(*) from public.kunde where \"Nachname\" is null",
    }
    return {name: con.run(sql)[0][0] for name, sql in checks.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dump", required=True, help="Prisma prismadb/backupN.dat")
    ap.add_argument("--sf6-dir", required=True, help="Prisma Resource/prisma/glaspreise")
    ap.add_argument("--project-ref", required=True, help="Supabase-Projekt, z. B. cktdtojgrxskihihmnjm (Prod)")
    ap.add_argument("--host", default=DEFAULT_POOLER_HOST, help="Session-Pooler-Host (Dashboard -> Connect)")
    ap.add_argument("--port", type=int, default=5432)
    ap.add_argument("--commit", action="store_true", help="Änderungen speichern (sonst Probelauf mit Rollback)")
    args = ap.parse_args()

    import pg8000.native

    heute = dt.date.today()
    print("1/4 Lese Prisma-Sicherung ...")
    dump = Dump(args.dump)
    kunden, rep_k = map_kunden(dump)
    kunden_ids = {k["id"] for k in kunden}
    brillen, glaeser, glastypen, fassungen, rep_b = map_brillen(dump, kunden_ids, heute)
    linsen, rep_c = map_kontaktlinsen(dump, kunden_ids)
    catalogs, skipped = load_sf6_catalogs(args.sf6_dir)
    print(f"    {len(kunden)} Kunden, {len(brillen)} Brillen-Aufträge, {len(linsen)} Kontaktlinsen-Aufträge, "
          f"{len(catalogs)} Glaskataloge (leer/übersprungen: {', '.join(skipped) or '-'})")

    password = os.environ.get("PGPASSWORD") or getpass.getpass(f"Datenbank-Passwort für Projekt {args.project_ref}: ")
    print(f"2/4 Verbinde mit {args.host} (Projekt {args.project_ref}) ...")
    con = pg8000.native.Connection(
        user=f"postgres.{args.project_ref}", password=password, host=args.host, port=args.port,
        database="postgres", ssl_context=ssl.create_default_context(), timeout=600,
    )
    con.run("set statement_timeout = 0")

    vorhanden = con.run("select (select count(*) from public.kunde), (select count(*) from public.brille), "
                        "(select count(*) from public.kontaktlinse)")[0]
    if any(vorhanden):
        sys.exit(f"Abbruch: Zieldatenbank enthält bereits Kunden/Aufträge {tuple(vorhanden)} - "
                 "der Import ist nur für eine leere Datenbank gedacht.")
    nullable = con.run("select is_nullable from information_schema.columns where table_schema = 'public' "
                       "and table_name = 'kunde' and column_name in ('Anrede', 'Notizen') order by column_name")
    if [r[0] for r in nullable] != ["YES", "YES"]:
        sys.exit("Abbruch: Migration 20261010120000_kunde_notizen_anrede_optional ist auf diesem Projekt "
                 "noch nicht angewendet.")

    print("3/4 Importiere (eine Transaktion) ...")
    con.run("begin")
    try:
        con.run("update public.betrieb set \"Name\" = :n, \"IKNummer\" = :ik, \"Praequalifiziert\" = :pq where id = 1",
                n=BETRIEB["Name"], ik=BETRIEB["IKNummer"], pq=BETRIEB["Praequalifiziert"])
        sf6_summary = import_sf6(con, catalogs)
        insert_rows(con, "kunde", [{**k, "created_at": k["created_at"] or heute} for k in kunden])
        insert_rows(con, "fassung", fassungen)
        insert_rows(con, "glastyp", glastypen)
        insert_rows(con, "glass", glaeser)
        # Summe aus Prisma übernehmen: Die Leistungen stehen als Freitext in
        # den Notizen (kein Katalogbezug), die automatische Neuberechnung
        # würde sie unterschlagen. Trigger nur innerhalb dieser Transaktion aus.
        con.run("alter table public.brille disable trigger brille_calc_summe_trigger")
        insert_rows(con, "brille", [{**b, "created_at": b["created_at"] or heute} for b in brillen])
        con.run("alter table public.brille enable trigger brille_calc_summe_trigger")
        insert_rows(con, "kontaktlinse", [{**c, "created_at": c["created_at"] or heute} for c in linsen])
        for t in ("kunde", "fassung", "glastyp", "glass", "brille", "kontaktlinse"):
            reset_identity(con, t)

        print("4/4 Prüfe ...")
        result = validate(con)
        summen = con.run("select coalesce(sum(\"Summe\"), 0) from public.brille")[0][0]
        erwartet = sum((b["Summe"] or 0) for b in brillen)

        print("\nGlaskataloge:")
        for name, code, p, o, l, preise in sf6_summary:
            print(f"  {name} ({code}): {p} Gläser, {o} Optionen, {l} Verknüpfungen{'' if preise else ', ohne Preise'}")
        print("\nErgebnis in der Datenbank:")
        for k, v in result.items():
            print(f"  {k:32s} {v}")
        print(f"  {'Summe Brillen-Aufträge':32s} {summen} (Prisma: {erwartet})")
        print(f"\nHinweise: {rep_k['anrede_unbekannt']} Kunden ohne zuordenbare Anrede, "
              f"{rep_k['geloescht']} Kunden / {rep_b['geloescht']} Brillen / {rep_c['geloescht']} KL aus Filiale 999 (markiert).")

        fehler = []
        if result["Kunden"] != len(kunden):
            fehler.append("Kundenanzahl weicht ab")
        if result["Brillen-Aufträge"] != len(brillen):
            fehler.append("Anzahl Brillen-Aufträge weicht ab")
        if result["Kontaktlinsen-Aufträge"] != len(linsen):
            fehler.append("Anzahl Kontaktlinsen-Aufträge weicht ab")
        if result["Brillen ohne gültigen Kunden"]:
            fehler.append("Brillen ohne Kunden")
        if summen != erwartet:
            fehler.append("Auftragssummen weichen ab")
        if fehler:
            raise RuntimeError("Prüfung fehlgeschlagen: " + ", ".join(fehler))

        if args.commit:
            con.run("commit")
            print("\nGESPEICHERT. Der Import ist abgeschlossen.")
        else:
            con.run("rollback")
            print("\nPROBELAUF erfolgreich - nichts gespeichert. Zum Speichern mit --commit erneut starten.")
    except Exception:
        con.run("rollback")
        print("\nFehler - alle Änderungen wurden zurückgerollt.")
        raise
    finally:
        con.close()


if __name__ == "__main__":
    main()
