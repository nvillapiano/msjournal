import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { writeFileSafe, readFileSafe, ensureJournalDir, getJournalDir } from '../server/utils/fileHelpers.mjs';

const journalDir = getJournalDir();
const testFile = path.join(journalDir, 'test_fileHelpers_temp.md');

await ensureJournalDir();

await writeFileSafe(testFile, '# test\n\nhello');
const content = await readFileSafe(testFile);
assert(content.includes('hello'), 'Content should include written text');

// cleanup
try {
  await fs.unlink(testFile);
} catch (e) {
  // ignore
}

console.log('fileHelpers tests passed');
