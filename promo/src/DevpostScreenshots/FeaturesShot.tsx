import { AbsoluteFill } from "remotion";

const features = [
  {
    icon: ">_",
    title: "Agent-Native API",
    desc: "rf_ API keys for headless publish, update, delete. One curl to go live.",
    color: "#d9734a",
  },
  {
    icon: "\u21bb",
    title: "Version History",
    desc: "Every edit tracked. Full revision timeline. One-click restore.",
    color: "#e8944c",
  },
  {
    icon: "\u2726",
    title: "AI Built-in",
    desc: "Summarize, expand, translate, chat. OpenAI + Claude + Gemini.",
    color: "#f0b060",
  },
  {
    icon: "\u26bf",
    title: "Access Control",
    desc: "Passwords, expiring links, vanity URLs. No login wall for readers.",
    color: "#1f6feb",
  },
  {
    icon: "\u25ce",
    title: "Analytics",
    desc: "Per-doc views, unique visitors, trend graphs, referrer tracking.",
    color: "#58a6ff",
  },
  {
    icon: "\u2318",
    title: "Split-Pane Editor",
    desc: "Real-time Markdown preview. Syntax highlighting. Mobile-friendly.",
    color: "#8b949e",
  },
  {
    icon: "\u2699",
    title: "CLI Tool",
    desc: "readflow share README.md. Password + expiry flags. Auto-discovery.",
    color: "#c9d1d9",
  },
  {
    icon: "\u2601",
    title: "Custom Domains",
    desc: "CNAME-based setup. DNS verification. Bring your own domain.",
    color: "#a07050",
  },
];

export const FeaturesShot: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily:
          "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: 80,
      }}
    >
      {/* Glows */}
      <div
        style={{
          position: "absolute",
          left: -100,
          top: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -100,
          bottom: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(31,111,235,0.04) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: 50 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              backgroundColor: "#d9734a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>R</span>
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            Readflow
          </span>
        </div>
        <p
          style={{
            fontSize: 44,
            fontWeight: 300,
            color: "#f0ebe4",
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          Everything you need.{" "}
          <span style={{ fontWeight: 700, color: "#fff" }}>Nothing you don't.</span>
        </p>
      </div>

      {/* Feature grid — 4x2 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        {features.map((f) => (
          <div
            key={f.title}
            style={{
              width: "calc(25% - 15px)",
              padding: "28px 24px",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                backgroundColor: `${f.color}12`,
                border: `1px solid ${f.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 20, color: f.color }}>{f.icon}</span>
            </div>

            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              {f.title}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 400,
                color: "rgba(240,235,228,0.45)",
                lineHeight: 1.5,
              }}
            >
              {f.desc}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
