import { fetchJournalList, fetchEntry } from './api.js';
import { appendMessage, escapeHtml, scrollChatToBottom } from './chat.js';

const journalList = document.getElementById('journal-list');

export async function loadJournalList() {
  try {
    const entries = await fetchJournalList();

    journalList.innerHTML = '';

    if (!entries.length) {
      journalList.innerHTML = '<div class="msj-entry__meta">No entries yet. Your first message will create one.</div>';
      return;
    }

    for (const entry of entries) {
      const el = document.createElement('button');
      el.className = 'msj-entry';
      el.setAttribute('data-id', entry.id);
      el.innerHTML = `
        <div class="msj-entry__title">${escapeHtml(entry.summary || entry.title || entry.id)}</div>
        <div class="msj-entry__meta">
          ${entry.date || 'no date'} ${entry.tags && entry.tags.length ? '• ' + entry.tags.slice(0,3).join(', ') : ''}
        </div>
      `;
      el.addEventListener('click', () => {
        // toggle active class
        const prev = journalList.querySelector('.msj-entry--active');
        if (prev) prev.classList.remove('msj-entry--active');
        el.classList.add('msj-entry--active');
        loadEntry(entry.id);
      });
      journalList.appendChild(el);
    }
  } catch (err) {
    console.error('Failed to load journal:', err);
    journalList.innerHTML = '<div class="msj-entry__meta">Error loading archive.</div>';
  }
}

export async function loadEntry(id) {
  try {
    const entry = await fetchEntry(id);
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';

    // Parse the entry body into exchanges separated by '---'
    const body = entry.body || '';
    const segments = body.split(/\n-{3,}\n/).map(s => s.trim()).filter(Boolean);

    if (segments.length === 0) {
      // Fallback: render whole body as agent message
      appendMessage(entry.body || '(empty)', 'agent');
      scrollChatToBottom();
      return;
    }

    for (const seg of segments) {
      // Extract user and agent parts
      const youMatch = seg.match(/\*\*You:\*\*\s*([\s\S]*?)(?=(\n\*\*Agent:\*\*)|$)/i);
      const agentMatch = seg.match(/\*\*Agent:\*\*\s*([\s\S]*)/i);

      if (youMatch) {
        appendMessage(youMatch[1].trim(), 'user');
      }

      if (agentMatch) {
        appendMessage(agentMatch[1].trim(), 'agent');
      } else if (!youMatch) {
        // If neither matched, render the segment as agent text
        appendMessage(seg, 'agent');
      }
    }

    scrollChatToBottom();
  } catch (err) {
    console.error('Failed to load entry:', err);
  }
}
