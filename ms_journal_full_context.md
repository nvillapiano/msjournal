# MS Journal Agent — Comprehensive Context Document (Phase 1 → Phase 2)

This document captures **all essential context** required for continuing development of the `ms-journal-agent` project across VS Code, ChatGPT, and local runtime. It includes:

- Project intent and philosophy
- Architecture
- Working features from Phase 1
- Known issues / failed approaches
- Tech stack constraints
- Important code behavior
- Development patterns
- Future direction (Phase 2)
- Your preferences as developer/collaborator

This is the file you would hand to *another instance of ChatGPT* to onboard it fully.

---

# 1. High-level Purpose

You are building a **local-first, private MS journaling agent** that:

- Stores journal entries as Markdown with YAML frontmatter.
- Provides a lightweight **web-based chat interface**.
- Automatically commits changes into Git after each entry.
- Uses a local LLM (Ollama) for supportive, concise reflections.
- Can fall back to OpenAI only if explicitly configured.
- Runs entirely on your machine (Mac) or in a devcontainer.

Your priorities:

- Fast iteration.
- Clear separation of frontend and backend.
- Semantic, classic CSS (no Tailwind).
- Agent responses that feel grounded, not overly cheerful.
- Control and stability over fanciness.
- Code that’s easy to maintain and expand.

---

# 2. Environment & Stack

### Runtime

- Node 20.19.x
- npm
- Express
- Vanilla JS (no framework)
- Ollama (local inference)
- Optionally OpenAI (when `OPENAI_API_KEY` is set)

### Frontend

- `/client/`
  - `index.html`
  - `style.css` (semantic BEM-ish CSS)
  - `app.js` (HTMX-like custom behavior)

### Backend

- `/server/`
  - `server.mjs` (Express runtime)
  - `routes.mjs` (API routes)
  - `/utils`
    - `journalStore.mjs` — file persistence + entry creation
    - `llmHandler.mjs` — Ollama + OpenAI fallback logic
    - `gitCommit.mjs` — safe commit helper
    - `fileHelpers.mjs` — safe read/write

### Persistence

- `/journal/…` — one Markdown file **per entry**
- Each entry contains:
  - YAML frontmatter (`id`, `date`, `tags`, `summary`, `title`)
  - Body content (user text + agent response)

### Development Containers

- `.devcontainer/` for Codespaces or local Dev Containers

---

# 3. What Works Well (Phase 1)

### ✔ Local run is stable

You can:

```bash
npm install
npm run dev
```

and access `http://localhost:3000`.

### ✔ Ollama integration now works

Root cause fixed: Ollama requires correct request shape and boolean `stream: false`.

### ✔ Automatic entry creation

Every message creates a new `.md` file.

### ✔ Auto git commits

Runs only if in a Git repo. Errors are swallowed safely.

### ✔ Clean CSS UI

You have:

- Sidebar
- Chat window
- Typing indicator
- Inputs with keyboard shortcuts (Enter = send / Shift+Enter = newline)

### ✔ Archive loads correctly

List of entries appears in the sidebar sorted by date. Clicking loads the entry in the chat panel.

### ✔ The whole project can be recreated from a single bootstrap script

Your bash generator works.

---

# 4. What Was Broken / Pain Points (Phase 1)

### ✘ Ollama originally failed due to streaming mismatch

Ollama streamed chunks even when `stream: false` was set incorrectly. Fixed by updating the request body.

### ✘ No structured plan for sessions or multi-message grouping

Each message creates a new entry; project will likely need sessions.

### ✘ Frontend is monolithic

`app.js` mixes:

- Chat behavior
- Archive behavior
- UI rendering
- Error handling

### ✘ No tagging automation

Frontmatter tags are empty arrays. Phase 2 intends preflight tagging / classification.

### ✘ No LLM configuration UI

Model selection, system prompts, memory windows, etc. not adjustable.

### ✘ No debounce / throttle or UX polish

No loading transitions beyond typing dots.

### ✘ No pagination or performance considerations

If `/journal/` grows large, loading sidebar will slow down.

### ✘ No global error banner/UI

All errors go directly into chat.

---

# 5. Patterns You Prefer

### Tone & Behavior

- Grounded, direct responses
- No excessive praise
- No artificial cheerfulness
- Small talk unnecessary

### Coding Workflow

- You code in VS Code
- ChatGPT serves as “pair programmer”
- You prefer:
  - Concrete diffs
  - File-by-file changes
  - Small commits
  - Iteration

### New working behavior (commit policy)

- After any successful prompt-driven change where files are modified in the repository, create a git commit using the Conventional Commits format. Include a concise header (type(scope): short description) and, when useful, a body listing the files changed or rationale. Keep commits small and focused — one logical change per prompt where possible.
- A helper script `scripts/commit_prompt.mjs` is provided to build and run the conventional commit. The assistant (or developer) should run it or call the equivalent git steps at the end of a successful edit session.

### Technical Preferences

- Vanilla JS over heavy frameworks
- Semantic class-based CSS
- Clear module structure
- Local-first architecture

### Safety Preferences

- Private by default
- No cloud dependency unless you explicitly choose it
- Git history remains local

---

# 6. Architecture Summary (How Everything Talks)

```
client/app.js → /api/chat → appendExchange()
                        ↓
             llmHandler.mjs → Ollama or OpenAI
                        ↓
                 journalStore writes .md file
                        ↓
                   gitCommit.mjs auto-commit
```

And:

```
client/app.js → /api/journal → listEntries → sidebar
client/app.js → /api/journal/:id → getEntryById → load entry
```

---

# 7. Important Implementation Behaviors

### ✔ `appendExchange()` creates a new entry per user message

Format:

```
2025-11-20_abcd1234.md
```

With YAML:

```yaml
id: 2025-11-20_abcd1234
date: 2025-11-20
summary: "first 140 chars of agent reply"
tags: []
```

Then:

```markdown
# Entry

**You:** User's text

**Agent:** LLM reply
```

### ✔ `queryLLM()` tries Ollama first

Falls back to OpenAI only if env var exists. Never crashes the app; always returns some string.

### ✔ `listEntries()` sorts newest → oldest

Used to render sidebar.

### ✔ The UI never reloads the whole page

All fetch calls update parts of the DOM.

---

# 8. Confirmed Working Ollama Payload

This is what your local Ollama expects:

```json
{
  "model": "llama3",
  "prompt": "Hello",
  "stream": false
}
```

Your curl output proved that once installed, the responses come chunked (default streaming), but when `stream: false` is correctly parsed, single JSON response is returned.

---

# 9. What Phase 2 Needs to Focus On

### UX polish

- Better chat flow (scroll anchoring, idle state, fade-ins, etc.)
- Loading animations during LLM latency
- Keyboard interactions & shortcuts
- Error banners

### Frontend architecture

- Split `app.js` into modules:
  - `chat.js`
  - `archive.js`
  - `ui.js`
  - `api.js`

### Performance improvements

- Smarter `/journal/` loading
- Maybe metadata index file
- Lazy loading entries

### Archive & session filtering

- Group entries by day/week
- Or implement user-defined “sessions”
- Fast search / filter UI

### Preflight hooks (optional)

- Auto-tagging with LLM
- Content classification (symptoms, routines, mood)
- Lightweight sentiment scoring
- Customizable prompt templates

### LLM configuration features

- Dropdown to select model (e.g., `llama3:8b`)
- Local prompt saving
- Toggle between local/remote

### Developer experience

- Better logging in backend
- ENV-based config
- Local environment indicator

---

# 10. Stuff ChatGPT Should Remember (Meta)

### The human’s preferences:

- Direct, candid, low-fluff communication
- Challenge ideas, don’t blindly affirm
- No emotional over-supportiveness
- Avoid over-engineering
- Build incrementally
- Prefer real code edits over long vague explanations

### When asking ChatGPT for code:

- Provide specific file paths
- Provide diffs when modifying existing code
- Provide reasoning, but briefly
- Always check runtime behavior

### When ChatGPT generates frontend code:

- Must remain semantic, CSS-based (no Tailwind)
- Stick to current color palette + layout style
- Avoid rewriting everything unless explicitly asked

### When ChatGPT generates backend code:

- Must remain ESM modules
- Keep Express router simple
- Handle errors gracefully
- Never assume OpenAI API availability

### When adding features:

- Maintain local-first philosophy
- Avoid frameworks unless explicitly requested
- Keep code readable and small

---

# 11. To onboard a new ChatGPT instance, give it this summary:

> "I’m working on a local-first MS journaling agent called `ms-journal-agent`. It has a Node/Express backend and a vanilla JS frontend. Entries are stored as Markdown with YAML frontmatter and auto-committed via Git. The agent uses Ollama locally for reflection responses. I need your help continuing development (Phase 2) focused on UX polish, frontend modularization, session filtering, and preflight tagging hooks. Please review this context document fully and operate as if you understand the entire system."

---

# 12. Next Steps (Phase 2 Kickoff)

If you want, we can now proceed to Phase 2 by building a plan with:

- Concrete milestones
- File-by-file modifications
- Architecture diagrams
- Incremental tasks that won’t break existing features
- Testing strategy

Just say **“begin phase two”**.

---

This document will remain the canonical reference for all future coding sessions.

