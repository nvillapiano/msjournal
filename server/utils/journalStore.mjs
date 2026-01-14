import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { v4 as uuidv4 } from "uuid";

import {
  ensureJournalDir,
  getJournalDir,
  writeFileSafe,
  readFileSafe
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
    // Use safe reader to avoid throwing on a single bad file
    const raw = await readFileSafe(fullPath);
    if (!raw) {
      console.warn('Skipping unreadable journal file:', fullPath);
      continue;
    }

    let parsed;
    try {
      parsed = matter(raw);
    } catch (e) {
      console.warn('Failed to parse frontmatter for', fullPath, e.message);
      continue;
    }

    // Normalize date: YAML parsers may return a Date object; convert to YYYY-MM-DD string when possible
    let rawDate = parsed.data.date ?? null;
    let dateStr = null;
    if (rawDate) {
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().slice(0, 10);
      } else {
        dateStr = String(rawDate);
      }
    }

    entries.push({
      id: file.replace(".md", ""),
      file,
      date: dateStr,
      tags: parsed.data.tags || [],
      summary: parsed.data.summary || "",
      title: parsed.data.title || file
    });
  }

  // Sort newest -> oldest, treating missing dates as empty strings
  entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return entries;
}

export async function getEntryById(id) {
  await ensureJournalDir();
  const dir = getJournalDir();
  const file = `${id}.md`;
  const fullPath = path.join(dir, file);

  const raw = await readFileSafe(fullPath);
  if (!raw) return null;
  try {
    const parsed = matter(raw);
    return {
      id,
      ...parsed.data,
      body: parsed.content
    };
  } catch (e) {
    console.warn('Failed to parse entry', fullPath, e.message);
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

  // Attempt to generate concise tags for this entry via the LLM.
  // The LLM should return a JSON array like ["fatigue","mood"] or a comma-separated list.
  let llmTags = [];
  try {
    const tagPrompt = `Suggest up to 6 short tags (1-2 words each) for this journal entry. Return only a JSON array of tags.\n\nEntry:\n${userMessage}`;
    const tagResp = await queryLLM(tagPrompt);
    if (tagResp && !tagResp.startsWith('⚠️')) {
      try {
        const parsed = JSON.parse(tagResp);
        if (Array.isArray(parsed)) llmTags = parsed.map(t => String(t).toLowerCase().trim());
      } catch (e) {
        // fallback: split by commas/newlines
        llmTags = String(tagResp).split(/,|\n/).map(t => t.trim().toLowerCase()).filter(Boolean);
      }
      // normalize and dedupe
      llmTags = Array.from(new Set(llmTags)).slice(0, 8);
    }
  } catch (e) {
    console.warn('Tagging LLM call failed:', e.message);
  }

  // LLM-only weather inference: ask the LLM to infer a one-line weather summary
  // from the user's message. Avoid external APIs per user preference.
  let weatherSummary = '';
  try {
    const weatherPrompt = `Provide a one-line weather summary inferred from this journal entry. If the entry does not mention weather or there's insufficient information, reply with the single word "Unknown". Return only the one-line summary.\n\nEntry:\n${userMessage}`;
    const weatherResp = await queryLLM(weatherPrompt);
    if (weatherResp && !weatherResp.startsWith('⚠️')) {
      weatherSummary = String(weatherResp).split(/\r?\n/)[0].trim();
      if (/^unknown$/i.test(weatherSummary)) weatherSummary = '';
    }
  } catch (e) {
    console.warn('Weather LLM call failed:', e.message);
  }

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
      // merge any LLM-suggested tags, preserving existing ones
      if (llmTags && llmTags.length) {
        const merged = Array.from(new Set([...(frontmatter.tags || []), ...llmTags]));
        frontmatter.tags = merged.slice(0, 12);
      }
      // preserve existing weather if present
      if (parsed.data?.weather) {
        frontmatter.weather = parsed.data.weather;
      }
      existingContent = parsed.content || existingContent;
    } catch (e) {
      // If parsing fails, we'll overwrite using a clean template
      existingContent = "# Entry\n\n";
    }
  }

  // Append the new exchange to the day's content. Use a visible separator for clarity.
  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const ts = timeNow();
  const newExchange = `\n\n---\n\n### ${ts}\n\n**You:** ${userMessage}\n\n**Agent:** ${agentReply}\n`;

  // Update summary with latest agent reply
  frontmatter.summary = agentReply.slice(0, 140);
  // If there were LLM tags generated and no existing tags were present, apply them
  if ((!frontmatter.tags || !frontmatter.tags.length) && llmTags && llmTags.length) {
    frontmatter.tags = llmTags.slice(0, 12);
  }
  // If there is no existing weather in frontmatter, use the LLM-inferred summary
  if ((!frontmatter.weather || !String(frontmatter.weather).trim()) && weatherSummary) {
    frontmatter.weather = weatherSummary;
  }

  const finalContent = matter.stringify(existingContent + newExchange, frontmatter);

  await writeFileSafe(filePath, finalContent);
  await safeGitCommit(`journal: add/append entry ${frontmatter.id}`);

  return {
    id: frontmatter.id,
    user: userMessage,
    agent: agentReply
  };
}
