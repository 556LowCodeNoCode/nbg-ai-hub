---
type: glossary
title: VM
audience: beginner
topics: [infrastructure, tooling, deployment]
internal: false
authored: "2026-06-17"
last_reviewed: "2026-06-17"
external_link: null
deeper_link: null
ai_summary: A computer that runs as software on top of another computer. A VM has its own operating system, files, and network — but the hardware underneath is shared with other VMs on the same physical host.
tldr: "Short for virtual machine — a full computer running as software on a shared physical host. Has its own OS, files, and network."
aliases: ["VMs", "virtual machine", "virtual machines"]
---

A VM (virtual machine) is a computer that runs as software inside another, larger computer. From the outside it behaves exactly like an ordinary machine — its own operating system, hostname, files, network — but the CPU, memory, and disk underneath are shared with other VMs running on the same physical hardware.

VMs are the building block for almost everything that runs "in the cloud". When NBG provisions a Linux server in Azure, that "server" is a VM. When you SSH into a cloud machine, you're SSHing into a VM. When the bank's Sandbox programme gives you a personal Linux box pre-loaded with Claude Code, that box is a VM — sitting in NBG's private cloud, one per colleague.

Why this matters for Claude Code work: the typical "where am I running this?" question has three sensible answers — your laptop, a colleague's laptop, or a VM. The VM answer is what unlocks *"I can use Claude with real bank data without anything sensitive sitting on my laptop"*. See [Sandbox](#sandbox) for the NBG-specific shape of this.
