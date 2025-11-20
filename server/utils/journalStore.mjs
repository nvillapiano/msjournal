import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { v4 as uuidv4 } from "uuid";

import {
  ensureJournalDir,
  getJournalDir,
  writeFileSafe
} from "./fileHelpers.mjs";
import { queryLLM } from "./llmHandler.mjs";
import { safeGitCommit } from "./gitCommit.mjs";

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function listEntries() {
  await ensureJournalDir();
  const dir = getJournalDir();
  const files = await fs.readdir(dir);
  const entries = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const fullPath = path.join(dir, file);
    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = matter(raw);

    entries.push({
      id: file.replace(".md", ""),
      file,
      date: parsed.data.date || null,
      tags: parsed.data.tags || [],
      summary: parsed.data.summary || "",
      title: parsed.data.title || file
    });
  }

  entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return entries;
}

export async function getEntryById(id) {
  await ensureJournalDir();
  const dir = getJournalDir();
  const file = `${id}.md`;
  const fullPath = path.join(dir, file);

  try {
    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = matter(raw);
    return {
      id,
      ...parsed.data,
      body: parsed.content
    };
  } catch {
    return null;
  }
}

export async function appendExchange(userMessage) {
  await ensureJournalDir();
  const dir = getJournalDir();

  const id = `${isoDate()}_${uuidv4().slice(0, 8)}`;
  const filePath = path.join(dir, `${id}.md`);

  const prompt = [
    "User MS journal entry:",
    userMessage,
    "",
    "Respond with a short, supportive reflection and, if relevant, note any trackable MS symptoms or triggers."
  ].join("\n");

  const agentReply = await queryLLM(prompt);

  const frontmatter = {
    id,
    date: isoDate(),
    tags: [],
    summary: agentReply.slice(0, 140)
  };

  const content = matter.stringify(
    `# Entry\n\n**You:** ${userMessage}\n\n**Agent:** ${agentReply}\n`,
    frontmatter
  );

  await writeFileSafe(filePath, content);
  await safeGitCommit(`journal: add entry ${id}`);

  return {
    id,
    user: userMessage,
    agent: agentReply
  };
}
