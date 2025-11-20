const chatWindow = document.getElementById('chat-window');

export function appendMessage(text, role) {
  const el = document.createElement('div');
  el.className = 'msj-message ' + (role === 'user' ? 'msj-message--user' : 'msj-message--agent');
  el.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
  chatWindow.appendChild(el);
  scrollChatToBottom();
}

export function showTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'msj-message msj-message--agent';
  el.innerHTML = `
    <div class="msj-typing">
      <div class="msj-typing__dot"></div>
      <div class="msj-typing__dot"></div>
      <div class="msj-typing__dot"></div>
    </div>
  `;
  chatWindow.appendChild(el);
  scrollChatToBottom();
  return el;
}

export function scrollChatToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
