---
type: glossary
title: WSL
audience: beginner
topics: [shell, windows, infrastructure]
internal: false
authored: "2026-05-27"
last_reviewed: "2026-05-27"
external_link: "https://learn.microsoft.com/en-us/windows/wsl/"
deeper_link: null
ai_summary: Windows Subsystem for Linux — Microsoft's first-party way to run a full Linux environment inside Windows. The team's recommended setup for any Claude Code work on a Windows machine.
tldr: "Windows Subsystem for Linux — runs a full Linux shell inside Windows. The team's default Windows setup for Claude Code work."
aliases: ["wsl 2", "wsl2", "windows subsystem for linux"]
---

WSL (Windows Subsystem for Linux) is Microsoft's first-party way of running a Linux environment inside Windows. It is not a virtual machine in the traditional sense — it is a tighter integration where Linux files, processes, and tools coexist with your Windows ones.

Why the team uses it for Claude Code work on Windows:

- The Linux shell (Bash) is what most Claude Code documentation assumes.
- Common dev tools (gh, git, npm, python) install with a single command via apt.
- File paths, line endings, and permissions behave the way the rest of the team expects.

WSL 2 is the version everyone uses now. WSL 1 still exists but is mostly historical.

**Installing WSL:**

The happy-path command (Windows 10 build 19041+ or Windows 11, admin rights, internet access) is one line in *PowerShell as Administrator*:

```
wsl --install
```

This installs WSL 2, enables the virtualization features it needs, and downloads Ubuntu by default. After the reboot it prompts for a Linux username and password. Full Microsoft instructions: [learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/en-us/windows/wsl/install).

**Common blockers on a managed laptop:**

- *No admin rights.* File a request with IT to enable WSL — it is a one-time policy change, not an ongoing exception. While you wait, Git Bash (from [Git for Windows](https://git-scm.com/download/win)) handles basic shell commands.
- *Virtualization disabled in BIOS.* IT controls this on managed machines. Same request route.
- *Microsoft Store blocked.* Microsoft ships offline WSL installer packages (`.msi`) that bypass the Store.

Once WSL is installed, every Claude Code session runs *inside* WSL, not in regular PowerShell. The terminal app you launch ([Windows Terminal](https://learn.microsoft.com/en-us/windows/terminal/install) is the cleanest one) lets you pick "Ubuntu" as the profile.
