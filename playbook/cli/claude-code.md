# Claude Code CLI

Install: `npm install -g @anthropic-ai/claude-code`  
Run: `claude` (from any directory)

---

## Starting a session

```bash
claude                            # start interactive session in current directory
claude "fix the login bug"        # start with an initial prompt
claude --model claude-opus-4-7    # use a specific model
```

---

## Slash commands (in-session)

```
/help                   show all commands
/clear                  clear conversation context (start fresh)
/compact                summarise the conversation to save context
/memory                 view or edit persistent memory files
/model                  switch model mid-session
/cost                   show token usage and cost for this session
/exit                   end the session
```

---

## Key keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Escape` | Cancel current tool execution |
| `Ctrl+C` | Cancel current response |
| `↑` / `↓` | Navigate input history |
| `Shift+Enter` | New line without submitting |

---

## Permission modes

When Claude runs a command, it may ask for permission. Modes:
- **Default**: asks for each tool call
- **Auto-approve**: `claude --dangerously-skip-permissions` (never use on untrusted code)
- Per-session: answer `a` to approve all remaining calls in a category

---

## CLAUDE.md and AGENTS.md

Place a `CLAUDE.md` file at the project root. Claude reads it at the start of every
session. Use it for project-specific rules: stack versions, security constraints,
known gotchas.

`AGENTS.md` is read by other AI coding agents (Codex, Gemini, etc.). Maintain both.

Example `CLAUDE.md`:
```markdown
@AGENTS.md

# Project rules
- Next.js version: 16.2.6 — not 14 or 15
- Tailwind: v4 — import syntax is @import "tailwindcss"
- Every Drizzle query must include WHERE user_id = X
```

---

## Memory system

Claude Code maintains persistent memory between sessions in:
`~/.claude/projects/<project-path>/memory/`

Memories are written automatically when you tell Claude something worth keeping.
You can explicitly ask: "remember that X" or "forget that Y".

To view: `/memory` in-session, or read the files directly.

---

## Pulling logs from Claude API (Anthropic Console)

No CLI available. Use the **Anthropic Console**:
- console.anthropic.com → **Workbench** for testing prompts
- Console → **Usage** for token/cost breakdown
- For runtime errors from `@anthropic-ai/sdk` in your app, log the error object — it
  includes the HTTP status, error type, and message from the API

Common error patterns:
```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
try {
  const response = await client.messages.create({ ... });
} catch (e) {
  if (e instanceof Anthropic.APIError) {
    console.error(e.status, e.name, e.message); // 429, RateLimitError, ...
  }
}
```
