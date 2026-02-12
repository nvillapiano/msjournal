export function initStatus() {
  const el = document.getElementById('status-indicator');
  if (!el) return;

  async function update() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('status fetch failed');
      const data = await res.json();
      el.classList.remove('online','offline');
      if (data.status === 'online') {
        el.classList.add('online');
        const backend = data.backend === 'gpt' ? 'GPT' : (data.backend || 'ollama');
        el.querySelector('.status-text').textContent = `online (${backend})`;
      } else {
        el.classList.add('offline');
        el.querySelector('.status-text').textContent = 'offline';
      }
    } catch (err) {
      el.classList.remove('online');
      el.classList.add('offline');
      const txt = el.querySelector('.status-text');
      if (txt) txt.textContent = 'offline';
    }
  }

  // initial
  update();
  // poll every 8 seconds
  setInterval(update, 8000);
}
