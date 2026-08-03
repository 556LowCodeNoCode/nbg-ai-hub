#!/usr/bin/env python3
"""Build cleaned NBG contract templates.

Applies, per template:
  1. decontamination  — removes vendor names / addresses left over from prior deals
  2. numbering fixes  — duplicate article numbers, wrong internal cross-references
  3. tokenisation     — replaces ad-hoc placeholders (…, ΧΧ, [..]) with {{field.path}}
  4. conditional tags — wraps optional clauses in {{#if …}} … {{/if}}

Every change is logged to CHANGELOG.md so Legal can review it line by line.
"""
import re, sys, zipfile, os
import xml.etree.ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
XMLSPACE = '{http://www.w3.org/XML/1998/namespace}space'
ET.register_namespace('w', W[1:-1])

SRC = "/mnt/c/Users/Anastasios.Kakavouli/AppData/Local/Temp/csrc"
OUT = ("/mnt/c/Users/Anastasios.Kakavouli/OneDrive - EY/Desktop/Claude Code/Procurement/"
       "Vendors' Contracts/LEGAL CONTRACTS/LEGAL CONTRACTS/templates_clean")

# ─────────────────────────────────────────────────────────────── helpers ────

def para_map(p):
    spans, buf, pos = [], [], 0
    for t in p.iter(W + 't'):
        s = t.text or ''
        spans.append((t, pos, pos + len(s)))
        buf.append(s)
        pos += len(s)
    return ''.join(buf), spans


def replace_in_para(p, rx, rep, cap=None):
    """Replace matches of rx in p, scanning forward so output is never re-matched."""
    log = []
    start = 0
    while cap is None or len(log) < cap:
        text, spans = para_map(p)
        m = rx.search(text, start)
        if not m:
            break
        a, b = m.span()
        new = m.expand(rep)
        log.append((m.group(0), new))
        first = True
        for t, s, e in spans:
            if e <= a or s >= b:
                continue
            cur = t.text or ''
            lo, hi = max(a, s) - s, min(b, e) - s
            t.text = (cur[:lo] + new + cur[hi:]) if first else (cur[:lo] + cur[hi:])
            t.set(XMLSPACE, 'preserve')
            first = False
        start = a + len(new)          # never rescan our own output
    return log


def register_all_ns(raw):
    """Register every xmlns prefix declared on the root element.

    Word's mc:Ignorable attribute references prefixes by name; if ElementTree
    re-serialises them as ns0/ns1 the document is rejected as corrupt.
    """
    head = raw[:raw.index(b'>', raw.index(b'<w:document') if b'<w:document' in raw else 0) + 1]
    for pfx, uri in re.findall(rb'xmlns:([A-Za-z0-9_\-]+)="([^"]+)"', head):
        ET.register_namespace(pfx.decode(), uri.decode())


def build(tag, src_name, rules, out_name):
    src = os.path.join(SRC, src_name)
    dst = os.path.join(OUT, out_name)
    zin = zipfile.ZipFile(src)
    changes = []
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                register_all_ns(data)
                root = ET.fromstring(data)
                paras = list(root.iter(W + 'p'))
                for rule in rules:
                    rx = re.compile(rule['pat'])
                    targets = rule.get('p')
                    idxs = range(len(paras)) if targets is None else targets
                    hits = 0
                    cap = rule.get('expect')
                    for i in idxs:
                        if i >= len(paras):
                            continue
                        left = None if cap is None else max(0, cap - hits)
                        if left == 0:
                            break
                        for before, after in replace_in_para(paras[i], rx, rule['rep'], left):
                            changes.append((rule.get('id', '-'), i, before, after, rule.get('why', '')))
                            hits += 1
                    if rule.get('expect') is not None and hits != rule['expect']:
                        print('  ! %-8s %-6s expected %s hits, got %d'
                              % (tag, rule.get('id', '-'), rule['expect'], hits))
                out = ET.tostring(root, encoding='UTF-8', xml_declaration=False)
                # ElementTree emits only the namespaces it actually uses, but Word's
                # mc:Ignorable still names the dropped prefixes -> "file is corrupted".
                # Merge: keep every prefix ET bound, then re-add the source's own
                # declarations for prefixes ET dropped, plus mc:Ignorable.
                def open_tag(buf):
                    a = buf.index(b'<w:document')
                    return a, buf.index(b'>', a) + 1

                sa, sb = open_tag(data)
                oa, ob = open_tag(out)
                src_tag, new_tag = data[sa:sb], out[oa:ob]
                have = set(re.findall(rb'xmlns:([A-Za-z0-9_\-]+)=', new_tag))
                extra = [m.group(0) for m in re.finditer(rb'xmlns:([A-Za-z0-9_\-]+)="[^"]*"', src_tag)
                         if m.group(1) not in have]
                for m in re.finditer(rb'(?<![:A-Za-z0-9_-])([a-z]+:[A-Za-z0-9_\-]+="[^"]*")', src_tag):
                    if not m.group(1).startswith(b'xmlns:') and m.group(1) not in new_tag:
                        extra.append(m.group(1))
                merged = new_tag[:-1].rstrip() + (b' ' + b' '.join(extra) if extra else b'') + b'>'
                data = (b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
                        + merged + out[ob:])
            zout.writestr(item, data)
    zin.close()
    return changes


# ─────────────────────────────────────────── rule sets per template ────

E = r'[…\.]{2,}'           # any run of ellipsis chars / dots used as a blank
EL = r'…+'                 # ellipsis only

A_RULES = [
 # ---- 1. DECONTAMINATION ------------------------------------------------
 dict(id='A-D1', why='Αφαίρεση ονομάτων υπεργολάβων προηγούμενης συμφωνίας (Accertify / EY Business Solutions) — Άρθρο 13. Γίνεται υπό όρους (κανόνας R-04).',
      pat=r'Τα Μέρη ρητά συμφωνούν ότι μέρος των Υπηρεσιών της παρούσας θα παρασχεθούν από την κατασκευάστρια εταιρεία του Λογισμικού, την εταιρεία [^,]+, καθώς και την εταιρεία [^,]+, ως εγκεκριμένων από την Τράπεζα υπεργολάβων του Αναδόχου\.',
      rep='{{#if subcontracting.approved_subcontractors}}Τα Μέρη ρητά συμφωνούν ότι μέρος των Υπηρεσιών της παρούσας θα παρασχεθούν από {{subcontracting.approved_subcontractors}}, ως εγκεκριμένων από την Τράπεζα υπεργολάβων του Αναδόχου.{{/if}}',
      expect=1),
 dict(id='A-D2', why='Αφαίρεση ονόματος κατασκευάστριας εταιρείας προηγούμενης συμφωνίας (Accertify Inc) — Άρθρο 19 (escrow).',
      pat=r'είναι ιδιοκτησία της κατασκευάστριας εταιρείας [^\.]+\.',
      rep='είναι ιδιοκτησία της κατασκευάστριας εταιρείας {{system.software_manufacturer}}.',
      expect=1),
 dict(id='A-D3', why='Αφαίρεση διεύθυνσης προηγούμενου αναδόχου (Ζαλόγγου 4, Αγία Παρασκευή) — Άρθρο 21 Ειδοποιήσεις.',
      pat=r'κοινοποιείται στην έδρα της Εταιρείας στην οδό Ζαλόγγου αριθ\. 4, Τ\.Κ\. […\.]+, Αγία Παρασκευή Αττικής\.',
      rep='κοινοποιείται στην έδρα της Εταιρείας, {{vendor.notices_address}}.',
      expect=1),



 # ---- 3. TOKENISATION ---------------------------------------------------
 dict(id='A-T01', why='Εξώφυλλο — κεφαλίδα πίνακα.', p=[3],  pat=E, rep='{{vendor.legal_name}}', expect=1),
 dict(id='A-T02', why='Εξώφυλλο — τίτλος.',           p=[7],  pat=EL, rep='{{system.name}}', expect=1),
 dict(id='A-T03', why='Εξώφυλλο — αντισυμβαλλόμενος.', p=[12], pat=EL, rep='{{vendor.legal_name}}', expect=1),
 dict(id='A-T04', why='Εξώφυλλο — αριθμός σύμβασης.', p=[20], pat=EL, rep='{{contract.number}}', expect=1),
 dict(id='A-T05', why='Εξώφυλλο — μήνας/έτος.',       p=[30], pat=r'…+\s*2025', rep='{{contract.cover_period}}', expect=1),
 dict(id='A-T06', why='Προοίμιο — ημερομηνία υπογραφής.', p=[77],
      pat=r'[…\.]+/[…\.]+/2025', rep='{{contract.signing_date}}', expect=1),
 dict(id='A-T07', why='Προοίμιο — υπογράφοντες ΕΤΕ (κανόνας R-01).', p=[79],
      pat=r'κ\.κ\.\s*…+\.?', rep='κ.κ. {{bank.signatories}}', expect=1),
 dict(id='A-T08', why='Προοίμιο — στοιχεία αναδόχου.', p=[81],
      pat=r'επωνυμία «…+»', rep='επωνυμία «{{vendor.legal_name}}»', expect=1),
 dict(id='A-T09', why='Προοίμιο — στοιχεία αναδόχου.', p=[81],
      pat=r'διακριτικό τίτλο «…+»', rep='διακριτικό τίτλο «{{vendor.trade_name}}»', expect=1),
 dict(id='A-T10', why='Προοίμιο — έδρα.', p=[81],
      pat=r'εδρεύει στην […\.]+,', rep='εδρεύει στην {{vendor.address.city}},', expect=1),
 dict(id='A-T11', why='Προοίμιο — οδός.', p=[81],
      pat=r'επί της …+,', rep='επί της {{vendor.address.street_number}},', expect=1),
 dict(id='A-T12', why='Προοίμιο — ΑΦΜ.', p=[81],
      pat=r'ΑΦΜ: …+,', rep='ΑΦΜ: {{vendor.vat_number}},', expect=1),
 dict(id='A-T13', why='Προοίμιο — ΔΟΥ.', p=[81],
      pat=r'ΔΟΥ …+ και', rep='ΔΟΥ {{vendor.tax_office}} και', expect=1),
 dict(id='A-T14', why='Προοίμιο — ΓΕΜΗ.', p=[81],
      pat=r'ΓΕΜΗ: …+,', rep='ΓΕΜΗ: {{vendor.gemi}},', expect=1),
 dict(id='A-T15', why='Προοίμιο — εκπρόσωπος αναδόχου (κανόνας R-01).', p=[81],
      pat=r'από τον κ\. …+ \(εφεξής', rep='από τον κ. {{vendor.signatories}} (εφεξής', expect=1),
 dict(id='A-T16', why='Άρθρο 2 — αντικείμενο.', p=[103],
      pat=r'προμήθεια Συστήματος […\.]+', rep='προμήθεια Συστήματος {{system.name}} ', expect=1),
 dict(id='A-T17', why='Άρθρο 6 — ποσό εγγυητικής επιστολής.', p=[145],
      pat=r'ποσού ίσου με …+ ευρώ \(€ …+,00\)',
      rep='ποσού ίσου με {{guarantee.amount.in_words}} ευρώ (€ {{guarantee.amount}})', expect=1),
 dict(id='A-T18', why='Άρθρο 6 — ποσό εγγυητικής αντικατάστασης.', p=[145],
      pat=r'ποσού ίσου με […\.]+και διάρκειας',
      rep='ποσού ίσου με {{guarantee.replacement.amount.in_words}} ευρώ (€ {{guarantee.replacement.amount}}) και διάρκειας', expect=1),
 dict(id='A-T19', why='Άρθρο 7 — έναρξη ισχύος.', p=[151],
      pat=r'άρχεται από την …+', rep='άρχεται από την {{term.start_date}}', expect=1),
 dict(id='A-T20', why='Άρθρο 12 — πίνακας οροσήμων: περιγραφή ορόσημου 1.', p=[196],
      pat=r'Ολοκλήρωση …+', rep='{{commercials.implementation_milestones.0.description}}', expect=1),
 dict(id='A-T21', why='Άρθρο 12 — ποσό ορόσημου 1.', p=[198],
      pat=r'€…+', rep='€{{commercials.implementation_milestones.0.amount}}', expect=1),
 dict(id='A-T22', why='Άρθρο 12 — περιγραφή ορόσημου 2.', p=[200],
      pat=r'Ολοκλήρωση …+', rep='{{commercials.implementation_milestones.1.description}}', expect=1),
 dict(id='A-T23', why='Άρθρο 12 — ποσό ορόσημου 2.', p=[202],
      pat=r'€…+', rep='€{{commercials.implementation_milestones.1.amount}}', expect=1),
 dict(id='A-T24', why='Άρθρο 12 — ποσό ορόσημου 3.', p=[206],
      pat=r'€…+', rep='€{{commercials.implementation_milestones.2.amount}}', expect=1),
 dict(id='A-T25', why='Άρθρο 12 — ποσό ορόσημου 4.', p=[210],
      pat=r'€…+', rep='€{{commercials.implementation_milestones.3.amount}}', expect=1),
 dict(id='A-T26', why='Άρθρο 21 — αντίκλητος.', p=[404],
      pat=r'τον κ\. […\.]+, κάτοικο […\.]+',
      rep='τον κ. {{vendor.process_agent.name}}, κάτοικο {{vendor.process_agent.address}}', expect=1),
 dict(id='A-T27', why='Μπλοκ υπογραφών — ανάδοχος.', p=[469],
      pat=EL, rep='{{vendor.signatories.0.name_nominative}}', expect=1),
 dict(id='A-T28', why='Μπλοκ υπογραφών — ΕΤΕ.', p=[471],
      pat=EL, rep='{{bank.signatories.0.name_nominative}}', expect=1),
 dict(id='A-T29', why='Μπλοκ υπογραφών — ιδιότητα αναδόχου.', p=[473],
      pat=EL, rep='{{vendor.signatories.0.title}}', expect=1),
 dict(id='A-T30', why='Μπλοκ υπογραφών — ιδιότητα ΕΤΕ.', p=[475],
      pat=EL, rep='{{bank.signatories.0.title}}', expect=1),
 dict(id='A-T31', why='Μπλοκ υπογραφών — 2ος υπογράφων ΕΤΕ (κανόνας R-01).', p=[488],
      pat=EL, rep='{{bank.signatories.1.name_nominative}}', expect=1),
 dict(id='A-T32', why='Μπλοκ υπογραφών — ιδιότητα 2ου υπογράφοντος ΕΤΕ.', p=[492],
      pat=EL, rep='{{bank.signatories.1.title}}', expect=1),

 # ---- 4. CONDITIONAL BLOCKS ---------------------------------------------
 dict(id='A-C1', why='Κανόνας R-02: η ρήτρα SaaS/cloud εμφανίζεται μόνο για delivery_model = SAAS_VENDOR_CLOUD.', p=[103],
      pat=r'με τη μορφή υπηρεσιών \(Software-as-a-Service\) σε υποδομές cloud της Εταιρείας',
      rep='{{#if system.is_saas}}με τη μορφή υπηρεσιών (Software-as-a-Service) σε υποδομές cloud της Εταιρείας{{/if}}',
      expect=1),
]

B_RULES = [
 dict(id='B-D1', why='Αφαίρεση ονόματος προϊόντος προηγούμενης συμφωνίας (Genesys Cloud) — Άρθρο 3 ποινικές ρήτρες διαθεσιμότητας.',
      pat=r'τη διαθεσιμότητα της υπηρεσίας Genesys Cloud', rep='τη διαθεσιμότητα της Λύσης', expect=1),
 dict(id='B-D2', why='Αφαίρεση ονόματος προϊόντος προηγούμενης συμφωνίας (Pure Engage) — Άρθρο 3 μεταβατική υποστήριξη. Η ενότητα γίνεται υπό όρους (κανόνας R-07).',
      pat=r'τις υπηρεσίες υποστήριξης \(Pure Engage Maintenance & Support\) της τρέχουσας εγκατάστασης',
      rep='τις υπηρεσίες υποστήριξης ({{transition.legacy_system_name}}) της τρέχουσας εγκατάστασης', expect=1),
 dict(id='B-D3', why='Αφαίρεση ονόματος προϊόντος προηγούμενης συμφωνίας (Genesys Cloud) — τύπος ποινικής ρήτρας ευπαθειών.',
      pat=r'δηλ\. τα Annual Fees \(Subscription & Support\) for Genesys Cloud',
      rep='δηλ. τα ετήσια τέλη συνδρομής και υποστήριξης της Λύσης', expect=1),

 dict(id='B-T01', why='Εξώφυλλο — κεφαλίδα.',  p=[4],  pat=EL,  rep='{{vendor.legal_name}}', expect=1),
 dict(id='B-T02', why='Εξώφυλλο — τίτλος.',    p=[8],  pat=EL, rep='{{solution.name}}', expect=1),
 dict(id='B-T03', why='Εξώφυλλο — αντισυμβαλλόμενος.', p=[14], pat=EL, rep='{{vendor.legal_name}}', expect=1),
 dict(id='B-T04', why='Εξώφυλλο — αριθμός σύμβασης.', p=[24], pat=EL, rep='{{contract.number}}', expect=1),
 dict(id='B-T05', why='Εξώφυλλο — μήνας/έτος.', p=[27], pat=r'…+\s*202X', rep='{{contract.cover_period}}', expect=1),
 dict(id='B-T06', why='Προοίμιο — ημερομηνία υπογραφής.', p=[53],
      pat=r'[…\.]+/[…\.]+/202X', rep='{{contract.signing_date}}', expect=1),
 dict(id='B-T07', why='Προοίμιο — υπογράφοντες ΕΤΕ (κανόνας R-01).', p=[55],
      pat=r'κ\.κ\.\s*…+\(ονοματεπώνυμο\)\s*…+\(ιδιότητα\)', rep='κ.κ. {{bank.signatories}}', expect=1),
 dict(id='B-T08', why='Προοίμιο — επωνυμία αναδόχου.', p=[57],
      pat=r'επωνυμία «…+»', rep='επωνυμία «{{vendor.legal_name}}»', expect=1),
 dict(id='B-T09', why='Προοίμιο — έδρα.', p=[57],
      pat=r'εδρεύει …+,', rep='εδρεύει {{vendor.address.full}},', expect=1),
 dict(id='B-T10', why='Προοίμιο — ΑΦΜ.', p=[57], pat=r'ΑΦΜ: …+,', rep='ΑΦΜ: {{vendor.vat_number}},', expect=1),
 dict(id='B-T11', why='Προοίμιο — ΔΟΥ.', p=[57], pat=r'ΔΟΥ: …+ και', rep='ΔΟΥ: {{vendor.tax_office}} και', expect=1),
 dict(id='B-T12', why='Προοίμιο — ΓΕΜΗ.', p=[57], pat=r'ΓΕΜΗ: […\.]+,', rep='ΓΕΜΗ: {{vendor.gemi}},', expect=1),
 dict(id='B-T13', why='Προοίμιο — εκπρόσωποι αναδόχου.', p=[57],
      pat=r'κ\.κ\. …+, δυνάμει', rep='κ.κ. {{vendor.signatories}}, δυνάμει', expect=1),
 dict(id='B-T14', why='Προοίμιο — ημερομηνία πρακτικού Δ.Σ.', p=[57],
      pat=r'από …+ Πρακτικού', rep='από {{vendor.board_resolution_date}} Πρακτικού', expect=1),
 dict(id='B-T15', why='Προοίμιο — ΚΑΚ ΓΕΜΗ.', p=[57],
      pat=r'Γ\.Ε\.ΜΗ…+', rep='Γ.Ε.ΜΗ: {{vendor.gemi_registration_code}}', expect=1),
 dict(id='B-T16', why='Άρθρο 1 — ονομασία Λύσης.', p=[64],
      pat=r'της λύσης …+ \(εφεξής', rep='της λύσης {{solution.name}} (εφεξής', expect=1),
 dict(id='B-T17', why='Άρθρο 2 — έναρξη ισχύος.', p=[72],
      pat=r'ισχύει από […\.]+/[…\.]+/202Χ', rep='ισχύει από {{term.start_date}}', expect=1),
 dict(id='B-T18', why='Άρθρο 2 — έναρξη περιόδου χρήσης.', p=[72],
      pat=r'άρχεται από […\.]+/[…\.]+/202Χ', rep='άρχεται από {{term.subscription_start_date}}', expect=1),
 dict(id='B-T19', why='Άρθρο 3 — ποινική ρήτρα ανά ημέρα καθυστέρησης.', p=[88],
      pat=r'ποσό των …+ ευρώ \(…+€\)',
      rep='ποσό των {{penalties.delay_per_day.in_words}} ευρώ ({{penalties.delay_per_day}}€)', expect=1),
 dict(id='B-T20', why='Άρθρο 3 — παραπομπή σε Προσάρτημα SLA διαθεσιμότητας.', p=[90],
      pat=r'Προσάρτημα …+ του Παραρτήματος 1',
      rep='Προσάρτημα {{penalties.availability.reference_annex_section}} του Παραρτήματος 1', expect=1),
 dict(id='B-T21', why='Άρθρο 3 — παραπομπή σε Προσάρτημα SLA απόκρισης.', p=[92],
      pat=r'Προσάρτημα …+ του Παραρτήματος 1',
      rep='Προσάρτημα {{penalties.sla_reference_annex_section}} του Παραρτήματος 1', expect=1),
 dict(id='B-T22', why='Άρθρο 4 — συνολική αμοιβή.', p=[112],
      pat=r'ποσό των …+ ευρώ \(…+€\)',
      rep='ποσό των {{commercials.total_price.in_words}} ευρώ ({{commercials.total_price}}€)', expect=1),
 dict(id='B-T23', why='Άρθρο 4 — πίνακας τιμών (placeholder).', p=[113],
      pat=EL, rep='{{commercials.price_table}}', expect=1),
 dict(id='B-T24', why='Άρθρο 4 — σημειώσεις πίνακα τιμών.', p=[114],
      pat=r'…+', rep='{{commercials.price_table_notes}}', expect=1),
 dict(id='B-T25', why='Άρθρο 4 — αντικείμενο ετήσιου κόστους αδειών.', p=[117],
      pat=r'των αδειών […\.]+,', rep='των αδειών {{solution.name}},', expect=1),
 dict(id='B-T26', why='Άρθρο 4 — δόση εξοπλισμού (κανόνας R-08).', p=[119],
      pat=r'Ποσό […\.]+ ευρώ \(…+€\) το οποίο αφορά την αμοιβή της Εταιρείας για την προμήθεια του …+,',
      rep='{{#if commercials.hardware.included}}Ποσό {{commercials.hardware.amount.in_words}} ευρώ ({{commercials.hardware.amount}}€) το οποίο αφορά την αμοιβή της Εταιρείας για την προμήθεια του {{commercials.hardware.description}},', expect=1),
 dict(id='B-T27', why='Άρθρο 4 — δόση μεταβατικής υποστήριξης (κανόνας R-07).', p=[120],
      pat=r'Ποσό …+ ευρώ \(…+€\) το οποίο αφορά την αμοιβή της Εταιρείας για την υποστήριξη …+ έως και τις …+,',
      rep='{{#if transition.legacy_support}}Ποσό {{transition.amount.in_words}} ευρώ ({{transition.amount}}€) το οποίο αφορά την αμοιβή της Εταιρείας για την υποστήριξη {{transition.legacy_system_name}} έως και τις {{transition.period_to}},', expect=1),
 dict(id='B-T28', why='Άρθρο 4 — αμοιβή Υπηρεσιών Υλοποίησης.', p=[121],
      pat=r'Ποσό …+ ευρώ \(…+€\)',
      rep='Ποσό {{commercials.professional_services.in_words}} ευρώ ({{commercials.professional_services}}€)', expect=1),
 dict(id='B-T29', why='Άρθρο 4 — δόση 1 (Scope of Work).', p=[122],
      pat=r'ποσό …+ ευρώ \(…+€\)',
      rep='ποσό {{commercials.tranches.0.amount.in_words}} ευρώ ({{commercials.tranches.0.amount}}€)', expect=1),
 dict(id='B-T30', why='Άρθρο 4 — δόση 2 (UAT).', p=[123],
      pat=r'ποσό …+ ευρώ \(…+€\)',
      rep='ποσό {{commercials.tranches.1.amount.in_words}} ευρώ ({{commercials.tranches.1.amount}}€)', expect=1),
 dict(id='B-T31', why='Άρθρο 4 — δόση 3 (Go Live).', p=[124],
      pat=r'ποσό …+ ευρώ \(…+€\)',
      rep='ποσό {{commercials.tranches.2.amount.in_words}} ευρώ ({{commercials.tranches.2.amount}}€)', expect=1),
 dict(id='B-T32', why='Εγγυητική Επιστολή — ποσό.', p=[183],
      pat=r'ποσού ίσο με …+ ευρώ \(…+€\)',
      rep='ποσού ίσο με {{guarantee.amount.in_words}} ευρώ ({{guarantee.amount}}€)', expect=1),
 dict(id='B-T33', why='Υπεργολάβοι — επωνυμία.', p=[195],
      pat=r'επωνυμία …+', rep='επωνυμία {{subcontracting.approved_subcontractors.0.legal_name}}', expect=1),
 dict(id='B-T34', why='Υπεργολάβοι — επωνυμία.', p=[196],
      pat=r'επωνυμία …+', rep='επωνυμία {{subcontracting.approved_subcontractors.1.legal_name}}', expect=1),
 dict(id='B-T35', why='Υπεργολάβοι — επωνυμία (GDPR ενότητα).', p=[278],
      pat=r'επωνυμία […\.]+', rep='επωνυμία {{data_protection.subprocessors.0.legal_name}}', expect=1),
 dict(id='B-T36', why='Ειδοποιήσεις — έδρα αναδόχου.', p=[373],
      pat=r'στην έδρα της Εταιρείας […\.]+', rep='στην έδρα της Εταιρείας, {{vendor.notices_address}}', expect=1),
 dict(id='B-T37', why='Ειδοποιήσεις — διεύθυνση ΕΤΕ.', p=[374],
      pat=r'κοινοποιείται στη […\.]+', rep='κοινοποιείται στη {{bank.notices_address}}', expect=1),
 dict(id='B-T38', why='Ειδοποιήσεις — αντίκλητος.', p=[376],
      pat=r'αντίκλητό της τον […\.]+', rep='αντίκλητό της τον {{vendor.process_agent.name}}, κάτοικο {{vendor.process_agent.address}}', expect=1),
 dict(id='B-T39', why='Μπλοκ υπογραφών.', p=[406], pat=EL, rep='{{vendor.signatories.0.name_nominative}}', expect=1),
 dict(id='B-T40', why='Μπλοκ υπογραφών.', p=[408], pat=EL, rep='{{bank.signatories.0.name_nominative}}', expect=1),
 dict(id='B-T41', why='Μπλοκ υπογραφών.', p=[412], pat=EL, rep='{{vendor.signatories.0.title}}', expect=1),
 dict(id='B-T42', why='Μπλοκ υπογραφών.', p=[428], pat=EL, rep='{{bank.signatories.0.title}}', expect=1),
 dict(id='B-T43', why='Μπλοκ υπογραφών.', p=[430], pat=EL, rep='{{bank.signatories.1.name_nominative}}', expect=1),
 dict(id='B-T44', why='Μπλοκ υπογραφών.', p=[434], pat=EL, rep='{{bank.signatories.1.title}}', expect=1),
]

C_RULES = [
 dict(id='C-D1', why='ΜΟΛΥΝΣΗ: το ολογράφως ποσό «εκατό χιλιάδων ευρώ» προέρχεται από τη σύμβαση DESQUARED και είχε μείνει στο πρότυπο.',
      pat=r'Το ως άνω ποσό των εκατό χιλιάδων ευρώ \(€[…\.]+000,00\) €',
      rep='Το ως άνω ποσό των {{commercials.total_price.in_words}} ευρώ (€{{commercials.total_price}})', expect=1),

 dict(id='C-D2', why='ΜΟΛΥΝΣΗ: διεύθυνση προηγούμενου αναδόχου («Αθήνα, Λ. Μεσογείων 2-4») στο άρθρο Ειδοποιήσεων. Παραμετροποιείται μαζί με τη διεύθυνση της Τράπεζας, όπως ήδη έγινε στο πρότυπο B.',
      p=[231],
      pat=r'κοινοποιείται στην έδρα της Εταιρείας:.*?Τ\.Κ\. 153-44\.',
      rep='κοινοποιείται στην έδρα της Εταιρείας, {{vendor.notices_address}}. Κάθε έγγραφο της Εταιρείας προς την Τράπεζα κοινοποιείται στη {{bank.notices_address}}.',
      expect=1),

 dict(id='C-T01', why='Εξώφυλλο — κεφαλίδα.', p=[2], pat=E, rep='{{vendor.legal_name}}', expect=1),
 dict(id='C-T02', why='Εξώφυλλο — κεφαλίδα.', p=[4], pat=E, rep='{{vendor.legal_name}}', expect=1),
 dict(id='C-T03', why='Εξώφυλλο — τίτλος Έργου.', p=[7], pat=r'«[…\.]+»', rep='«{{project.name}}»', expect=1),
 dict(id='C-T04', why='Εξώφυλλο — αντισυμβαλλόμενος.', p=[13], pat=E, rep='{{vendor.legal_name}}', expect=1),
 dict(id='C-T05', why='Εξώφυλλο — αριθμός σύμβασης.', p=[20], pat=E, rep='{{contract.number}}', expect=1),
 dict(id='C-T06', why='Εξώφυλλο — μήνας/έτος.', p=[24], pat=r'…+\s*2025', rep='{{contract.cover_period}}', expect=1),
 dict(id='C-T07', why='Πίνακας Περιεχομένων — γέμισμα με τελείες (καθαρισμός).', p=[44],
      pat=r'…{5,}', rep='', expect=1),
 dict(id='C-T08', why='Προοίμιο — ημερομηνία υπογραφής.', p=[51],
      pat=r'[…\.]+/[…\.]+/2025', rep='{{contract.signing_date}}', expect=1),
 dict(id='C-T09', why='Προοίμιο — υπογράφοντες ΕΤΕ (κανόνας R-01).', p=[52],
      pat=r'κ\.κ\.\s*[…\.]+, […\.]+ και […\.]+, […\.]+,', rep='κ.κ. {{bank.signatories}},', expect=1),
 dict(id='C-T10', why='Προοίμιο — επωνυμία αναδόχου.', p=[54],
      pat=r'επωνυμία «[…\.]+»', rep='επωνυμία «{{vendor.legal_name}}»', expect=1),
 dict(id='C-T11', why='Προοίμιο — έδρα.', p=[54],
      pat=r'έδρα της στ\.\. […\.]+, οδ\. […\.]+\s*αρ\. […\.]+,',
      rep='έδρα της στ {{vendor.address.city}}, οδ. {{vendor.address.street}} αρ. {{vendor.address.number}},', expect=1),
 dict(id='C-T12', why='Προοίμιο — ΑΦΜ.', p=[54], pat=r'ΑΦΜ […\.]+ και', rep='ΑΦΜ {{vendor.vat_number}} και', expect=1),
 dict(id='C-T13', why='Προοίμιο — ΓΕΜΗ.', p=[54], pat=r'Γ\.Ε\.Μ\.Η\.: […\.]+,', rep='Γ.Ε.Μ.Η.: {{vendor.gemi}},', expect=1),
 dict(id='C-T14', why='Προοίμιο — εκπρόσωπος αναδόχου.', p=[54],
      pat=r'από τον κ\. […\.]+, […\.]+, δυνάμει', rep='από τον κ. {{vendor.signatories}}, δυνάμει', expect=1),
 dict(id='C-T15', why='Προοίμιο — ημερομηνία πρακτικού Δ.Σ.', p=[54],
      pat=r'από\s+[…\.]+/[…\.]+/[…\.]+ πρακτικού', rep='από {{vendor.board_resolution_date}} πρακτικού', expect=1),
 dict(id='C-T16', why='Προοίμιο — ΚΑΚ ΓΕΜΗ.', p=[54],
      pat=r'Γ\.Ε\.ΜΗ\.:[…\.]+', rep='Γ.Ε.ΜΗ.: {{vendor.gemi_registration_code}}', expect=1),
 dict(id='C-T17', why='Άρθρο 1 — ονομασία Έργου.', p=[59],
      pat=r'έργου «[…\.]+»', rep='έργου «{{project.name}}»', expect=1),
 dict(id='C-T18', why='Άρθρο 2 — έναρξη διάρκειας.', p=[65],
      pat=r'από […\.]+/[…\.]+/202\.\.', rep='από {{term.start_date}}', expect=1),
 dict(id='C-T19', why='Άρθρο 4 — συνολική αμοιβή.', p=[75],
      pat=r'ποσό των […\.]+ ευρώ \(€[…\.]+,00\) €',
      rep='ποσό των {{commercials.total_price.in_words}} ευρώ (€{{commercials.total_price}})', expect=1),
 dict(id='C-T20', why='Άρθρο 4 — πίνακας οροσήμων: περιγραφή 1.', p=[85],
      pat=E, rep='{{commercials.milestones.0.description}}', expect=1),
 dict(id='C-T21', why='Άρθρο 4 — ποσοστό ορόσημου 1.', p=[86],
      pat=r'…+%', rep='{{commercials.milestones.0.percentage}}%', expect=1),
 dict(id='C-T22', why='Άρθρο 4 — ποσό ορόσημου 1.', p=[87],
      pat=r'€…+\.?', rep='€{{commercials.milestones.0.amount}}', expect=1),
 dict(id='C-T23', why='Άρθρο 4 — περιγραφή ορόσημου 2.', p=[89],
      pat=E, rep='{{commercials.milestones.1.description}}', expect=1),
 dict(id='C-T24', why='Άρθρο 4 — ποσοστό ορόσημου 2.', p=[90],
      pat=r'…+\.?%', rep='{{commercials.milestones.1.percentage}}%', expect=1),
 dict(id='C-T25', why='Άρθρο 4 — ποσό ορόσημου 2.', p=[91],
      pat=r'€…+\.*', rep='€{{commercials.milestones.1.amount}}', expect=1),
 dict(id='C-T26', why='Εγγυητική Επιστολή — ποσό και διάρκεια (κανόνας R-06).', p=[138],
      pat=r'ποσού […\. ]+ ευρώ \([…\.]+,00€\), με διάρκεια έως τις […\./]+',
      rep='ποσού {{guarantee.amount.in_words}} ευρώ ({{guarantee.amount}}€), με διάρκεια έως τις {{guarantee.validity_end}}', expect=1),
 dict(id='C-T27', why='Ειδοποιήσεις — αντίκλητος.', p=[233],
      pat=r'τον κ\. […\. ]+, κάτοικο […\.]+, οδ\. […\.]+ αρ\. […\.]+',
      rep='τον κ. {{vendor.process_agent.name}}, κάτοικο {{vendor.process_agent.address}}', expect=1),
 dict(id='C-T28', why='Μπλοκ υπογραφών.', p=[265], pat=r'…+\.*', rep='{{vendor.signatories.0.name_nominative}}', expect=1),
 dict(id='C-T29', why='Μπλοκ υπογραφών.', p=[267], pat=r'…+\.*', rep='{{bank.signatories.0.name_nominative}}', expect=1),
 dict(id='C-T30', why='Μπλοκ υπογραφών.', p=[271], pat=E, rep='{{vendor.signatories.0.title}}', expect=1),
 dict(id='C-T31', why='Μπλοκ υπογραφών.', p=[276], pat=r'…+\.*', rep='{{bank.signatories.0.title}}', expect=1),
 dict(id='C-T32', why='Μπλοκ υπογραφών — 2ος υπογράφων ΕΤΕ (κανόνας R-01).', p=[301], pat=r'…+\.*', rep='{{bank.signatories.1.name_nominative}}', expect=1),
 dict(id='C-T33', why='Μπλοκ υπογραφών — ιδιότητα 2ου υπογράφοντος ΕΤΕ.', p=[307], pat=r'…+\.*', rep='{{bank.signatories.1.title}}', expect=1),
]

D_RULES = [
 dict(id='D-D1', why='ΜΟΛΥΝΣΗ: το πρότυπο κατονομάζει συγκεκριμένο στέλεχος της ΕΤΕ. Παραμετροποιείται ώστε να προέρχεται από τον πίνακα εξουσιοδοτήσεων (κανόνας R-01 / ερώτημα Q-10).',
      pat=r'από τους κ\.κ\. Ευάγγελο Χρήστου, Βοηθό Γενικό Διευθυντή Προμηθειών & Demand Management της Τράπεζας και του Ομίλου και …+ ,',
      rep='από τους κ.κ. {{bank.signatories}},', expect=1),
 dict(id='D-D2', why='ΜΟΛΥΝΣΗ: όνομα/ιδιότητα στελέχους ΕΤΕ στο μπλοκ υπογραφών.',
      pat=r'Ευάγγελος Χρήστου', rep='{{bank.signatories.0.name_nominative}}', expect=1),
 dict(id='D-D3', why='ΜΟΛΥΝΣΗ: ιδιότητα στελέχους ΕΤΕ στο μπλοκ υπογραφών.',
      pat=r'Βοηθός Γενικός Διευθυντής Προμηθειών & Demand Management της Τράπεζας και του Ομίλου',
      rep='{{bank.signatories.0.title}}', expect=1),

 dict(id='D-T01', why='Εξώφυλλο — κεφαλίδα.', p=[5],
      pat=r'\[ΕΠΩΝΥΜΙΑ ΕΤΑΙΡΕΙΑΣ\]', rep='{{vendor.legal_name}}', expect=1),
 dict(id='D-T02', why='Εξώφυλλο — τίτλος πρόσθετης πράξης.', p=[7],
      pat=r'…+ – …+', rep='{{addendum.title_object}}', expect=1),
 dict(id='D-T03', why='Εξώφυλλο — υπότιτλος.', p=[8], pat=r'\(…+\)', rep='({{addendum.subtitle}})', expect=1),
 dict(id='D-T04', why='Εξώφυλλο — αντισυμβαλλόμενος.', p=[13],
      pat=r'\[ΕΠΩΝΥΜΙΑ ΕΤΑΙΡΕΙΑΣ\]', rep='{{vendor.legal_name}}', expect=1),
 dict(id='D-T05', why='Εξώφυλλο — αριθμός πρόσθετης πράξης.', p=[21],
      pat=r'Νο\. …+', rep='Νο. {{addendum.number}}', expect=1),
 dict(id='D-T06', why='Εξώφυλλο — αριθμός αρχικής σύμβασης.', p=[22],
      pat=r'ΑΡΧΙΚΗ ΣΥΜΒΑΣΗ …+', rep='ΑΡΧΙΚΗ ΣΥΜΒΑΣΗ {{original_contract.number}}', expect=1),
 dict(id='D-T07', why='Εξώφυλλο — μήνας/έτος.', p=[27],
      pat=r'\[Μήνας, Έτος\]', rep='{{addendum.cover_period}}', expect=1),
 dict(id='D-T08', why='Τίτλος — ημερομηνία αρχικής σύμβασης.', p=[28],
      pat=r'ΑΠΟ […\.]+/[…\.]+/[…\.]+ ΣΥΜΒΑΣΗ', rep='ΑΠΟ {{original_contract.date}} ΣΥΜΒΑΣΗ', expect=1),
 dict(id='D-T09', why='Προοίμιο — ημερομηνία υπογραφής.', p=[30],
      pat=r'σήμερα την […\.]+/[…\.]+/[…\.]+', rep='σήμερα την {{addendum.signing_date}}', expect=1),
 dict(id='D-T10', why='Προοίμιο — επωνυμία αναδόχου.', p=[32],
      pat=r'επωνυμία «…+»', rep='επωνυμία «{{vendor.legal_name}}»', expect=1),
 dict(id='D-T11', why='Προοίμιο — διακριτικός τίτλος.', p=[32],
      pat=r'διακριτικό τίτλο «[…\.]+»', rep='διακριτικό τίτλο «{{vendor.trade_name}}»', expect=1),
 dict(id='D-T12', why='Προοίμιο — έδρα.', p=[32],
      pat=r'εδρεύει …+, οδός …+,', rep='εδρεύει {{vendor.address.city}}, οδός {{vendor.address.street_number}},', expect=1),
 dict(id='D-T13', why='Προοίμιο — ΑΦΜ.', p=[32], pat=r'ΑΦΜ: …+,', rep='ΑΦΜ: {{vendor.vat_number}},', expect=1),
 dict(id='D-T14', why='Προοίμιο — ΓΕΜΗ.', p=[32], pat=r'Γ\.Ε\.ΜΗ: …+,', rep='Γ.Ε.ΜΗ: {{vendor.gemi}},', expect=1),
 dict(id='D-T15', why='Προοίμιο — εκπρόσωποι αναδόχου.', p=[32],
      pat=r'κ\.κ\. …+ και …+, δυνάμει', rep='κ.κ. {{vendor.signatories}}, δυνάμει', expect=1),
 dict(id='D-T16', why='Προοίμιο — ημερομηνία πρακτικού Δ.Σ.', p=[32],
      pat=r'από […\.]+/[…\.]+/[…\.]+ Πρακτικού', rep='από {{vendor.board_resolution_date}} Πρακτικού', expect=1),
 dict(id='D-T17', why='Προοίμιο — ΚΑΚ ΓΕΜΗ.', p=[32],
      pat=r'Γ\.Ε\.ΜΗ: …+,', rep='Γ.Ε.ΜΗ: {{vendor.gemi_registration_code}},', expect=1),
 dict(id='D-T18', why='Αναφορά αρχικής σύμβασης — ημερομηνία.', p=[35],
      pat=r'από […\.]+/[…\.]+/[…\.]+ σύμβαση', rep='από {{original_contract.date}} σύμβαση', expect=1),
 dict(id='D-T19', why='Αναφορά αρχικής σύμβασης — αντικείμενο.', p=[35],
      pat=r'συντήρησης-υποστήριξης …+,', rep='συντήρησης-υποστήριξης {{original_contract.subject}},', expect=1),
 dict(id='D-T20', why='Περίοδος ανανέωσης.', p=[37],
      pat=r'από […\.]+/[…\.]+/[…\.]+ έως […\.]+/[…\.]+/[…\.]+',
      rep='από {{renewal.period_from}} έως {{renewal.period_to}}', expect=1),
 dict(id='D-T21', why='Πράξη 1 — άρθρο-στόχος.', p=[39],
      pat=r'Άρθρου …+ \(…+\)', rep='Άρθρου {{amendments.0.target.article_no}} ({{amendments.0.target.article_title}})', expect=1),
 dict(id='D-T22', why='Πράξη 1 — νέο κείμενο (διάρκεια).', p=[40],
      pat=r'για …+ \(…+\) έτη, ήτοι για το χρονικό διάστημα από […\.]+/[…\.]+/[…\.]+ έως […\.]+/[…\.]+/[…\.]+',
      rep='για {{renewal.extension_years.in_words}} ({{renewal.extension_years}}) έτη, ήτοι για το χρονικό διάστημα {{#if renewal.is_retroactive}}αναδρομικά {{/if}}από {{renewal.period_from}} έως {{renewal.period_to}}', expect=1),
 dict(id='D-T23', why='Πράξη 2 — νέο εδάφιο / όρος / άρθρο-στόχος.', p=[42],
      pat=r'υπ\. αριθμ\. …+ στον όρο …+ του Άρθρου …+ \(…+\)',
      rep='υπ. αριθμ. {{amendments.1.new_clause_no}} στον όρο {{amendments.1.target.clause_no}} του Άρθρου {{amendments.1.target.article_no}} ({{amendments.1.target.article_title}})', expect=1),
 dict(id='D-T24', why='Πράξη 2 — περίοδος και ποσό αμοιβής.', p=[43],
      pat=r'από […\.]+/[…\.]+/[…\.]+ έως […\.]+/[…\.]+/[…\.]+, ανέρχεται στο συνολικό ποσό των …+ \(€…+,…+\)',
      rep='από {{renewal.period_from}} έως {{renewal.period_to}}, ανέρχεται στο συνολικό ποσό των {{amendments.1.price_table.total.in_words}} (€{{amendments.1.price_table.total}})', expect=1),
 dict(id='D-T25', why='Πράξη 3 — όρος και άρθρο-στόχος.', p=[55],
      pat=r'του όρου …+ στο Άρθρο …+ \(…+\)',
      rep='του όρου {{amendments.2.target.clause_no}} στο Άρθρο {{amendments.2.target.article_no}} ({{amendments.2.target.article_title}})', expect=1),
 dict(id='D-T26', why='Πράξη 3 — νέο κείμενο.', p=[56],
      pat=r'«…+ ….»', rep='«{{amendments.2.new_text}}»', expect=1),
 dict(id='D-T27', why='Μπλοκ υπογραφών — ανάδοχος.', p=[79], pat=r'…+\.*', rep='{{vendor.signatories.0.name_nominative}}', expect=1),
 dict(id='D-T28', why='Μπλοκ υπογραφών — ιδιότητα αναδόχου.', p=[83], pat=r'…+\.*', rep='{{vendor.signatories.0.title}}', expect=1),
 dict(id='D-T29', why='Μπλοκ υπογραφών — 2ος υπογράφων αναδόχου (κανόνας R-01).', p=[100], pat=r'…+\.*', rep='{{vendor.signatories.1.name_nominative}}', expect=1),
 dict(id='D-T30', why='Μπλοκ υπογραφών — 2ος υπογράφων ΕΤΕ (κανόνας R-01).', p=[102], pat=r'…+\.*', rep='{{bank.signatories.1.name_nominative}}', expect=1),
 dict(id='D-T31', why='Μπλοκ υπογραφών — ιδιότητα 2ου υπογράφοντος αναδόχου.', p=[104], pat=r'…+\.*', rep='{{vendor.signatories.1.title}}', expect=1),
 dict(id='D-T32', why='Μπλοκ υπογραφών — ιδιότητα 2ου υπογράφοντος ΕΤΕ.', p=[106], pat=r'…+\.*', rep='{{bank.signatories.1.title}}', expect=1),
]

TEMPLATES = [
 ('A', 'A_platform.docx',   A_RULES, 'A_IT_PLATFORM_TEMPLATE_v2.docx'),
 ('B', 'B_solution.docx',   B_RULES, 'B_IT_SOLUTION_TEMPLATE_v2.docx'),
 ('C', 'C_consulting.docx', C_RULES, 'C_IT_CONSULTING_TEMPLATE_v2.docx'),
 ('D', 'D_addendum.docx',   D_RULES, 'D_ADDENDUM_TEMPLATE_v2.docx'),
]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    all_changes = {}
    for tag, src, rules, out in TEMPLATES:
        ch = build(tag, src, rules, out)
        all_changes[tag] = ch
        print('%s → %-38s %d αλλαγές' % (tag, out, len(ch)))
    import json
    with open('/tmp/claude-1000/-mnt-c-WINDOWS-system32/75c6e24c-5e20-476b-a99d-b67358c7ac16/scratchpad/changes.json', 'w') as f:
        json.dump(all_changes, f, ensure_ascii=False, indent=1)
