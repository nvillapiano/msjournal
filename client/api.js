export async function fetchJournalList() {
  const res = await fetch('/api/journal');
  if (!res.ok) throw new Error('Failed to fetch journal list');
  return res.json();
}

export async function fetchEntry(id) {
  const res = await fetch(`/api/journal/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch entry');
  return res.json();
}

export async function postChat(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  return res.json();
}
