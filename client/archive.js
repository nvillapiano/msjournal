import { fetchJournalList, fetchEntry } from './api.js';
import { appendMessage, escapeHtml, scrollChatToBottom } from './chat.js';

const journalList = document.getElementById('journal-list');
let entriesCache = [];

function dateKeyFor(entry) {
  if (entry.date) return entry.date;
  // fallback: if id starts with YYYY-MM-DD_..., take prefix

  const m = entry.id && entry.id.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : 'unknown';
}

export async function loadJournalList() {
  try {
    const entries = await fetchJournalList();
    entriesCache = entries;
    journalList.innerHTML = '';

    if (!entries.length) {
      journalList.innerHTML = '<div class="msj-entry__meta">No entries yet. Your first message will create one.</div>';
      return;
    }

    // Group entries by day
    const groups = entries.reduce((acc, e) => {
      const key = dateKeyFor(e);

      acc[key] = acc[key] || [];
      acc[key].push(e);
      return acc;
    }, {});

    // Sort keys newest -> oldest
    const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    for (const key of keys) {
      const group = groups[key];
      const dayEl = document.createElement('div');
      dayEl.className = 'msj-day';

  const btn = document.createElement('button');
  btn.className = 'msj-entry msj-day__btn';
  btn.innerHTML = `<div class="msj-entry__title">${escapeHtml(key)}</div><div class="msj-entry__meta">${group.length} message${group.length>1? 's':''}</div>`;

      btn.addEventListener('click', () => {
        const prev = journalList.querySelector('.msj-entry--active');
        if (prev) prev.classList.remove('msj-entry--active');
        btn.classList.add('msj-entry--active');
        loadDay(key);
      });

      dayEl.appendChild(btn);

      // optionally show a small preview list under the day (collapsed)
      const preview = document.createElement('div');
      preview.className = 'msj-day__preview';
      for (const e of group.slice(0,3)) {
        const p = document.createElement('div');
        p.className = 'msj-day__preview-item';
        const raw = e.summary || e.title || e.id || '';
        const max = 120;
        p.textContent = raw.length > max ? raw.slice(0, max).trim() + '…' : raw;
        preview.appendChild(p);
      }
      dayEl.appendChild(preview);

      journalList.appendChild(dayEl);
    }
  } catch (err) {
    console.error('Failed to load journal:', err);
    journalList.innerHTML = '<div class="msj-entry__meta">Error loading archive.</div>';
  }
}

async function loadDay(dayKey) {
  try {
    const group = entriesCache.filter(e => dateKeyFor(e) === dayKey);
    // Sort group by file name so older entries come first
    group.sort((a,b) => (a.file || a.id).localeCompare(b.file || b.id));

    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';

    for (const e of group) {
      // fetch each entry fully
      try {
        const full = await fetchEntry(e.id);
        const body = full.body || '';
        const segments = body.split(/\n-{3,}\n/).map(s => s.trim()).filter(Boolean);

        for (const seg of segments) {
          const youMatch = seg.match(/\*\*You:\*\*\s*([\s\S]*?)(?=(\n\*\*Agent:\*\*)|$)/i);
          const agentMatch = seg.match(/\*\*Agent:\*\*\s*([\s\S]*)/i);
          if (youMatch) appendMessage(youMatch[1].trim(), 'user');
          if (agentMatch) appendMessage(agentMatch[1].trim(), 'agent');
          if (!youMatch && !agentMatch) appendMessage(seg, 'agent');
        }
      } catch (err) {
        console.error('Failed to load entry', e.id, err);
      }
    }

    scrollChatToBottom();
  } catch (err) {
    console.error('Failed to load day:', err);
  }
}
