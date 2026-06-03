export default function VideoCard({ label, data }) {
  if (!data) return (
    <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 12, padding: 20, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
      Video {label} — not loaded yet
    </div>
  );

  return (
    <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase" }}>Video {label} · {data.platform}</div>
      {data.thumbnail && <img src={data.thumbnail} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 10, maxHeight: 160, objectFit: "cover" }} />}
      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{data.title}</div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>by {data.creator} · {data.follower_count?.toLocaleString()} followers</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[["Views", data.views?.toLocaleString()], ["Likes", data.likes?.toLocaleString()], ["Engagement", `${data.engagement_rate}%`]].map(([k, v]) => (
          <div key={k} style={{ background: "#f5f5f5", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#888" }}>{k}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}