---
type: usecase
title: Turn a business question into a SQL query you can actually run
audience: beginner
topics: [data, sql, reporting]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-06-11"
external_link: null
deeper_link: null
ai_summary: A manager asks "how many cards did we issue to under-25s last quarter, split by branch?" You don't write SQL. You describe the tables to Claude in plain English, ask for the query, run it against the data warehouse. Twenty minutes from question to chart.
business_unit: data
time_estimate: "~20 min"
difficulty: beginner
order: 8
outcome: A `query.sql` file you can paste straight into your data warehouse client (DBeaver, SSMS, Snowflake UI, whatever your team uses) and run.
inputs:
  - A list of the tables and columns relevant to your question (a screenshot or text dump of the schema is fine — Claude reads both)
  - Claude Code installed and a terminal open (see Day 1)
---

Most business questions die in the gap between "the data should know this" and "I don't write SQL". The team's data analyst is in another meeting, the manager wants the answer by lunch, and the question is reasonable enough that someone should be able to answer it in twenty minutes.

This use case is that twenty minutes — and the query you save at the end is reusable, so the same question next quarter takes thirty seconds.

> **Compliance check before you start.** Schemas describing tables are usually internal but not sensitive — table names and column names alone are fine. Actual data extracts are different: if you paste rows into Claude that contain customer IBANs, names, or balances, that's customer-confidential information and goes through line-manager review. The point of this use case is generating the *query* — you'll run it against the warehouse yourself, on the warehouse, where the data lives. Claude never sees the rows.

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
mkdir -p ~/Desktop/claude-lab/sql-cards-under25
cd ~/Desktop/claude-lab/sql-cards-under25
claude --dangerously-skip-permissions
```

- `mkdir -p ~/Desktop/claude-lab/sql-cards-under25` — make a folder named after the question, inside `claude-lab` on your Desktop (`-p` creates `claude-lab` too if it's not there yet — it's the one home for all hub use cases).
- `cd ~/Desktop/claude-lab/sql-cards-under25` — move into it.
- `claude --dangerously-skip-permissions` — start Claude Code. The flag stops Claude prompting you for permission on every file write — safe in a fresh, dedicated folder like this one. (If you'd rather see every prompt for your first run, just type `claude` — same thing, more interruptions.)

The cursor is now Claude's.

---

## Step 2 — Let Claude create the schema file

Claude needs to know what tables and columns exist. You don't need to write neat SQL DDL — describe the tables the way you'd describe them to a colleague.

Tell Claude:

> Create a file called `schema.md` in this folder. Put the following table descriptions in it, exactly as I write them:
>
> ```
> Table: cards
> Purpose: one row per card issued. ~12M rows.
> Columns:
>   card_id (primary key)
>   customer_id (foreign key to customers.customer_id)
>   issue_date (date the card was issued)
>   branch_id (foreign key to branches.branch_id)
>   card_type (text: "debit" | "credit" | "prepaid")
>
> Table: customers
> Purpose: one row per customer. ~3M rows.
> Columns:
>   customer_id (primary key)
>   date_of_birth (date)
>   greek_resident (boolean)
>
> Table: branches
> Purpose: one row per branch.
> Columns:
>   branch_id (primary key)
>   branch_name (text)
>   region (text: "Attica" | "Macedonia" | …)
> ```

Claude writes the file straight away.

The first time you do this it takes ten minutes because you're typing the schema out. Worth it — once `schema.md` exists, every future question against the same tables reuses it. Update it once when the warehouse changes.

---

## Step 3 — Ask Claude to write the query

Send this to Claude:

> Read `schema.md`.
>
> The question: "How many cards did we issue to customers under 25, last quarter (Q1 2026 = Jan/Feb/Mar 2026), split by branch?"
>
> Produce a SQL query and write it to `query.sql`. Constraints:
>
> - **Dialect:** Standard SQL that runs on PostgreSQL. (Swap to Snowflake / SQL Server / Oracle if your warehouse is different — tell Claude which one.)
> - Use clear table aliases (`c` for cards, `cu` for customers, `b` for branches).
> - Compute "under 25 at issue date" — i.e. their age when the card was issued, not their age today.
> - Include the branch *name* in the output, not just the ID.
> - Order results by card count descending so the highest-volume branches are at the top.
> - Add a one-line comment above each major clause explaining what it does — so a non-SQL reader can follow it.

Press Enter. Claude writes the query in 30–60 seconds.

---

## Step 4 — Read the query out loud before you run it

Ask Claude:

> Show me `query.sql`.

Don't just copy-paste it. Read it line by line. Three things to check:

1. **The date filter** — is the quarter calculated the way you'd calculate it? `2026-01-01 <= issue_date < 2026-04-01` is unambiguous; `BETWEEN '2026-01-01' AND '2026-03-31'` is *also* fine but easy to misread. If you'd write it differently, tell Claude.
2. **The age calculation** — *"under 25 at issue date"* is `AGE(issue_date, date_of_birth) < INTERVAL '25 years'` in Postgres. Did Claude get that right, or did it compute *current* age instead? This is a common LLM mistake.
3. **The join** — does the query join `cards` to `customers` to `branches` correctly? Or did it accidentally inner-join in a way that drops branches with zero card issuance?

If you spot something off:

> The age calculation looks like current age. Rewrite to use the customer's age *at the issue_date*, not today.

Iterate until you'd stake your reputation on it.

---

## Step 5 — Run it against the warehouse and save the query

Open your warehouse client (DBeaver, SSMS, Snowflake UI, etc.). Paste the SQL from `query.sql`. Run it.

Sanity-check the result:

- Does the total card count look plausible compared to total quarterly issuance? If you got 12 cards back when you know the bank issued 80,000 last quarter, the filter is wrong.
- Do the top branches make sense (the high-traffic urban branches)?

If something looks off, paste the actual result back to Claude:

> The query returned 12 rows total. Total card issuance last quarter was around 80k. Something's filtering too aggressively — investigate `query.sql` and tell me what's likely wrong.

Claude reasons over the SQL, suggests the fix, edits `query.sql`. You run it again.

Once the result is solid, the folder `~/Desktop/claude-lab/sql-cards-under25/` is now your reusable template: schema + query + a comment explaining the question. Next quarter you copy the folder, change the dates in one line, rerun. Three minutes.

The deeper win: you've now done one full data-analyst's loop without being a data analyst. The next question against the same schema takes half the time.

### Make every future SQL question faster with `CLAUDE.md`

The schema doesn't change. The same `cards`, `customers`, `branches` tables exist next week, next quarter, next year. Don't keep retyping that to Claude. Rename:

```
mv schema.md CLAUDE.md
```

`CLAUDE.md` is the magic filename Claude Code reads automatically every time you start `claude` in a folder containing it. Even better: make a dedicated folder for *all* your warehouse questions:

```
mkdir -p ~/Desktop/claude-lab/warehouse-queries
mv ~/Desktop/claude-lab/sql-cards-under25/CLAUDE.md ~/Desktop/claude-lab/warehouse-queries/
cd ~/Desktop/claude-lab/warehouse-queries
claude --dangerously-skip-permissions
```

Now every business question lives in the same folder. Claude already knows the schema. Your next question is just *"how many credit cards were issued to customers over 65 in 2025, by region?"* and Claude writes the SQL. After a month you'll have a personal library of warehouse queries — and your data team will start asking *you* questions.

---

## Step 6 — Level up — prove the query on a miniature database

Reading the query line by line (Step 4) catches the obvious. The subtle bugs — the customer who turns exactly 25 on issue day, the card issued at the quarter boundary — only show up when the query actually *runs*. You don't need warehouse access for that. Paste:

> Build a tiny test database so we can prove the query's logic before I take it to the warehouse. Create a SQLite database `demo.db` with the three tables from `schema.md` and a handful of hand-picked rows covering the edge cases:
>
> - a customer who turns **exactly 25** on the day their card is issued (must be excluded — "under 25" means under),
> - a card issued the day **before** Q1 starts and one the day **after** Q1 ends (both excluded),
> - a card issued on the **last day** of Q1 (included),
> - a branch with zero issuance.
>
> Adapt `query.sql` to SQLite syntax where needed, run it with `sqlite3`, show me the results, and walk me through whether each edge case behaved as expected.

Claude builds the database, runs the query, and shows you real rows coming back — including the proof that the exactly-25 customer was excluded. (`sqlite3` is preinstalled on macOS; on Ubuntu/WSL, Claude will offer to install it — say yes.)

This is the strongest verification habit in the whole hub: **don't review logic, execute it**. A query that produced the right answer on a database you can hold in one hand earns its run against twelve million rows.
