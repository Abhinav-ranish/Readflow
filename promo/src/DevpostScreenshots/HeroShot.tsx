import { AbsoluteFill } from "remotion";

const Badge: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: "#d9734a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>R</span>
    </div>
    <span
      style={{
        fontSize: 38,
        fontWeight: 600,
        color: "#ffffff",
        letterSpacing: "-0.02em",
      }}
    >
      Readflow
    </span>
  </div>
);

export const HeroShot: React.FC = () => {
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
      {/* Warm glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.08) 0%, rgba(217,115,74,0.02) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Secondary blue glow */}
      <div
        style={{
          position: "absolute",
          left: -200,
          bottom: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(31,111,235,0.06) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        <Badge />

        <div style={{ height: 60 }} />

        <p
          style={{
            fontSize: 72,
            fontWeight: 300,
            color: "#f0ebe4",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: 0,
            textAlign: "center",
          }}
        >
          The Knowledge Layer
        </p>
        <p
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: 0,
            textAlign: "center",
          }}
        >
          Your Agents Are Missing
        </p>

        {/* Accent line */}
        <div
          style={{
            width: 100,
            height: 3,
            backgroundColor: "#d9734a",
            marginTop: 45,
            borderRadius: 2,
            opacity: 0.7,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(240,235,228,0.45)",
            letterSpacing: "0.02em",
            marginTop: 30,
            textAlign: "center",
          }}
        >
          Agents write. Readflow publishes, versions, and shares.
        </p>

        {/* Pill tags */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 45,
          }}
        >
          {["API + CLI", "Version History", "AI Built-in", "Access Control", "Analytics"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  padding: "10px 22px",
                  borderRadius: 100,
                  border: "1px solid rgba(217,115,74,0.25)",
                  backgroundColor: "rgba(217,115,74,0.06)",
                  color: "rgba(240,235,228,0.6)",
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                {tag}
              </div>
            ),
          )}
        </div>

        {/* URL */}
        <p
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: "rgba(240,235,228,0.3)",
            letterSpacing: "0.06em",
            marginTop: 50,
          }}
        >
          readflow.aranish.uk
        </p>
      </div>
    </AbsoluteFill>
  );
};
