import { loadJournalList } from './archive.js';
import { appendMessage, showTypingIndicator } from './chat.js';
import { postChat } from './api.js';

const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');

export async function init() {
  await loadJournalList();
  attachFormBehavior();
  attachNewEntryBehavior();
}

function attachNewEntryBehavior() {
  const btn = document.getElementById('new-entry-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) chatWindow.innerHTML = '';
    const prev = document.querySelector('.msj-entry--active');
    if (prev) prev.classList.remove('msj-entry--active');
    input.value = '';
    input.focus();
  });
}

function attachFormBehavior() {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    input.value = '';

    const typingEl = showTypingIndicator();

    try {
      const data = await postChat(text);
      typingEl.remove();

      if (data.error) {
        appendMessage('Something went wrong saving this entry. Try again.', 'agent');
      } else {
        appendMessage(data.agent, 'agent');
        loadJournalList();
      }
    } catch (err) {
      console.error(err);
      typingEl.remove();
      appendMessage('Unable to reach the local journal agent. Is the server running?', 'agent');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
}
