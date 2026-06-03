import { useState } from "react";
import VideoCard from "./VideoCard";
import ChatPanel from "./ChatPanel";
import { ingestVideos } from "./api";

export default function App() {
  const [ytUrl, setYtUrl] = useState("");
  const [igUrl, setIgUrl] = useState("");
  const [videos, setVideos] = useState({ A: null, B: null });
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  async function handleIngest() {
    setLoading(true);
    try {
      const data = await ingestVideos(ytUrl, igUrl);
      setVideos({ A: data.video_a, B: data.video_b });
      setReady(true);
    } catch (e) {
      alert("Error processing videos: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Creator RAG Analyzer</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Compare two videos using AI-powered analysis</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="YouTube URL (Video A)" style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
        <input value={igUrl} onChange={e => setIgUrl(e.target.value)} placeholder="Instagram Reel URL (Video B)" style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
        <button onClick={handleIngest} disabled={loading || !ytUrl || !igUrl} style={{ padding: "10px 24px", borderRadius: 8, background: "#0066ff", color: "white", border: "none", cursor: "pointer", fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Processing..." : "Analyze"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <VideoCard label="A" data={videos.A} />
        <VideoCard label="B" data={videos.B} />
      </div>

      {ready && <ChatPanel />}
      {!ready && <div style={{ textAlign: "center", padding: 40, color: "#888", border: "1px dashed #ddd", borderRadius: 12 }}>Enter two video URLs above and click Analyze to start chatting</div>}
    </div>
  );
}