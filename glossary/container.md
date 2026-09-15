---
type: glossary
title: Container
audience: beginner
topics: [tooling, deployment, infrastructure]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: null
deeper_link: null
ai_summary: A self-contained running instance of an application packaged with everything it needs. Containers are how modern services ship and run. Docker is the most common tool for building them.
tldr: "A self-contained running copy of an app with everything it needs. Behaves the same on any machine. Docker builds them; Kubernetes runs many of them."
aliases: ["containers", "container image"]
---

A container is one running copy of an application, packaged with everything it needs to run — runtime, libraries, system tools, config — so it behaves the same whether you start it on your laptop, on a colleague's machine, or in production.

Two related things in everyday conversation:

- **Container image** — the built bundle, sitting on disk or in a registry, ready to run. You don't "run" the image directly; you start a container from it.
- **Container** — a running instance of an image. You can start, stop, restart, kill, and tail logs from a container.

Why containers matter for Claude Code work: when you ask Claude to "run this service locally" or "deploy this", it almost always means starting a container. The `Dockerfile` describes how the image is built; the deployment script describes which container to start, where, and how. Read the diff — most containers are small and the runtime config is the part worth scrutinising.

See also: [Docker](#docker), the most common tool for building and running containers.
