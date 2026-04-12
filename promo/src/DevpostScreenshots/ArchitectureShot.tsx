import { AbsoluteFill } from "remotion";

const layers = [
  {
    icon: ">_",
    name: "API + CLI",
    desc: "Agent-native CRUD interface with rf_ API keys for headless access",
    color: "#d9734a",
  },
  {
    icon: "\u21bb",
    name: "Version Engine",
    desc: "Full edit timeline with one-click restore across agent sessions",
    color: "#e8944c",
  },
  {
    icon: "\u2726",
    name: "AI Assistant",
    desc: "Summarize, expand, translate, chat \u2014 multi-provider comprehension",
    color: "#f0b060",
  },
  {
    icon: "\u26bf",
    name: "Access Control",
    desc: "Passwords, expiry, vanity URLs \u2014 context governance without login walls",
    color: "#c0865a",
  },
  {
    icon: "\u25ce",
    name: "Analytics",
    desc: "Per-doc views, unique visitors, referrers \u2014 context observability",
    color: "#a07050",
  },
];

export const ArchitectureShot: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily:
          "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: 80,
      }}
    >
      {/* Subtle glow */}
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Header */}
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
          fontSize: 48,
          fontWeight: 300,
          color: "#f0ebe4",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          margin: "0 0 8px 0",
        }}
      >
        The Architecture
      </p>
      <p
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: "rgba(240,235,228,0.35)",
          margin: "0 0 50px 0",
        }}
      >
        Five layers that turn agent output into durable, shareable knowledge
      </p>

      {/* Layer cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {layers.map((layer, i) => (
          <div
            key={layer.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "22px 30px",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.06)`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Left accent bar */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: layer.color,
                borderRadius: "4px 0 0 4px",
                opacity: 0.8,
              }}
            />

            {/* Icon circle */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                backgroundColor: `${layer.color}15`,
                border: `1px solid ${layer.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  color: layer.color,
                  fontWeight: 600,
                }}
              >
                {layer.icon}
              </span>
            </div>

            {/* Text */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                }}
              >
                {layer.name}
              </span>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 400,
                  color: "rgba(240,235,228,0.5)",
                  lineHeight: 1.4,
                }}
              >
                {layer.desc}
              </span>
            </div>

            {/* Layer number */}
            <span
              style={{
                position: "absolute",
                right: 30,
                fontSize: 48,
                fontWeight: 700,
                color: "rgba(255,255,255,0.04)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
