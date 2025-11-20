import fetch from "node-fetch";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export async function queryLLM(prompt) {
  // 1. Try Ollama first (local, no external dependency)
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.response) return data.response.trim();
    } else {
      console.warn("Ollama response not ok:", await response.text());
    }
  } catch (err) {
    console.warn("Ollama not available:", err.message);
  }

  // 2. OpenAI fallback
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a calm, practical journaling companion helping a person track MS-related symptoms, routines, and emotions. Be concise and grounded."
              },
              { role: "user", content: prompt }
            ]
          })
        }
      );

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || "No response from OpenAI.";
      return content.trim();
    } catch (err) {
      console.warn("OpenAI fallback failed:", err.message);
    }
  }

  // 3. Last resort
  return "⚠️ No LLM backend available. You can still journal manually; entries will be saved.";
}
