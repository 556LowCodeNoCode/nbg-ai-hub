#!/usr/bin/env python3
"""Extract structured text (paragraphs w/ style + tables) from a .docx."""
import sys, zipfile, re
import xml.etree.ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def para_text(p):
    parts = []
    for node in p.iter():
        if node.tag == W + 't':
            parts.append(node.text or '')
        elif node.tag == W + 'tab':
            parts.append('\t')
        elif node.tag in (W + 'br', W + 'cr'):
            parts.append('\n')
    return ''.join(parts)

def para_style(p):
    pPr = p.find(W + 'pPr')
    if pPr is None:
        return ''
    s = pPr.find(W + 'pStyle')
    return s.get(W + 'val') if s is not None else ''

def para_numbered(p):
    pPr = p.find(W + 'pPr')
    if pPr is None:
        return None
    n = pPr.find(W + 'numPr')
    if n is None:
        return None
    ilvl = n.find(W + 'ilvl')
    numid = n.find(W + 'numId')
    return (ilvl.get(W + 'val') if ilvl is not None else '0',
            numid.get(W + 'val') if numid is not None else '?')

def walk(body, out, depth=0):
    for child in body:
        if child.tag == W + 'p':
            txt = para_text(child).strip()
            st = para_style(child)
            num = para_numbered(child)
            if not txt:
                continue
            pre = ''
            if st:
                pre += '[%s]' % st
            if num:
                pre += '[list L%s#%s]' % num
            out.append(('  ' * depth) + (pre + ' ' if pre else '') + txt)
        elif child.tag == W + 'tbl':
            out.append(('  ' * depth) + '<<TABLE>>')
            for row in child.findall(W + 'tr'):
                cells = []
                for tc in row.findall(W + 'tc'):
                    sub = []
                    walk(tc, sub, 0)
                    cells.append(' / '.join(x.strip() for x in sub))
                out.append(('  ' * depth) + '| ' + ' | '.join(cells))
            out.append(('  ' * depth) + '<<END TABLE>>')

def main(path):
    z = zipfile.ZipFile(path)
    out = []
    root = ET.fromstring(z.read('word/document.xml'))
    body = root.find(W + 'body')
    walk(body, out)
    # headers/footers can carry party names / contract refs
    for name in z.namelist():
        if re.match(r'word/(header|footer)\d*\.xml', name):
            hroot = ET.fromstring(z.read(name))
            sub = []
            walk(hroot, sub)
            sub = [s for s in sub if s.strip()]
            if sub:
                out.append('\n=== %s ===' % name)
                out.extend(sub)
    print('\n'.join(out))

if __name__ == '__main__':
    main(sys.argv[1])
