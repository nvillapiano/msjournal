import { fetchJournalList, fetchEntry } from './api.js';
import { escapeHtml, scrollChatToBottom } from './chat.js';

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
      el.innerHTML = `
        <div class="msj-entry__title">${escapeHtml(entry.summary || entry.title || entry.id)}</div>
        <div class="msj-entry__meta">
          ${entry.date || 'no date'} ${entry.tags && entry.tags.length ? '• ' + entry.tags.slice(0,3).join(', ') : ''}
        </div>
      `;
      el.addEventListener('click', () => loadEntry(entry.id));
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

    const block = document.createElement('div');
    block.className = 'msj-message msj-message--agent';
    block.innerHTML = `<strong>${entry.date || ''}</strong><br><br>${escapeHtml(entry.body || '').replace(/\n/g, '<br>')}`;
    chatWindow.appendChild(block);
    scrollChatToBottom();
  } catch (err) {
    console.error('Failed to load entry:', err);
  }
}
