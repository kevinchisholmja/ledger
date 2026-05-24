# activity/

This directory is the project's issue tracker — the ground-level, chronological record
of everything that happened: every file created, every decision made, every bug found
and fixed, every idea explored, every tool installed.

It replaces Linear, Jira, and Notion for this project. No subscription required.
No context lost when you switch machines. It ships with the code.

---

## How to read this directory

| If you want to... | Read... |
|---|---|
| Understand what the project is | `README.md` at the project root |
| See the whole project at a glance | `docs/build.md` |
| Know what is being worked on right now | `activity/ToDo.md` |
| Understand what a phase set out to do | `activity/phases/phase-N-name.md` |
| See what happened on a specific day | `activity/2026/YYYY-MM-DD.md` |
| Find when a bug was introduced or fixed | Search across dated files |

---

## Directory structure

```
activity/
  README.md              ← you are here
  ToDo.md                ← what is planned but not yet started
  [year]/
    YYYY-MM-DD.md        ← everything that happened that day
    YYYY-MM-DDa.md       ← when a day splits into two distinct work sessions (a, b, c...)
  phases/
    phase-N-name.md      ← context for each phase: goal, scope, key decisions, outcome
```

---

## Naming conventions

**Dated files** — `YYYY-MM-DD.md`
ISO 8601 format. Sorts chronologically in any file browser without configuration.

**Multiple sessions on the same day** — append `b`, `c`, `d`
Split by context, not by clock. Two unrelated pieces of work on the same day
(e.g. a feature build and a documentation overhaul) warrant a split.
`2026-05-24.md` → `2026-05-24b.md` → `2026-05-24c.md`

**Phase files** — `phase-N-name.md`
Numbered, kebab-case name matching the phase. Created before the phase starts.
Updated during and after. Never deleted.

---

## What belongs in a dated file

Not showing every line of every file, but enough that someone reading it six months
from now understands the decision, the gotcha, and where to look.

A good entry answers at least one of:
- What was done
- Why it was done that way (if non-obvious)
- What broke and how it was fixed
- A snippet for anything that was confusing
- A link to the relevant file, doc, or external resource

The minimum is a one-liner. The maximum is whatever the work requires.
A complex bug fix or architectural decision deserves a paragraph.
A package install does not.

---

## Tags

```
[x]          done
[ ]          planned, not yet started
[decision]   an architectural or design choice with reasoning
[bug]        a problem found
[fix]        how a bug was resolved — always paired with the [bug] it addresses
[note]       important context that does not fit elsewhere
```

---

## The relationship between activity/ and docs/

| activity/ | docs/ |
|---|---|
| Changes frequently | Stable reference material |
| Ground level — every task, bug, decision | 40,000 feet — summaries, architecture, operations |
| Read to understand how something came to be | Read to understand how something works now |
| The issue tracker | The handbook |

**The rule:** if it changes every few days, it belongs in `activity/`.
If it is stable reference material that rarely changes, it belongs in `docs/`.

When a decision recorded in `activity/` becomes significant enough to deserve
its own formal document (an ADR, an auth doc, a full requirements spec), that
document lives in `docs/` and the activity entry links to it.

---

## How this directory grows

1. **Before a phase starts** — create `activity/phases/phase-N-name.md` with the goal
   and scope. Add planned tasks to `activity/ToDo.md`.

2. **During the phase** — log everything in the dated file for today. Update `ToDo.md`
   as tasks are completed or plans change.

3. **After the phase ships** — update the phase file with what actually happened.
   Distill the key decisions and outcomes into `docs/build.md`.

4. **When a bug is found or fixed** — log it in today's dated file with `[bug]` and
   `[fix]` tags. If it touches a previous phase, note the original phase context.

---

*For the methodology behind this system — why it is structured this way,
how it fits into the broader development philosophy, and how to apply it
to a new project — see `playbook/README.md`.*
