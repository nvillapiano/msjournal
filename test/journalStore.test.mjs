import assert from 'assert';
import { listEntries, getEntryById } from '../server/utils/journalStore.mjs';

const entries = await listEntries();
assert(Array.isArray(entries), 'listEntries should return an array');
if (entries.length === 0) {
  console.log('No journal entries present; skipping getEntryById assertions');
} else {
  const id = entries[0].id;
  const entry = await getEntryById(id);
  assert(entry && entry.id === id, 'getEntryById should return the requested entry');
  assert(typeof entry.body === 'string', 'entry.body should be a string');
}

console.log('journalStore tests passed');
