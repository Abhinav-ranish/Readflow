import { AbsoluteFill } from "remotion";

const lines = [
  { prompt: true, text: "# Authenticate (opens browser)" },
  { prompt: false, text: "readflow login", color: "#79c0ff" },
  { prompt: false, text: "" },
  { prompt: true, text: "# Share a doc from your agent or pipeline" },
  {
    prompt: false,
    text: 'readflow share ./docs/changelog.md --expiry 7d',
    color: "#79c0ff",
  },
  { prompt: false, text: "" },
  { prompt: true, text: "# Or use the API directly" },
  {
    prompt: false,
    text: "curl -X POST https://readflow.aranish.uk/api/share \\",
    color: "#79c0ff",
  },
  {
    prompt: false,
    text: '  -H "Authorization: Bearer rf_your_api_key" \\',
    color: "#a5d6ff",
  },
  {
    prompt: false,
    text: '  -H "Content-Type: application/json" \\',
    color: "#a5d6ff",
  },
  {
    prompt: false,
    text: `  -d '{"content": "# Hello from my agent", "title": "Agent Output"}'`,
    color: "#a5d6ff",
  },
  { prompt: false, text: "" },
  {
    prompt: true,
    text: "\u2713 Published to https://readflow.aranish.uk/p/agent-output",
    success: true,
  },
];

export const CLIShot: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily:
          "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Warm glow behind terminal */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          width: "100%",
          maxWidth: 1100,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 44,
              fontWeight: 300,
              color: "#f0ebe4",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            One command to{" "}
            <span style={{ fontWeight: 700, color: "#fff" }}>publish</span>
          </p>
          <p
            style={{
              fontSize: 20,
              color: "rgba(240,235,228,0.4)",
              marginTop: 12,
            }}
          >
            CLI + API \u2014 built for agents, pipelines, and developers
          </p>
        </div>

        {/* Terminal window */}
        <div
          style={{
            width: "100%",
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#161b22",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 20px",
              backgroundColor: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#febc2e",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#28c840",
              }}
            />
            <span
              style={{
                marginLeft: 12,
                fontSize: 14,
                color: "rgba(240,235,228,0.35)",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              terminal \u2014 readflow
            </span>
          </div>

          {/* Code content */}
          <div
            style={{
              padding: "24px 28px",
              fontFamily: "'SF Mono', 'Fira Code', 'Menlo', monospace",
              fontSize: 17,
              lineHeight: 1.7,
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ display: "flex", minHeight: 28 }}>
                {line.prompt && !line.success ? (
                  <span style={{ color: "rgba(139,148,158,0.5)" }}>
                    {line.text}
                  </span>
                ) : line.success ? (
                  <span style={{ color: "#3fb950", fontWeight: 500 }}>
                    {line.text}
                  </span>
                ) : line.text ? (
                  <>
                    <span style={{ color: "#d9734a", marginRight: 10 }}>$</span>
                    <span style={{ color: line.color || "#c9d1d9" }}>
                      {line.text}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
