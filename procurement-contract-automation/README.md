# NBG Procurement Contract Automation

Tool for generating draft supplier contracts from approved templates and
structured procurement data, flagging fields that need human input.

## Layout

```
documents/
  analysis/            analysis, deliverables index, interactive rule explorer
  source-contracts/    the four templates + four signed instances (markdown)
    _original/         the same documents as originally received (.doc/.docx/.pdf)
  decisions/           decision records
data-model/
  DATA_MODEL.xlsx      148 fields across 5 sheets — core + one per contract type
  DECISION_RULES.xlsx  20 decision variables, 64 modules, decision matrix,
                       20 guardrails, module-to-text mapping
  schema/              JSON Schema 2020-12 + machine-readable ruleset
  csv/                 flat export of every sheet
templates/             parameterised contract masters + CHANGELOG
src/                   generators — every artefact above is built from these
tests/                 fixtures use dummy values only
```

## Contract types

| | Type | Template | Articles |
|---|---|---|---|
| **A** | Σύμβαση Προμήθειας Συστήματος | `A_IT_PLATFORM_TEMPLATE_v2.docx` | 32 |
| **B** | Σύμβαση Προμήθειας Πλατφόρμας | `B_IT_SOLUTION_TEMPLATE_v2.docx` | 19 |
| **C** | Σύμβαση Παροχής Υπηρεσιών | `C_IT_CONSULTING_TEMPLATE_v2.docx` | 17 |
| **D** | Πρόσθετη Πράξη | `D_ADDENDUM_TEMPLATE_v2.docx` | — (differential) |

Which type applies is derived, not chosen: amendment → D; software licences
*and* formal provisional/final acceptance → A; recurring service → B; otherwise C.

## Two rules that govern the templates

**Article numbering is never changed.** The templates reproduce the originals
exactly, including template A's duplicate "Άρθρο 23". Anything that looks wrong
is recorded under *Επισημάνσεις* in `templates/CHANGELOG.md` for Legal to decide
— it is not silently corrected. `data-model/schema/module_map.json` keys articles
by position and reports the printed number, so a duplicate can never be lost.

**Nothing is generated that cannot be traced.** Each of the 152 edits applied to
the templates is logged in the CHANGELOG with its before/after text and the
reason. Each of the 64 rule modules is resolved to a real paragraph range in
`module_map.json`; the 20 that resolve to nothing are reported as drafting gaps
rather than assumed to exist.

## Regenerating

Everything in `data-model/` and `templates/` is produced by `src/`. The scripts
carry absolute paths from the machine they were authored on — parameterise them
before running elsewhere.

```
src/build_templates.py     source .docx  → cleaned, tokenised templates + change log
src/build_ruleset.py       rule tables   → DECISION_RULES.xlsx + decision_rules.json
src/build_module_map.py    templates     → module_map.json (rule ↔ paragraph)
src/build_data_model.py    field tables  → DATA_MODEL.xlsx
src/docx_legacy_reader.py  pure-python reader for Word 97-2003 .doc
```

## Status

Analysis complete. Blocking before build: the annexes (none received), the price
table format, and 3–5 signed contracts per type instead of one — see
*§6 Ερωτήματα* in `documents/analysis/analysis-data-model-and-rules.md`.
