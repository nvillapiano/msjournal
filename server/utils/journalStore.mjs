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

  // Use one markdown file per day (session) instead of one file per message.
  const today = isoDate();
  const sessionId = today; // e.g., '2025-11-19'
  const fileName = `${sessionId}.md`;
  const filePath = path.join(dir, fileName);

  // Build the LLM prompt
  const prompt = [
    "User MS journal entry:",
    userMessage,
    "",
    "Respond with a short, supportive reflection and, if relevant, note any trackable MS symptoms or triggers."
  ].join("\n");

  const agentReply = await queryLLM(prompt);

  // Read existing session file if present
  let existingRaw = await readFileSafe(filePath);
  let frontmatter = {
    id: sessionId,
    date: isoDate(),
    tags: [],
    summary: agentReply.slice(0, 140)
  };

  let existingContent = "# Entry\n\n";
  if (existingRaw) {
    try {
      const parsed = matter(existingRaw);
      frontmatter = Object.assign({}, frontmatter, parsed.data || {});
      // keep existing tags if any
      frontmatter.tags = parsed.data?.tags || frontmatter.tags;
      existingContent = parsed.content || existingContent;
    } catch (e) {
      // If parsing fails, we'll overwrite using a clean template
      existingContent = "# Entry\n\n";
    }
  }

  // Append the new exchange to the day's content. Use a visible separator for clarity.
  const newExchange = `\n\n---\n\n**You:** ${userMessage}\n\n**Agent:** ${agentReply}\n`;

  // Update summary with latest agent reply
  frontmatter.summary = agentReply.slice(0, 140);

  const finalContent = matter.stringify(existingContent + newExchange, frontmatter);

  await writeFileSafe(filePath, finalContent);
  await safeGitCommit(`journal: add/append entry ${frontmatter.id}`);

  return {
    id: frontmatter.id,
    user: userMessage,
    agent: agentReply
  };
}
