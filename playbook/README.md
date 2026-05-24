# Development Playbook

*This document will be transferred to its own repository: `kevinchisholmja/playbook`.
It is temporarily housed here while being written. It is not specific to Ledger —
it describes how any project should be approached and structured.*

---

## What this is

A personal methodology for building software projects — solo or in a small team.
It is the answer to a specific problem: **professional project management tools
(Linear, Jira, Notion, Basecamp) are powerful but external. When the subscription
lapses, the team changes, or the account closes, the project's history disappears.**

This playbook keeps everything inside the repository, version-controlled alongside
the code, permanent, and readable by any developer — or any AI — who clones the repo.

It is not Agile. It is not Scrum. It borrows from both but strips away the ceremony.
It is a system that a solo developer or a team of two to five people will actually use.

---

## The core problem with formal methodologies

Sprints, Epics, User Stories, Use Cases, ADRs, Non-Functional Requirements,
Functional Requirements, Auth Docs, Traceability Matrices — these are all valid
tools, but they represent a full professional taxonomy that takes years to internalize.
Applied to a small project without that background, they create overhead without value.

The insight behind this playbook: **all of those document types are different cuts
of the same information.** You do not need a separate document for each. You need one
place that captures the what, why, and when of everything — and the context of when
it happened provides the categorisation naturally.

That place is the `activity/` directory.

---

## The system

Every project built with this methodology has the same top-level structure:

```
README.md              the front door — what is this, how do I run it, where are the docs
docs/                  stable reference documentation
  build.md             40,000-foot view of the whole project — one section per phase
  architecture.md      system design, data flow, component relationships
  runbook.md           how to deploy, operate, and debug
  env-vars.md          every environment variable and where to get it
activity/              the issue tracker — everything that happened, in order
  README.md            how to read and write in this directory
  ToDo.md              what is planned but not yet started
  [year]/              dated activity files — the chronological thread
    YYYY-MM-DD.md      everything done on that day
    YYYY-MM-DDa.md     second session if the day splits (b, c, d...)
  phases/              phase context files — goal, scope, decisions, outcome
    phase-N-name.md    created before the phase starts, updated after
playbook/              this document — the methodology (to be its own repo)
```

---

## The issue tracker replacement

Professional teams use Linear, Jira, or Notion because those tools provide a
**chronological, searchable record** of all project activity. The date is the thread.
Everything — tasks, decisions, bugs, features — is timestamped and linked.

The `activity/[year]/YYYY-MM-DD.md` files replicate this exactly.

**Every piece of work gets a mention in the dated file for the day it happened:**
- Every file created
- Every decision made and why
- Every bug found and how it was fixed
- Every tool installed and why
- Every constraint discovered

The minimum entry is a one-liner. The maximum is whatever the work requires.
A package install is one line. A complex architectural decision or a subtle bug fix
deserves a paragraph, a code snippet, and a link to the affected file.

**Not showing every line of every file, but enough that someone reading it six months
from now understands the decision, the gotcha, and where to look.**

This is the single most important principle in the system. It is what makes the
difference between a log that is useful and one that is noise.

---

## The chronological thread

The date is what makes the record linear. Work from multiple phases can appear in the
same dated file — because that is when it actually happened. If you fix a Phase 1 bug
while building Phase 4, that fix is logged in today's file, not in the Phase 1 files.
The phase files capture *what a phase was about*. The dated files capture *what was
actually done and when*.

When a single day contains two unrelated bodies of work, split into `a` and `b` files:
`2026-05-24.md` and `2026-05-24b.md`. Split by context, not by clock.

---

## Phases instead of sprints

This methodology uses **phases** rather than sprints. A sprint is time-boxed — it ends
after two weeks whether the work is done or not. A phase is scope-boxed — it ends when
the defined goal is achieved.

For a solo developer or a small team, phases are more honest. You are not trying to
fill two weeks of calendar time. You are trying to ship a working increment.

**Before a phase starts:**
1. Create `activity/phases/phase-N-name.md` with the goal, scope, and key constraints.
   What is in scope. What is explicitly out of scope. What another developer must know
   before touching this area.
2. Add planned tasks to `activity/ToDo.md`.

**During the phase:**
- Log everything in today's dated file.
- Update `activity/ToDo.md` as tasks complete or plans change.

**After the phase ships:**
- Update the phase file with what actually happened — deviations from the plan,
  bugs encountered, final outcome.
- Add a section to `docs/build.md` — the 40,000-foot summary.
- Commit everything.

---

## The 40,000-foot view

`docs/build.md` is read by someone who wants to understand the whole application
without reading everything else. It has one section per phase. Each section covers:
- What the phase set out to do
- The key facts any developer must know about this phase's work
- Links to the phase file and dated files for full detail

It does not list every task or every file. It captures the decisions that are still
load-bearing today — the constraints that cannot be changed without understanding why
they exist.

---

## When to write formal documents

ADRs, Functional Requirements, Non-Functional Requirements, Auth Docs, Traceability
Matrices — these are not wrong. They are appropriate for large teams, regulated
industries, or projects where the separation of concerns genuinely requires them.

The rule in this methodology: **a formal document is warranted when a decision is
significant enough that a one-liner in the activity log is not enough to capture it,
and when it needs to be referenced independently of the phase that created it.**

When that threshold is crossed:
1. Write the document in `docs/` — `docs/decisions/`, `docs/auth.md`, etc.
2. Link to it from the dated activity file: `[decision] wrote docs/decisions/001-drizzle.md`
3. Link to it from `docs/build.md` in the relevant phase section.

Most small projects never reach this threshold. The activity files carry everything.

---

## Applying this to a new project

1. Create the repository.
2. Copy this directory structure: `README.md`, `docs/`, `activity/`, `playbook/` (link to this repo).
3. Write `README.md` — what the project is, how to run it, where the docs are.
4. Write `docs/architecture.md` with the initial system design (even if it is a sketch).
5. Create `activity/phases/phase-1-name.md` — the goal and scope of the first phase.
6. Add initial tasks to `activity/ToDo.md`.
7. Start building. Log everything in today's dated file.
8. When the phase ships, update the phase file, write the `docs/build.md` section, commit.

Every subsequent phase repeats steps 5–8.

---

## For AI agents working in this system

If you are an AI assistant starting a new session on a project built with this methodology:

1. Read `README.md` first — it tells you what the project is and where the rules are.
2. Read `CLAUDE.md` / `AGENTS.md` — project-specific rules that override defaults.
3. Read `docs/build.md` — the 40,000-foot view of what has been built.
4. Read `activity/ToDo.md` — what is currently planned.
5. Read the most recent dated file in `activity/[year]/` — what was last worked on.
6. Read the relevant `activity/phases/` file before starting any phase work.

When you complete work in a session:
- Update `activity/ToDo.md` — check off completed items, add anything discovered.
- Log everything in the dated file for today — files created, decisions made, bugs fixed.
- If a phase completed, update the phase file and `docs/build.md`.

**The activity files are the memory of the project. Maintain them.**

---

## What this is not

This is not a project management tool. It does not replace a team's need for
real-time communication, code review, or stakeholder reporting.

It is a documentation methodology — a way of ensuring that the knowledge behind
a project lives with the code, not in someone's head or in an external tool that
may not exist in six months.

The goal is simple: any developer who clones the repository should be able to
understand not just what the code does, but why it is the way it is.
