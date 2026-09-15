---
type: glossary
title: Database
audience: beginner
topics: [fundamentals, infrastructure]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: A program that stores and retrieves structured data — the "memory" of a software service. Postgres, MySQL, SQL Server, Oracle are all databases.
tldr: "Where a software service stores its data so it survives between sessions. Filing cabinet for the program — structured rows and columns."
aliases: ["databases", "db"]
---

A database is the part of a software system that stores data so it doesn't disappear when the application restarts. Anything a service needs to remember — a list of customers, the history of every transaction, today's exchange rates — lives in a database.

Most databases you'll encounter at the bank are **relational**: data lives in tables (rows and columns, like a spreadsheet), and tables reference each other by id. SQL is the language used to ask the database questions.

Common databases by name:

- **Postgres** — open-source, the team default for new internal services.
- **MySQL** — also open-source, common in older services.
- **SQL Server / Oracle** — commercial, common in legacy enterprise systems.

The reason a database matters for Claude Code work: when you ask Claude to make a change that involves stored data ("add a new column", "fix this query that's slow"), it's working against a real database schema. The schema rules — column types, indexes, constraints — are what stop bad data getting in. Read the CLAUDE.md for any database conventions ("singular table names", "money values as integer minor units") before you accept the change.
