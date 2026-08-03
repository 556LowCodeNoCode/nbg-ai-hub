#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Resolve each rule module to real text in the cleaned templates.

Every anchor is *found* in the document, never assumed: an ARTICLE anchor
resolves through the heading index, a CLAUSE anchor through a regex that must
match inside that article. Anything that does not resolve is reported as
ΛΕΙΠΕΙ — that list is the drafting backlog for Legal.
"""
import zipfile, re, json, csv, os, unicodedata
import xml.etree.ElementTree as ET


def fold(s):
    """Strip Greek diacritics and normalise final sigma, so an anchor written
    'άκυρ' still matches 'ακυρότητα'. Accent-sensitive matching produced false
    'missing clause' reports."""
    d = unicodedata.normalize('NFD', s)
    d = ''.join(c for c in d if not unicodedata.combining(c))
    return unicodedata.normalize('NFC', d).replace('ς', 'σ').lower()

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
TDIR = ("/mnt/c/Users/Anastasios.Kakavouli/OneDrive - EY/Desktop/Claude Code/Procurement/"
        "Vendors' Contracts/LEGAL CONTRACTS/LEGAL CONTRACTS/templates_clean/")
FILES = {'A': 'A_IT_PLATFORM_TEMPLATE_v2.docx', 'B': 'B_IT_SOLUTION_TEMPLATE_v2.docx',
         'C': 'C_IT_CONSULTING_TEMPLATE_v2.docx', 'D': 'D_ADDENDUM_TEMPLATE_v2.docx'}
SP = '/tmp/claude-1000/-mnt-c-WINDOWS-system32/75c6e24c-5e20-476b-a99d-b67358c7ac16/scratchpad'


def load(cat):
    root = ET.fromstring(zipfile.ZipFile(TDIR + FILES[cat]).read('word/document.xml'))
    ps = list(root.iter(W + 'p'))
    txt = [''.join(t.text or '' for t in p.iter(W + 't')).strip() for p in ps]
    heads = []
    for i, p in enumerate(ps):
        pPr = p.find(W + 'pPr')
        st = None
        if pPr is not None:
            s = pPr.find(W + 'pStyle')
            if s is not None:
                st = s.get(W + 'val')
        if st and st.startswith('Heading') and txt[i]:
            heads.append([i, txt[i]])
    # Keyed by ORDINAL position, never by the printed number: template A prints
    # "Άρθρο 23" twice, so a number-keyed index would silently lose an article.
    # 'printed' is reproduced exactly as it appears in the document.
    arts = {}
    for j, (i, t) in enumerate(heads):
        end = heads[j + 1][0] - 1 if j + 1 < len(heads) else len(ps) - 1
        m = re.match(r'Άρθρο\s+(\d+)\.\s*(.+)', t)
        printed = m.group(1) if m else str(j + 1)
        title = (m.group(2) if m else t).strip()
        arts[j + 1] = {'no': printed, 'ordinal': j + 1, 'title': title, 'p0': i, 'p1': end}
    return txt, arts


DOCS = {c: load(c) for c in FILES}

A_ = lambda n: ('ART', n)
def CL(n, rx): return ('CLAUSE', n, rx)
def PART(n, rx, note): return ('PARTIAL', n, rx, note)   # concept partly covered elsewhere

# ── module → anchor per category ───────────────────────────────────────────
MAP = {
 'M01':  {'A': CL(0, r'ΜΕΤΑΞΥ'), 'B': CL(0, r'μεταξύ των Συμβαλλομένων'),
          'C': CL(0, r'μεταξύ των Συμβαλλομένων'), 'D': CL(0, r'μεταξύ των Συμβαλλομένων')},
 'M02':  {'A': A_(1)},
 'M03':  {'A': A_(2), 'B': A_(1), 'C': A_(1)},
 'M03a': {'A': CL(2, r'Software-as-a-Service'), 'B': CL(1, r'Software as a Service')},
 'M04':  {'A': A_(7), 'B': A_(2), 'C': A_(2)},
 'M05':  {'A': A_(4)},
 'M06':  {'A': A_(5)},
 'M07':  {'B': A_(3), 'C': A_(3)},
 'M08':  {'A': A_(6), 'B': CL(6, r'Εγγυητική Επιστολή'), 'C': CL(6, r'Εγγυητική Επιστολή')},
 'M09':  {'A': A_(11), 'B': A_(4), 'C': A_(4), 'D': CL(0, r'συνολικό ποσό')},
 'M09a': {'A': CL(12, r'οροσημα'), 'B': CL(4, r'εκπληρωση των κατωτερω οροσημ'), 'C': CL(4, r'οροσημα')},
 'M09b': {},
 'M09c': {'B': CL(4, r'commercials\.hardware\.included')},
 'M09d': {'B': CL(4, r'transition\.legacy_support')},
 'M10':  {'A': A_(12), 'B': CL(4, r'καταβολή'), 'C': CL(4, r'θα καταβάλλεται')},
 'M11':  {'A': A_(3), 'B': A_(5), 'C': A_(5)},
 'M11a': {'A': CL(3, r'εγκαταστάσεις της Τράπεζας'), 'B': CL(5, r'εγκαταστάσεις της Τράπεζας'),
          'C': CL(5, r'εγκαταστάσεις της Τράπεζας')},
 'M12':  {'A': CL(3, r'Εταιρικής Κοινωνικής Ευθύνης'), 'B': CL(5, r'Εταιρικής Κοινωνικής Ευθύνης'),
          'C': CL(5, r'Εταιρικής Κοινωνικής Ευθύνης')},
 'M13':  {'A': CL(3, r'ΔΗΛΩΣΕΙΣ – ΕΓΓΥΗΣΕΙΣ'), 'B': A_(6), 'C': A_(6)},
 'M14':  {'B': A_(7), 'C': A_(7)},
 'M15':  {'A': A_(8), 'B': CL(5, r'ευθύν'), 'C': CL(5, r'ευθύν')},
 'M16':  {'A': A_(9)},
 'M17':  {'A': A_(10)},
 'M18':  {'A': A_(13), 'B': A_(8), 'C': A_(8)},
 'M18a': {'A': CL(13, r'subcontracting\.approved_subcontractors'),
          'B': CL(8, r'εγκεκριμέν\w+ υπεργολάβ'), 'C': CL(5, r'Υπεργολάβ|υπεργολάβ')},
 'M18b': {'A': CL(13, r'ίδια συμβατικά δικαιώματα πρόσβασης'), 'B': CL(8, r'ίδια συμβατικά|ίδια δικαιώματα')},
 'M19':  {'A': A_(14)},
 'M20':  {'A': A_(15)},
 'M20a': {'A': CL(15, r'ιού'), 'B': CL(3, r'ιού')},
 'M21':  {'A': A_(16), 'B': CL(3, r'ΠΟΙΝΙΚΕΣ ΡΗΤΡΕΣ')},
 'M21a': {'A': CL(16, r'διαθεσιμότητ'), 'B': CL(3, r'διαθεσιμότητ')},
 'M21b': {'A': CL(16, r'Vulnerability'), 'B': CL(3, r'Vulnerability')},
 'M22':  {'A': A_(17), 'B': A_(15), 'C': A_(13)},
 'M22a': {'A': CL(17, r'Αρχή[ς]? Εξυγίανσης|Μέτρα Έγκαιρης'), 'B': CL(15, r'Αρχή[ς]? Εξυγίανσης|Μέτρα Έγκαιρης')},
 'M22b': {'A': CL(17, r'επιχειρηματικής συνέχειας'), 'B': CL(15, r'επιχειρηματικής συνέχειας')},
 'M23':  {'A': A_(18), 'B': A_(16), 'C': A_(14)},
 'M24':  {'A': A_(19), 'B': A_(10), 'C': A_(10)},
 'M24a': {'A': CL(19, r'Άδεια Χρήσης Λογισμικού'), 'B': CL(10, r'άδεια[ς]? χρήσης')},
 'M24b': {'A': CL(19, r'θεματοφύλακα')},
 'M25':  {'A': A_(20), 'B': A_(11), 'C': A_(11)},
 'M25a': {'A': CL(20, r'3340/2005'), 'B': CL(11, r'εσωτερικ\w*\s+πληροφορ')},
 'M26':  {'A': CL(20, r'Εκτελούσα την Επεξεργασία'), 'B': A_(12)},
 'M26a': {'A': CL(20, r'Ευρωπαϊκής Οικονομικής Ζώνης'), 'B': CL(12, r'Ευρωπαϊκής Οικονομικής Ζώνης')},
 'M26b': {'B': CL(12, r'subprocessor|υπεργολάβ')},
 'M27':  {'B': PART(11, r'προτυπα ασφαλειασ και εμπιστευτικοτητασ',
                   'Μία πρόταση ισοδυναμίας προτύπων μέσα στην Εχεμύθεια. Δεν είναι αυτοτελές '
                   'άρθρο με απαρίθμηση προτύπων (ISO 27001 κ.λπ.) ούτε παραπομπή σε παράρτημα.')},
 'M28':  {'A': A_(22), 'B': A_(14)},
 'M28a': {},
 'M29':  {'A': CL(27, r'ΔΙΑΦΘΟΡΑΣ'), 'B': A_(13), 'C': A_(12)},
 'M30':  {'A': CL(27, r'ΣΥΜΨΗΦΙΣΜΟΣ'), 'B': A_(9), 'C': A_(9)},
 'M31':  {'A': A_(21), 'B': CL(17, r'κοινοποιείται'), 'C': CL(15, r'κοινοποιείται')},
 'M32':  {'A': A_(26), 'B': A_(18), 'C': A_(16)},
 'M32a': {},
 'M33':  {'A': A_(28), 'B': A_(19), 'C': A_(17)},
 'M34':  {'A': A_(29), 'B': CL(5, r'εταιρικ\w*\s+σχέσ|μισθ'), 'C': CL(5, r'εταιρικ\w*\s+σχέσ|μισθ')},
 'M35':  {'A': A_(30)},
 'M36':  {'A': A_(31), 'B': CL(11, r'σήματ'), 'C': CL(11, r'σήματ')},
 'M37':  {'A': A_(32),
          'B': PART(8, r'θα εχουν ισχυ οι προβλεψεισ ολων των ορων',
                    'Καλύπτει μόνο την πλευρά της Τράπεζας (υποκατάσταση / εκχώρηση σε τρίτο). '
                    'Δεν δεσμεύει τους διαδόχους του Αναδόχου, ούτε αποτελεί γενική ρήτρα.')},
 'M38':  {'A': A_(24), 'B': CL(17, r'ακυροτητα εν'), 'C': CL(15, r'ακυροτητα εν')},
 'M39':  {'A': A_(23)},
 'M40':  {'A': A_(28), 'B': A_(19), 'C': A_(17)},
 'M41':  {'D': CL(0, r'έχουν συνάψει')},
 'M42':  {'D': CL(0, r'amendments\.0')},
 'M43':  {'D': CL(0, r'Κατά τα λοιπά')},
 'M44':  {'A': CL(32, r'ΣΥΜΒΑΛΛΟΜΕΝΟΙ'), 'B': CL(19, r'ΣΥΜΒΑΛΛΟΜΕΝΟΙ'),
          'C': CL(17, r'ΣΥΜΒΑΛΛΟΜΕΝΟΙ'), 'D': CL(0, r'ΣΥΜΒΑΛΛΟΜΕΝΟΙ')},
}


def sample(t, n=170):
    t = re.sub(r'\{\{[^}]*\}\}', '…', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return (t[:n] + '…') if len(t) > n else t


def resolve(mid, cat, anchor):
    txt, arts = DOCS[cat]
    if anchor[0] == 'ART':
        a = arts.get(anchor[1])
        if not a:
            return None
        return {'kind': 'ΑΡΘΡΟ', 'article_no': a['no'], 'ordinal': a['ordinal'],
                'article_title': a['title'],
                'p_start': a['p0'], 'p_end': a['p1'], 'paras': a['p1'] - a['p0'] + 1,
                'sample': sample(txt[a['p0'] + 1] if a['p0'] + 1 <= a['p1'] else txt[a['p0']])}
    art_no, rx = anchor[1], anchor[2]
    note = anchor[3] if len(anchor) > 3 else None
    a = arts.get(art_no)
    pat = re.compile(fold(rx))
    spans = []
    if a:
        spans.append((a['p0'], a['p1']))
    spans.append((0, len(txt) - 1))          # fallback: whole document
    for lo, hi in spans:
        for i in range(lo, hi + 1):
            if pat.search(fold(txt[i])):
                host = next((v for v in arts.values() if v['p0'] <= i <= v['p1']), None)
                return {'kind': ('ΜΕΡΙΚΗ ΚΑΛΥΨΗ' if anchor[0] == 'PARTIAL' else 'ΟΡΟΣ'),
                        'note': note,
                        'article_no': (host['no'] if host else None),
                        'ordinal': (host['ordinal'] if host else None),
                        'article_title': (host['title'] if host else '— (εκτός αρίθμησης)'),
                        'p_start': i, 'p_end': i, 'paras': 1, 'sample': sample(txt[i])}
    return None


RULES = json.load(open("/mnt/c/Users/Anastasios.Kakavouli/OneDrive - EY/Desktop/Claude Code/"
                       "Procurement/Vendors' Contracts/LEGAL CONTRACTS/LEGAL CONTRACTS/"
                       "schema/decision_rules.json", encoding='utf-8'))

out, rows, gaps, unresolved = {}, [], [], []
for m in RULES['modules']:
    mid = m['id']
    entry = {}
    for cat in 'ABCD':
        app = m['applicability'][cat]
        if app == 'NA':
            entry[cat] = {'status': 'Δ/Υ'}
            continue
        anchor = MAP.get(mid, {}).get(cat)
        if not anchor:
            entry[cat] = {'status': 'ΛΕΙΠΕΙ'}
            gaps.append((mid, m['title'], cat))
            continue
        r = resolve(mid, cat, anchor)
        if not r:
            entry[cat] = {'status': 'ΑΝΕΠΙΛΥΤΟ'}
            unresolved.append((mid, cat, anchor))
            continue
        r['status'] = 'ΜΕΡΙΚΩΣ' if anchor[0] == 'PARTIAL' else 'ΕΝΤΟΠΙΣΤΗΚΕ'
        entry[cat] = r
    out[mid] = entry
    for cat in 'ABCD':
        e = entry[cat]
        rows.append([mid, m['title'], cat, e['status'],
                     e.get('kind', ''), e.get('article_no', ''), e.get('article_title', ''),
                     ('¶%d–%d' % (e['p_start'], e['p_end'])) if e.get('status') == 'ΕΝΤΟΠΙΣΤΗΚΕ' else '',
                     e.get('paras', ''), e.get('sample', '')])

OUT = ("/mnt/c/Users/Anastasios.Kakavouli/OneDrive - EY/Desktop/Claude Code/Procurement/"
       "Vendors' Contracts/LEGAL CONTRACTS/LEGAL CONTRACTS/schema/module_map.json")
json.dump({'$comment': 'Αντιστοίχιση modules ↔ πραγματικό κείμενο των καθαρών προτύπων. '
                       'Οι δείκτες ¶ αφορούν τα αρχεία του templates_clean/.',
           'templates': FILES, 'map': out},
          open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

os.makedirs(os.path.join(SP, 'rcsv'), exist_ok=True)
with open(os.path.join(SP, 'rcsv', '5. Αντιστοίχιση Κειμένου.csv'), 'w',
          newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['Α/Α', 'Module', 'Τίτλος κανόνα', 'Κατηγορία', 'Κατάσταση', 'Είδος',
                'Άρθρο', 'Τίτλος άρθρου στο πρότυπο', 'Παράγραφοι', 'Πλήθος ¶', 'Δείγμα κειμένου'])
    for i, r in enumerate([r for r in rows if r[3] != 'Δ/Υ'], 1):
        w.writerow([i] + r)

tot = sum(1 for r in rows if r[3] != 'Δ/Υ')
print('εγγραφές (εξαιρώντας Δ/Υ): %d' % tot)
print('ΕΝΤΟΠΙΣΤΗΚΕ: %d' % sum(1 for r in rows if r[3] == 'ΕΝΤΟΠΙΣΤΗΚΕ'))
print('ΜΕΡΙΚΩΣ:     %d' % sum(1 for r in rows if r[3] == 'ΜΕΡΙΚΩΣ'))
print('ΛΕΙΠΕΙ:      %d' % len(gaps))
print('ΑΝΕΠΙΛΥΤΟ:   %d' % len(unresolved))
if unresolved:
    print('\n— δεν εντοπίστηκαν (χρειάζονται διόρθωση anchor):')
    for mid, cat, a in unresolved:
        print('   %-6s %s  %s' % (mid, cat, a))
if gaps:
    print('\n— ΛΕΙΠΟΥΝ από τα πρότυπα (backlog σύνταξης για τη Νομική):')
    for mid, t, cat in gaps:
        print('   %-6s %-46s → %s' % (mid, t[:46], cat))

with open(os.path.join(SP, 'modmap.js'), 'w', encoding='utf-8') as f:
    f.write('const MODMAP = ' + json.dumps(out, ensure_ascii=False) + ';\n')
