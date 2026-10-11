#!/usr/bin/env python3
"""Minimal reader for PostgreSQL custom-format dumps (PGDMP, archive v1.12).

Usage:
  pgdump_reader.py DUMP toc                 -> list TOC entries
  pgdump_reader.py DUMP schema TABLE        -> print CREATE TABLE definition
  pgdump_reader.py DUMP data TABLE [N]      -> print COPY data (first N lines)
"""
import struct
import sys
import zlib


class Dump:
    def __init__(self, path):
        self.f = open(path, "rb")
        f = self.f
        assert f.read(5) == b"PGDMP"
        self.vmaj, self.vmin, self.vrev, self.intsize, self.offsize, self.fmt = f.read(6)
        self.ver = (self.vmaj, self.vmin, self.vrev)
        self.compression = self.rint()
        self.timestamp = [self.rint() for _ in range(7)]
        self.dbname = self.rstr()
        self.remote_version = self.rstr()
        self.pgdump_version = self.rstr()
        n = self.rint()
        self.toc = [self.read_entry() for _ in range(n)]

    def rint(self):
        sign = self.f.read(1)[0]
        b = self.f.read(self.intsize)
        v = 0
        for i, byte in enumerate(b):
            v |= byte << (8 * i)
        return -v if sign else v

    def rstr(self):
        n = self.rint()
        if n < 0:
            return None
        return self.f.read(n).decode("utf-8", "replace")

    def roff(self):
        flag = self.f.read(1)[0]
        b = self.f.read(self.offsize)
        v = 0
        for i, byte in enumerate(b):
            v |= byte << (8 * i)
        return flag, v

    def read_entry(self):
        e = {}
        e["dumpId"] = self.rint()
        e["hadDumper"] = self.rint()
        e["tableoid"] = self.rstr()
        e["oid"] = self.rstr()
        e["tag"] = self.rstr()
        e["desc"] = self.rstr()
        e["section"] = self.rint()
        e["defn"] = self.rstr()
        e["dropStmt"] = self.rstr()
        e["copyStmt"] = self.rstr()
        e["namespace"] = self.rstr()
        e["tablespace"] = self.rstr()
        e["owner"] = self.rstr()
        e["withOids"] = self.rstr()
        deps = []
        while True:
            d = self.rstr()
            if d is None:
                break
            deps.append(d)
        e["deps"] = deps
        e["offflag"], e["offset"] = self.roff()
        return e

    def find(self, tag, desc):
        for e in self.toc:
            if e["tag"] == tag and e["desc"] == desc:
                return e
        return None

    def iter_data(self, entry):
        """Yield decoded COPY text lines of a TABLE DATA entry."""
        f = self.f
        f.seek(entry["offset"])
        btype = f.read(1)[0]
        dump_id = self.rint()
        assert btype == 1 and dump_id == entry["dumpId"], (btype, dump_id)
        dec = zlib.decompressobj() if self.compression != 0 else None
        buf = b""
        while True:
            n = self.rint()
            if n == 0:
                break
            chunk = f.read(n)
            buf += dec.decompress(chunk) if dec else chunk
            *lines, buf = buf.split(b"\n")
            for line in lines:
                if line == b"\\.":
                    return
                yield line.decode("utf-8", "replace")
        if dec:
            buf += dec.flush()
        for line in buf.split(b"\n"):
            if line and line != b"\\.":
                yield line.decode("utf-8", "replace")


def unescape(field):
    if field == "\\N":
        return None
    out, i = [], 0
    while i < len(field):
        c = field[i]
        if c == "\\" and i + 1 < len(field):
            n = field[i + 1]
            out.append({"t": "\t", "n": "\n", "r": "\r", "\\": "\\", "b": "\b", "f": "\f", "v": "\v"}.get(n, n))
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def rows(dump, table):
    e = dump.find(table, "TABLE DATA")
    if e is None:
        raise KeyError(table)
    cols = e["copyStmt"].split("(", 1)[1].rsplit(")", 1)[0]
    cols = [c.strip().strip('"') for c in cols.split(",")]
    for line in dump.iter_data(e):
        yield dict(zip(cols, (unescape(x) for x in line.split("\t"))))


if __name__ == "__main__":
    d = Dump(sys.argv[1])
    cmd = sys.argv[2]
    if cmd == "toc":
        print(f"version={d.ver} compression={d.compression} db={d.dbname} server={d.remote_version} entries={len(d.toc)}")
        for e in d.toc:
            print(f"{e['dumpId']:6d} {e['desc']:<22} {e['namespace'] or '':<10} {e['tag']}")
    elif cmd == "schema":
        print(d.find(sys.argv[3], "TABLE")["defn"])
    elif cmd == "data":
        limit = int(sys.argv[4]) if len(sys.argv) > 4 else None
        for i, line in enumerate(d.iter_data(d.find(sys.argv[3], "TABLE DATA"))):
            if limit is not None and i >= limit:
                break
            print(line)
    elif cmd == "count":
        for e in d.toc:
            if e["desc"] == "TABLE DATA":
                n = sum(1 for _ in d.iter_data(e))
                if n:
                    print(f"{n:8d} {e['tag']}")
