# ms-journal-agent: AI Coding Agent Instructions

## Project Overview

**ms-journal-agent** is a local-first MS journaling application (Phase 1 Restore) built with:
- **Server**: Node.js 20 + Express, modules use `.mjs` (ES modules)
- **Client**: Vanilla JS (no frameworks), modular UI pattern
- **Storage**: Markdown files with YAML frontmatter in `journal/` directory
- **LLM**: Ollama-first (with OpenAI fallback), prompts for reflections, tags, and weather inference
- **VCS**: Auto-commits journal changes via `git` command wrapper (no direct Git library)

## Architecture

### Data Flow
1. **Client** (`client/`) sends user messages to `/api/chat` via fetch
2. **Server routes** (`server/routes.mjs`) receives POST, calls `journalStore.appendExchange()`
3. **Journal store** (`server/utils/journalStore.mjs`):
   - Loads/creates daily session file (`YYYY-MM-DD.md`)
   - Calls LLM 3x: main reflection + tag generation + weather inference
   - Appends timestamped exchange to markdown file
   - Auto-commits to git
4. **Client** receives LLM reply, updates UI, refreshes sidebar list

### Key Components

| File | Purpose | Notes |
|------|---------|-------|
| `server/server.mjs` | Express setup, static serving, SPA fallback | Entry point: `npm start` |
| `server/routes.mjs` | `/api/journal`, `/api/journal/:id`, `/api/chat` endpoints | Simple CRUD; no auth layer |
| `server/utils/journalStore.mjs` | Core logic: read/write markdown sessions, LLM calls | Highest complexity; handles frontmatter parsing/stringification |
| `server/utils/llmHandler.mjs` | Ollama → OpenAI fallback pattern | Non-streaming, plain text response |
| `server/utils/fileHelpers.mjs` | Safe file I/O wrappers | Returns `null` on error; no exceptions thrown |
| `server/utils/gitCommit.mjs` | Spawns `git` commands with error handling | Silently fails if not in repo; logs diagnostics |
| `client/api.js` | Fetch wrappers for `/api/*` | Simple GET/POST, no auth headers |
| `client/ui.js` | Form handling, UI initialization | Entry point called by `app.js` |
| `client/chat.js` | Message DOM append, typing indicator | References `#chat-window`, `#chat-form`, `#chat-input` |
| `client/archive.js` | Sidebar list loading and entry rendering | Fetches from `/api/journal` |

## Critical Patterns & Conventions

### Session-Based Storage
- **One file per day**: `YYYY-MM-DD.md` (e.g., `2026-01-14.md`)
- **Per-message timestamps**: `### HH:MM` headers separate user/agent pairs
- **Frontmatter**: `id`, `date`, `tags`, `summary`, `weather` (all optional except `id`)
- **Reading**: Use `gray-matter` to parse; `.data` = frontmatter, `.content` = body
- **Merging**: When appending, preserve existing tags/weather; merge LLM-generated tags

### LLM Invocation Pattern
```javascript
// Always call queryLLM() 3 times per message:
const agentReply = await queryLLM(prompt);  // Main reflection
const tagResp = await queryLLM(tagPrompt);  // Tags as JSON array
const weatherResp = await queryLLM(weatherPrompt);  // Weather summary or "Unknown"
```
- Expect plain text responses (no JSON wrapper from `queryLLM`)
- LLM tag parsing: try JSON.parse first, fall back to comma/newline split
- Weather: take first line only; "Unknown" becomes empty string
- Warnings logged to console (start with `⚠️` for visibility)

### Error Handling Philosophy
- **File operations**: `readFileSafe()` / `writeFileSafe()` return `null` on failure; never throw
- **Git commits**: `safeGitCommit()` silently succeeds/fails; logs diagnostics
- **LLM calls**: Fall through to next option (Ollama → OpenAI); log warnings
- **Client API**: Always wrap `fetch` with try/catch; display user-friendly errors

### Frontend Module Pattern
- `app.js`: Single entry point calling `init()` from `ui.js`
- Each module exports specific functions (`loadJournalList()`, `appendMessage()`, `postChat()`, etc.)
- No global state; DOM queries by ID (`#chat-input`, `#chat-window`, `#chat-form`)
- Form submission prevents default, validates input, manages async flow

## Environment & Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Express server port |
| `NODE_ENV` | (none) | Use `development` for extra logging |
| `OLLAMA_URL` | `http://localhost:11434` | Local LLM endpoint |
| `OLLAMA_MODEL` | `llama3` | Model name for Ollama |
| `OPENAI_API_KEY` | (empty) | Falls back if set and Ollama fails |

## Developer Workflows

### Starting the Application
```bash
npm start                    # Production (default)
npm run dev                  # Development with NODE_ENV=development
node server/server.mjs       # Direct execution
```

### Testing
```bash
npm test                     # Runs Node test files in test/
```
Tests: `fileHelpers.test.mjs`, `journalStore.test.mjs` (basic coverage; not comprehensive)

### Git Workflow
- **Manual commits**: Edit files directly; `git add` and `git commit` normally
- **Auto-commits**: `journalStore.appendExchange()` calls `safeGitCommit()` after writing markdown
- **Commit format**: Conventional: `journal: add/append entry <id>`

### Scripts Directory
- Helper scripts in `scripts/` are Phase 1 placeholders
- `scripts/commit_prompt.mjs`: Example of prompted commits (not integrated yet)
- No build/watch tasks configured

## Common Implementation Tasks

### Adding an API Endpoint
1. Add route in `server/routes.mjs` using `express.Router()`
2. Import any utils (store, LLM, git) at top
3. Wrap async logic in try/catch; respond with `res.json()` or `res.status(code).json(error)`
4. Test via `curl` or client fetch

### Modifying Journal Entry Schema
1. Extend `frontmatter` object in `journalStore.appendExchange()` (lines ~127–155)
2. Update `gray-matter.stringify()` call to include new fields
3. Update `listEntries()` to expose new fields in entry summary
4. No migration needed for existing files (frontmatter is flexible)

### Adding Client-Side Functionality
1. Create new module in `client/` (e.g., `search.js`)
2. Export named functions; import in `ui.js` and call from `init()`
3. Reference DOM elements by ID; keep mutations localized
4. Fetch from `/api/*` endpoints using `api.js` helpers

### Debugging LLM Issues
- Check `OLLAMA_URL` and `OLLAMA_MODEL` environment variables
- Ensure Ollama is running: `curl http://localhost:11434/api/tags`
- If Ollama fails, verify `OPENAI_API_KEY` is set for fallback
- Server logs will show `⚠️ Ollama request failed:` and fallback attempts

## Testing & Validation

- **No unit test framework**: Uses Node's built-in `test` runner (requires Node 18+)
- **Manual integration**: Start server + open browser to verify chat flow
- **Safe failures**: File I/O and git operations log but don't crash the app
- **Linting**: No linter configured; code style is idiomatic ES modules

## Known Limitations & Gaps (Phase 2 Backlog)

- [ ] UX polish: no loading states or scroll anchoring
- [ ] Index file: `journal/index.json` not yet implemented for fast search
- [ ] No authentication or multi-user support
- [ ] LLM system prompts not configurable via UI
- [ ] Tests are minimal; CI not set up
- See `ROADMAP.md` for full priorities

## Key Files to Understand First

1. **[server/utils/journalStore.mjs](../server/utils/journalStore.mjs)** — Core logic; read this end-to-end first
2. **[server/utils/llmHandler.mjs](../server/utils/llmHandler.mjs)** — LLM orchestration (Ollama → fallback)
3. **[client/ui.js](../client/ui.js)** — Client entry point and form handling
4. **[server/routes.mjs](../server/routes.mjs)** — API surface contract
