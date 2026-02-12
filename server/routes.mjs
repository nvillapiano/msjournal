import express from "express";
import {
  listEntries,
  getEntryById,
  appendExchange,
  searchEntries
} from "./utils/journalStore.mjs";

const router = express.Router();

router.get("/journal", async (req, res) => {
  try {
    const entries = await listEntries();
    console.info(`/api/journal -> returning ${entries.length} entries`);
    res.json(entries);
  } catch (err) {
    console.error("Error listing entries:", err);
    res.status(500).json({ error: "Failed to list entries" });
  }
});

router.get("/journal/:id", async (req, res) => {
  try {
    const entry = await getEntryById(req.params.id);
    if (!entry) return res.status(404).json({ error: "Not found" });
    res.json(entry);
  } catch (err) {
    console.error("Error loading entry:", err);
    res.status(500).json({ error: "Failed to load entry" });
  }
});

router.get("/journal/search", async (req, res) => {
  try {
    const { q = "", tags = "", dateFrom, dateTo } = req.query;
    const tagArray = tags ? tags.split(",").map(t => t.trim().toLowerCase()) : [];
    
    const results = await searchEntries(q, {
      tags: tagArray,
      dateFrom,
      dateTo
    });
    
    console.info(`/api/journal/search -> found ${results.length} results for "${q}"`);
    res.json(results);
  } catch (err) {
    console.error("Error in /journal/search:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Empty message" });
    }
    const payload = await appendExchange(message.trim());
    res.json(payload);
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

export { router };
