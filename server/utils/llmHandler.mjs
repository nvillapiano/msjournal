import fetch from "node-fetch";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export async function queryLLM(prompt) {
  //
  // 1. Try Ollama (non-streaming)
  //
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false   // MUST be boolean, not string
      })
    });

    if (!response.ok) {
      console.warn("Ollama responded with non-OK status:", response.status);
      console.warn(await response.text());
      throw new Error("Ollama returned an error");
    }

    const data = await response.json();

    if (data && data.response) {
      return data.response.trim();
    } else {
      console.warn("Ollama returned no 'response' field:", data);
    }
  } catch (err) {
    console.warn("⚠️ Ollama request failed:", err.message);
  }

  //
  // 2. OpenAI fallback
  //
  if (OPENAI_API_KEY) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "You are a calm MS journaling companion." },
            { role: "user", content: prompt }
          ]
        })
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content?.trim() ??
        "No response from OpenAI.";
    } catch (err) {
      console.warn("OpenAI fallback failed:", err.message);
    }
  }

  //
  // 3. No LLM available
  //
  return "⚠️ No LLM backend available. You can still journal manually; entries will be saved.";
}