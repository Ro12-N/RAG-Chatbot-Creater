import { useState, useRef } from "react";
import { streamChat } from "./api";

const SESSION_ID = "session_" + Math.random().toString(36).slice(2);

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const question = input;
    setInput("");
    setMessages(m => [...m, { role: "user", content: question }]);
    setLoading(true);

    let assistantMsg = { role: "assistant", content: "", citations: [] };
    setMessages(m => [...m, assistantMsg]);

    await streamChat(
      question,
      SESSION_ID,
      (token) => {
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: updated[updated.length - 1].content + token };
          return updated;
        });
      },
      () => setLoading(false),
      (citations) => {
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = { ...updated[updated.length - 1], citations };
          return updated;
        });
      }
    );

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const SUGGESTED = [
    "Why did Video A get more engagement than Video B?",
    "Compare the hooks in the first 5 seconds",
    "Suggest improvements for Video B based on Video A",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 500, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 500 }}>Chat with your videos</div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && SUGGESTED.map(s => (
          <button key={s} onClick={() => { setInput(s); }} style={{ textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 13 }}>{s}</button>
        ))}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            <div style={{ background: m.role === "user" ? "#0066ff" : "#f0f0f0", color: m.role === "user" ? "white" : "black", padding: "10px 14px", borderRadius: 12, fontSize: 14, whiteSpace: "pre-wrap" }}>{m.content}{loading && i === messages.length - 1 && m.role === "assistant" && <span style={{ opacity: 0.5 }}>▋</span>}</div>
            {m.citations?.length > 0 && (
              <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {m.citations.map((c, ci) => (
                  <span key={ci} style={{ fontSize: 10, background: "#e8f0fe", color: "#1a56db", padding: "2px 6px", borderRadius: 4 }}>Video {c.video_id} chunk {c.chunk_index}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask about your videos..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
        <button onClick={sendMessage} disabled={loading} style={{ padding: "10px 18px", borderRadius: 8, background: "#0066ff", color: "white", border: "none", cursor: "pointer", fontWeight: 500 }}>Send</button>
      </div>
    </div>
  );
}