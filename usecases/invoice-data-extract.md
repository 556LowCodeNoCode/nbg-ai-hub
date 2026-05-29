---
type: usecase
title: Extract data from a stack of PDF invoices into one clean CSV
audience: beginner
topics: [accounting, data, automation]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: null
deeper_link: null
ai_summary: Suppliers send invoices in every format imaginable. You re-type the fields into Excel for hours. Drop the PDFs into a folder, ask Claude for a CSV with supplier, date, amount, VAT, and invoice number — twenty minutes later you import the CSV into your accounting tool.
business_unit: accounting
time_estimate: "~25 min"
difficulty: beginner
order: 9
outcome: A `invoices.csv` file with one row per invoice — supplier name, invoice number, issue date, net amount, VAT amount, gross amount, due date — ready to import into your accounting tool.
inputs:
  - Nothing — Claude will invent 6 realistic synthetic invoices in different layouts so you can practise the extraction loop. (Once you trust it, drop real PDFs from your inbox into the same folder — the prompt is identical.)
  - Claude Code installed and a terminal open (see Day 1)
---

Re-typing invoices into a spreadsheet is the dictionary definition of work that shouldn't exist. Suppliers send PDFs with totals in seven different places, dates in three formats, and supplier names that don't quite match what's in your accounting system. The accounts-payable clerk does it because nobody else will.

This use case ends that — once you've done one batch by hand to set the format, every future batch is a one-prompt job.

> **Compliance check before you start.** Invoices contain supplier names, bank details, amounts, and sometimes payment terms — internal-confidential. Same posture as policy documents: fine in a Claude-readable folder on your workstation, not for sharing on web-based AI tools. If your suppliers include large counterparties (e.g. infrastructure providers, technology vendors), confirm with your line manager before the first batch.

---

## Step 1 — Build the workspace

**Open the Terminal app.**

<div data-os="mac">

Press ⌘+Space, type "Terminal", and press Enter.

</div>

<div data-os="windows">

Open the Start menu (press the Windows key), type "Ubuntu", and press Enter. If you don't see Ubuntu listed, [install WSL first](/start-here/day-1/#d1).

In Ubuntu, `~/Desktop` is a folder inside WSL's Linux home (`/home/<your-Linux-username>/Desktop`) — **not** the Windows desktop you see in File Explorer at `C:\Users\...\Desktop`. That's fine: the files are real and Claude can read and write them. Anywhere this use case says "open in Finder / File Explorer", run `explorer.exe .` from your Ubuntu terminal — Windows opens that exact WSL folder in Explorer.


</div>

Type each line:

```
mkdir ~/Desktop/invoices-may
cd ~/Desktop/invoices-may
mkdir invoices
claude --dangerously-skip-permissions
```

- `mkdir ~/Desktop/invoices-may` — make a folder called `invoices-may` on your Desktop.
- `cd ~/Desktop/invoices-may` — move into it.
- `mkdir invoices` — make a sub-folder where the invoice files will live.
- `claude --dangerously-skip-permissions` — start Claude Code. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

---

## Step 2 — Ask Claude to invent 6 invoices in different layouts

You don't have real supplier PDFs and you don't need them. Tell Claude:

> Create 6 synthetic invoices inside the `invoices/` subfolder, each as a separate file. The point is to simulate the real-world mess: every supplier lays their invoice out differently.
>
> Use these filenames and layouts:
>
> 1. `invoices/01-acme-cleaning.md` — a simple top-aligned layout: supplier name + address top-left, invoice number / date top-right, then a single-line item table, then totals.
> 2. `invoices/02-piraeus-stationery.html` — a more chaotic HTML layout: a logo placeholder div top-centre, then a small detail block on the right with VAT number + IBAN, then a multi-line items table.
> 3. `invoices/03-attica-electric.md` — supplier on the right, "Bill To" block on the left, invoice number embedded in a sentence ("Invoice ref: ATTI-2026-0094 dated 2026-05-08"), totals at the bottom.
> 4. `invoices/04-thessaloniki-logistics.md` — line items spread across two pages (use a `<!-- page break -->` marker), totals on page 2, VAT noted as a separate column (24%, the Greek standard rate).
> 5. `invoices/05-london-software-ltd.md` — a UK supplier billing in GBP, VAT shown at 20%, due-date phrased as "Net 30 days from invoice date".
> 6. `invoices/06-nbg-coffee-machines.md` — a tiny supplier, no formal invoice number — just "Receipt #4421" — to test that Claude flags this rather than guessing.
>
> Each invoice must contain (somewhere in its layout): supplier name and address; an invoice number (or receipt number for #6); issue date in any plausible format; one or more line items with description + qty + unit price; net total; VAT amount; gross total; due date (if applicable); currency.
>
> Use realistic Greek supplier names and addresses where appropriate. Vary the amounts — anywhere from €120 to €18,000 (or £-equivalent for the London one). Use realistic Greek VAT numbers (format: 9 digits) and IBANs (format: `GR16 ...` for Greek ones).
>
> Make the layouts *genuinely* different — don't just rename the same template six times. That's the whole point.

Claude writes all six files straight away.

You've just done two things real bookkeepers don't realise are possible: generated synthetic test data, and watched Claude vary layouts on purpose. When you do this on real PDFs next week, the prompts that follow are identical — only the file extensions change (`.pdf` instead of `.md`/`.html`).

---

## Step 3 — Pick one and let Claude show you what it sees

Different suppliers lay out invoices differently. Before you ask Claude to do all of them, have it look at one so you can confirm it's pulling the right fields.

Tell Claude:

> Pick any one file from `invoices/`. Extract these fields and show them to me as a table:
>
> - Supplier name (the company you're paying)
> - Invoice number
> - Issue date (in YYYY-MM-DD format)
> - Net amount (the amount excluding VAT)
> - VAT amount
> - Gross amount (net + VAT)
> - Due date (in YYYY-MM-DD format)
> - Currency (EUR, USD, etc.)
>
> If any field genuinely isn't on the invoice, mark it as `MISSING`. Don't guess.

Press Enter. Claude reads the PDF and shows you the parsed fields.

This is the most important step. If "supplier name" is coming out as "Ltd Trading Co" (the right-hand side of a name) instead of the full company name, fix the prompt now — for example: *"the supplier name is whatever appears next to 'Bill from:' or in the top-left letterhead, full legal name including 'Ltd' / 'A.E.' etc."*

Iterate on one invoice until the fields are right.

---

## Step 4 — Ask Claude to process all of them

Once one invoice parses correctly, tell Claude:

> Now apply the same extraction to every file in `invoices/`. Write the results to `invoices.csv` with these columns in this order:
>
> `supplier_name,invoice_number,issue_date,net_amount,vat_amount,gross_amount,due_date,currency,source_file`
>
> One row per file. The last column `source_file` is just the filename — so we can trace any row back to the original document if something looks wrong.
>
> Where a field is genuinely missing, write `MISSING` (uppercase, no quotes).
>
> Dates always YYYY-MM-DD. Amounts always with `.` as decimal separator (no thousands separator).

Press Enter. A batch of 30 invoices takes 2–5 minutes. Claude works through them and writes the CSV.

---

## Step 5 — Spot-check the CSV against the originals

Ask Claude:

> Show me the first 5 rows of `invoices.csv`.

Pick two rows. For each one:

1. Ask Claude *"show me invoices/03-attica-electric.md"* (or whichever the `source_file` is).
2. Compare the row's net amount, VAT, and gross against what the source actually says.
3. Confirm `net + VAT = gross` to the cent.

If a row is wrong, tell Claude which `source_file` mis-parsed and what the right value should be:

> Row for `04-thessaloniki-logistics.md` has VAT as 24.00 — the actual invoice shows VAT as 240.00. Re-extract this one and update the CSV row.

Pay special attention to:

- **Decimal vs thousands separators.** European invoices often use `.` for thousands and `,` for decimal (`1.250,00`). Claude may flip them — verify on any line where the amount looks oddly large or small.
- **Multi-currency invoices.** A GBP invoice in a batch of EUR ones is easy to miss if the currency column isn't filled.
- **MISSING fields.** Are they genuinely missing, or did Claude not find them? Look at one or two MISSING entries to be sure — the `06-nbg-coffee-machines.md` "receipt" should legitimately be MISSING in the `invoice_number` column.

Iterate. Once the spot-checks pass, you trust the file.

---

## Step 6 — That CSV is your handoff point

*In real life this is the moment you'd import `invoices.csv` into your accounting tool — SAP, Oracle, Xero, QuickBooks all take a CSV import; you'd map our `supplier_name` to their `Vendor` once and save the mapping for next month. We're pretending here — the CSV on your Desktop is the deliverable.*

The pattern for next month: drop fresh PDFs into the `invoices/` folder, run the same prompt — Claude reads PDFs natively too. Twenty minutes for 30 invoices instead of two hours.

The deeper win: the CSV is also a perfect starting point for spend analysis. *"Group by supplier_name, sum gross_amount, sort descending"* gives you your top vendors of the quarter — a question that used to require a separate request to finance.

### Make every future batch a one-liner with `CLAUDE.md`

The fixes you made in Step 3 ("supplier name is the full legal name, including 'Ltd' / 'A.E.'", date format YYYY-MM-DD, `.` as decimal separator, MISSING for genuinely absent fields) shouldn't be re-typed every month. Tell Claude:

> Create a `CLAUDE.md` in `~/Desktop/invoices-may/`. Put in it the field-extraction rules I established today:
>
> - Supplier name = the company being paid, full legal name including suffixes like Ltd / A.E.
> - Invoice number = whatever appears next to "Invoice #" / "Invoice No." / "Invoice ref"; for informal receipts use the receipt number; MISSING if there's no identifier at all
> - Issue date and due date in `YYYY-MM-DD`
> - Amounts always with `.` as decimal separator, no thousands separator
> - Watch European thousand/decimal swap (`1.250,00` is 1250.00, not 1.25)
> - Currency column always filled (EUR / GBP / USD), one PDF can be in a different currency than the rest
> - Genuinely missing fields → `MISSING` (uppercase, no quotes), never guess

Claude reads `CLAUDE.md` automatically when you start it in any folder. Next month:

1. New folder, drop the PDFs in
2. `cp ~/Desktop/invoices-may/CLAUDE.md .`
3. `claude --dangerously-skip-permissions` and just say: *"extract all invoices to invoices.csv"*

Claude already knows every rule. The same CSV format lands every month, which means your accounting-tool import mapping keeps working without re-touching it.
