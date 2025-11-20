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

function formatLabel(e) {
  // Prefer explicit title, otherwise format filename/id
  const raw = e.title && String(e.title).trim() ? e.title : (e.file || e.id || '');
  // remove extension
  const noext = String(raw).replace(/\.md$/i, '');
  // replace underscores and dashes with spaces
  const spaced = noext.replace(/[_-]+/g, ' ');
  return String(spaced).trim();
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

      // Header area: day button + chevron to toggle preview
      const header = document.createElement('div');
      header.className = 'msj-day__header';

      const btn = document.createElement('button');
      btn.className = 'msj-entry msj-day__btn';
      const titleText = key === 'unknown' ? 'Unknown date' : key;
      btn.innerHTML = `<div class="msj-entry__title">${escapeHtml(titleText)}</div><div class="msj-entry__meta">${group.length} message${group.length>1? 's':''}</div>`;
      btn.addEventListener('click', () => {
        const prev = journalList.querySelector('.msj-entry--active');
        if (prev) prev.classList.remove('msj-entry--active');
        btn.classList.add('msj-entry--active');
        loadDay(key);
      });

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'msj-day__toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span class="msj-day__chev">▸</span>';

      header.appendChild(btn);
      header.appendChild(toggle);
      dayEl.appendChild(header);

      // preview list under the day (collapsed by default)
      const preview = document.createElement('div');
      preview.className = 'msj-day__preview';
      for (const e of group.slice(0,3)) {
        const p = document.createElement('div');
        p.className = 'msj-day__preview-item';
        if (key === 'unknown') {
          // show formatted filename/title for unknowns
          p.textContent = formatLabel(e) + (e.date ? '' : ' (no date)');
        } else {
          const raw = e.summary || e.title || e.id || '';
          const max = 120;
          p.textContent = raw.length > max ? raw.slice(0, max).trim() + '…' : raw;
        }
        preview.appendChild(p);
      }
      dayEl.appendChild(preview);

      toggle.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        preview.classList.toggle('msj-day__preview--expanded', !expanded);
      });

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
