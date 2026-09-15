---
type: glossary
title: Postgres
audience: beginner
topics: [tooling, database, infrastructure]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: "https://www.postgresql.org/"
deeper_link: null
ai_summary: An open-source relational database — the storage layer most internal services at the bank use for structured data. Free, mature, very reliable.
tldr: "An open-source database used by most team services. Think of it as the filing cabinet where structured data (users, transactions, settings) lives."
aliases: ["postgresql", "psql"]
---

Postgres (short for **PostgreSQL**) is an open-source database. When a team service needs to remember things between requests — a customer list, a transaction log, a config table — that data usually lives in a Postgres database somewhere.

You'll see it referenced as:

- **A connection string** in environment files (`postgres://user:pass@host:5432/dbname`).
- **A `psql` shell** that lets you type SQL queries by hand.
- **Migration files** under `db/migrations/` that describe schema changes over time.

You don't need to know SQL well to start working with Claude Code. When you ask Claude to "fetch the last 10 transactions" or "add a new column for customer tier", it will write the SQL, explain what it's doing, and wait for you to approve. Read the diff and ask if anything looks unusual.

Postgres is "relational" — data lives in **tables** (think spreadsheets) with rows and columns, and tables reference each other by id. Most data the team works with fits this shape.
