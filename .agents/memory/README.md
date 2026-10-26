# Project memory

The memory every coding agent shares in this repository, whatever the tool
(Claude Code, Cursor, Codex, Devin). It lives in git so it travels with the
code, is reviewed like code, and is the same for everyone.

| File | Holds | Who writes it |
| --- | --- | --- |
| [lessons.md](./lessons.md) | Mistakes that were made and fixed, and the rule that prevents them | any agent, in the change that fixes the mistake |
| `spec/adr/` | Decisions and their reasons | proposed by an agent, accepted by a human |
| `.agents/rules/` | Standing rules | changed by PR |

## Rules for lessons

- **Read `lessons.md` at the start of every task.** It is short on purpose.
- **Write a lesson when you fix an error** that cost more than one attempt,
  that a future agent could plausibly hit again, or that came from a wrong
  assumption about a tool, library or this codebase. Add it in the same change
  as the fix.
- One entry per lesson, newest first, in the format below. Keep each entry to
  a few lines: what you saw, why it happened, what fixed it, and the rule.
- **Promote, then prune.** When a lesson becomes a standing rule, move the
  rule into `AGENTS.md` or `.agents/rules/` (or a lint rule or test, which is
  better still) and replace the entry with one line pointing there. Keep the
  file under about 60 entries; merge entries that say the same thing.
- Never write secrets, personal data, customer data or hostnames of real
  databases here.

## Entry format

```md
### YYYY-MM-DD · <area> · <one-line title>
- **Symptom:** what failed, the exact error code or message if there was one.
- **Cause:** why.
- **Fix:** what changed (file or command).
- **Rule:** what to do from now on. (Promoted to: `<file>` — when it was.)
```
