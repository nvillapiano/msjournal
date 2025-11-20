# ROADMAP — ms-journal-agent

This file tracks planned features and priorities for Phase 2 and beyond.

## Short-term (Phase 2 priorities)

- [x] Sessions: group messages into daily session files (one `.md` per day`).
- [x] Frontend modularization: split `client/app.js` into `api.js`, `chat.js`, `archive.js`, `ui.js` (initial split done).
- [ ] UX polish: loading states, scroll anchoring, keyboard shortcuts, error banner.
- [ ] Auto-tagging: LLM-based preflight to populate `tags` in frontmatter.
- [x] Metadata index: create `journal/index.json` for fast sidebar rendering and search (planned; index file not yet implemented)

## Workflow / tooling

- [x] Commit policy: create conventional commit after prompt-driven changes and provide helper script (`scripts/commit_prompt.mjs`).
- [x] Tests: basic Node tests added for `fileHelpers` and `journalStore` (see `test/`).

## Mid-term

- LLM configuration UI: model selection, system prompts, memory window.
- Backup & optional encrypted sync: local backups, optional cloud syncing.
- Tests & CI: unit tests for backend utils and small integration tests.

## Long-term

- Sessions and journaling analytics (mood trends, symptom tracking).
- Plugin architecture for additional processing hooks.
- Better local model support and prompt templates management.

Notes:
- Prioritize local-first, privacy-by-default design.
- Keep changes small and reviewable (file-by-file diffs).
