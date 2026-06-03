const BASE = import.meta.env.VITE_API_BASE_URL || "https://rag-chatbot-api.onrender.com";

export async function ingestVideos(youtubeUrl, instagramUrl) {
  const res = await fetch(`${BASE}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: youtubeUrl, instagram_url: instagramUrl }),
  });
  return res.json();
}

export async function streamChat(question, sessionId, onToken, onDone, onCitations) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id: sessionId }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      const data = line.replace("data: ", "");
      if (data === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "token") onToken(parsed.content);
        if (parsed.type === "citations") onCitations(parsed.content);
      } catch (err) {
        console.warn("Failed to parse stream line:", err);
      }
    }
  }
}
