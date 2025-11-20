import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const journalDir = path.join(process.cwd(), 'journal');

async function scan() {
  try {
    const files = await fs.readdir(journalDir);
    const problems = [];
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const full = path.join(journalDir, file);
      try {
        const raw = await fs.readFile(full, 'utf8');
        try {
          matter(raw);
        } catch (e) {
          problems.push({ file, reason: 'frontmatter parse error', message: e.message });
        }
      } catch (e) {
        problems.push({ file, reason: 'read error', message: e.message });
      }
    }

    if (problems.length === 0) {
      console.log('No problematic journal files found.');
    } else {
      console.log('Problematic files:');
      for (const p of problems) {
        console.log(`- ${p.file}: ${p.reason} - ${p.message}`);
      }
    }
  } catch (err) {
    console.error('Failed to scan journal dir:', err.message);
    process.exit(2);
  }
}

scan();
