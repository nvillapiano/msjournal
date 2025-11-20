const chatWindow = document.getElementById("chat-window");
const journalList = document.getElementById("journal-list");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");

init();

function init() {
  loadJournalList();
  attachFormBehavior();
}

async function loadJournalList() {
  try {
    const res = await fetch("/api/journal");
    const entries = await res.json();

    journalList.innerHTML = "";

    if (!entries.length) {
      journalList.innerHTML =
        '<div class="msj-entry__meta">No entries yet. Your first message will create one.</div>';
      return;
    }

    for (const entry of entries) {
      const el = document.createElement("button");
      el.className = "msj-entry";
      el.innerHTML = `
        <div class="msj-entry__title">${escapeHtml(
          entry.summary || entry.title || entry.id
        )}</div>
        <div class="msj-entry__meta">
          ${entry.date || "no date"} ${
        entry.tags && entry.tags.length
          ? "• " + entry.tags.slice(0, 3).join(", ")
          : ""
      }
        </div>
      `;
      el.addEventListener("click", () => loadEntry(entry.id));
      journalList.appendChild(el);
    }
  } catch (err) {
    console.error("Failed to load journal:", err);
    journalList.innerHTML =
      '<div class="msj-entry__meta">Error loading archive.</div>';
  }
}

async function loadEntry(id) {
  try {
    const res = await fetch(`/api/journal/${encodeURIComponent(id)}`);
    if (!res.ok) return;

    const entry = await res.json();
    chatWindow.innerHTML = "";

    const block = document.createElement("div");
    block.className = "msj-message msj-message--agent";
    block.innerHTML = `<strong>${entry.date || ""}</strong><br><br>${escapeHtml(
      entry.body || ""
    ).replace(/\n/g, "<br>")}`;
    chatWindow.appendChild(block);
    scrollChatToBottom();
  } catch (err) {
    console.error("Failed to load entry:", err);
  }
}

function attachFormBehavior() {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    input.value = "";

    const typingEl = showTypingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();
      typingEl.remove();

      if (data.error) {
        appendMessage(
          "Something went wrong saving this entry. Try again.",
          "agent"
        );
      } else {
        appendMessage(data.agent, "agent");
        loadJournalList();
      }
    } catch (err) {
      console.error(err);
      typingEl.remove();
      appendMessage(
        "Unable to reach the local journal agent. Is the server running?",
        "agent"
      );
    } finally {
      scrollChatToBottom();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  });
}

function appendMessage(text, role) {
  const el = document.createElement("div");
  el.className =
    "msj-message " +
    (role === "user" ? "msj-message--user" : "msj-message--agent");
  el.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
  chatWindow.appendChild(el);
  scrollChatToBottom();
}

function showTypingIndicator() {
  const el = document.createElement("div");
  el.className = "msj-message msj-message--agent";
  el.innerHTML = `
    <div class="msj-typing">
      <div class="msj-typing__dot"></div>
      <div class="msj-typing__dot"></div>
      <div class="msj-typing__dot"></div>
    </div>
  `;
  chatWindow.appendChild(el);
  scrollChatToBottom();
  return el;
}

function scrollChatToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
