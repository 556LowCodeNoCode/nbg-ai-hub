#!/usr/bin/env python3
"""Pure-python extractor for legacy Word 97-2003 .doc (OLE2/CFB + piece table)."""
import sys, struct

class CFB:
    def __init__(self, data):
        self.d = data
        assert data[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1', 'not CFB'
        self.ssz = 1 << struct.unpack_from('<H', data, 30)[0]
        self.mssz = 1 << struct.unpack_from('<H', data, 32)[0]
        nfat = struct.unpack_from('<I', data, 44)[0]
        dirstart = struct.unpack_from('<I', data, 48)[0]
        self.minicut = struct.unpack_from('<I', data, 56)[0]
        ministart = struct.unpack_from('<I', data, 60)[0]
        difstart = struct.unpack_from('<I', data, 68)[0]
        ndif = struct.unpack_from('<I', data, 72)[0]

        # DIFAT: first 109 entries in header, rest in DIFAT sectors
        difat = list(struct.unpack_from('<109I', data, 76))
        sec = difstart
        for _ in range(ndif):
            if sec >= 0xFFFFFFFA:
                break
            off = self.soff(sec)
            per = self.ssz // 4 - 1
            difat += list(struct.unpack_from('<%dI' % per, data, off))
            sec = struct.unpack_from('<I', data, off + per * 4)[0]
        difat = [x for x in difat[:nfat] if x < 0xFFFFFFFA]

        self.fat = []
        for s in difat:
            self.fat += list(struct.unpack_from('<%dI' % (self.ssz // 4), data, self.soff(s)))

        self.minifat = []
        s = ministart
        while s < 0xFFFFFFFA:
            self.minifat += list(struct.unpack_from('<%dI' % (self.ssz // 4), data, self.soff(s)))
            s = self.fat[s]

        # directory
        self.dirs = {}
        self.root = None
        s, entries = dirstart, []
        while s < 0xFFFFFFFA:
            base = self.soff(s)
            for i in range(self.ssz // 128):
                e = base + i * 128
                nlen = struct.unpack_from('<H', data, e + 64)[0]
                if nlen == 0:
                    continue
                name = data[e:e + nlen - 2].decode('utf-16-le', 'replace')
                typ = data[e + 66]
                start = struct.unpack_from('<I', data, e + 116)[0]
                size = struct.unpack_from('<Q', data, e + 120)[0]
                entries.append((name, typ, start, size))
            s = self.fat[s]
        for name, typ, start, size in entries:
            if typ == 5:
                self.root = (start, size)
            self.dirs[name] = (start, size)
        self.ministream = self._chain(self.root[0], self.root[1], mini=False)

    def soff(self, s):
        return 512 + s * self.ssz

    def _chain(self, start, size, mini):
        out = bytearray()
        s = start
        if mini:
            while s < 0xFFFFFFFA and len(out) < size:
                o = s * self.mssz
                out += self.ministream[o:o + self.mssz]
                s = self.minifat[s]
        else:
            while s < 0xFFFFFFFA and len(out) < size:
                out += self.d[self.soff(s):self.soff(s) + self.ssz]
                s = self.fat[s]
        return bytes(out[:size])

    def stream(self, name):
        if name not in self.dirs:
            return None
        start, size = self.dirs[name]
        return self._chain(start, size, mini=(size < self.minicut))


def extract(path):
    cfb = CFB(open(path, 'rb').read())
    wd = cfb.stream('WordDocument')
    flags = struct.unpack_from('<H', wd, 0x0A)[0]
    table_name = '1Table' if (flags & 0x0200) else '0Table'
    tbl = cfb.stream(table_name)

    fcClx, lcbClx = struct.unpack_from('<II', wd, 418)
    clx = tbl[fcClx:fcClx + lcbClx]

    # skip Prc entries to find Pcdt (starts with 0x02)
    i = 0
    while i < len(clx) and clx[i] == 0x01:
        cb = struct.unpack_from('<H', clx, i + 1)[0]
        i += 3 + cb
    assert clx[i] == 0x02, 'no Pcdt'
    lcbPlc = struct.unpack_from('<I', clx, i + 1)[0]
    plc = clx[i + 5:i + 5 + lcbPlc]

    n = (len(plc) - 4) // 12
    cps = list(struct.unpack_from('<%dI' % (n + 1), plc, 0))
    pcds_off = (n + 1) * 4

    chunks = []
    for k in range(n):
        pcd = plc[pcds_off + k * 8: pcds_off + (k + 1) * 8]
        fc = struct.unpack_from('<I', pcd, 2)[0]
        compressed = bool(fc & 0x40000000)
        fc = fc & 0x3FFFFFFF
        ncp = cps[k + 1] - cps[k]
        if compressed:
            raw = wd[fc // 2: fc // 2 + ncp]
            txt = raw.decode('cp1253', 'replace')
        else:
            raw = wd[fc: fc + ncp * 2]
            txt = raw.decode('utf-16-le', 'replace')
        chunks.append(txt)

    text = ''.join(chunks)
    # Word control chars -> readable
    text = (text.replace('\r', '\n').replace('\x07', '\t|')
                .replace('\x0b', '\n').replace('\x0c', '\n--- PAGE BREAK ---\n')
                .replace('\x13', '').replace('\x14', '').replace('\x15', '')
                .replace('\x01', '[OBJ]').replace('\x08', '').replace('\x02', ''))
    return text


if __name__ == '__main__':
    sys.stdout.write(extract(sys.argv[1]))
