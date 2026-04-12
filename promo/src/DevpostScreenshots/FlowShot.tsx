import { AbsoluteFill } from "remotion";

const steps = [
  {
    num: "01",
    title: "Agent generates content",
    desc: "CI pipeline, chatbot, or script produces Markdown output",
    icon: "\u2726",
  },
  {
    num: "02",
    title: "One API call to Readflow",
    desc: "POST /api/share with Bearer rf_ token. That's it.",
    icon: ">_",
  },
  {
    num: "03",
    title: "Live URL with superpowers",
    desc: "Versioned, password-protected, analytics-tracked, AI-enhanced",
    icon: "\u26a1",
  },
  {
    num: "04",
    title: "Context persists",
    desc: "Every revision stored. Agents build knowledge over time.",
    icon: "\u221e",
  },
];

const Arrow: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 60,
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: 40,
        height: 2,
        backgroundColor: "rgba(217,115,74,0.3)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -1,
          top: -5,
          width: 0,
          height: 0,
          borderLeft: "8px solid rgba(217,115,74,0.3)",
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
        }}
      />
    </div>
  </div>
);

export const FlowShot: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily:
          "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 60,
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 48,
              fontWeight: 300,
              color: "#f0ebe4",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            How it{" "}
            <span style={{ fontWeight: 700, color: "#fff" }}>works</span>
          </p>
          <p
            style={{
              fontSize: 20,
              color: "rgba(240,235,228,0.35)",
              marginTop: 12,
            }}
          >
            From agent output to persistent, shareable knowledge in seconds
          </p>
        </div>

        {/* Flow — horizontal cards with arrows */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{ display: "flex", alignItems: "center" }}
            >
              <div
                style={{
                  width: 260,
                  padding: "32px 28px",
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Top accent */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, #d9734a, ${i === 3 ? "#1f6feb" : "#e8944c"})`,
                    opacity: 0.6,
                    borderRadius: "3px 3px 0 0",
                  }}
                />

                {/* Step number */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#d9734a",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Step {step.num}
                </span>

                {/* Icon */}
                <span style={{ fontSize: 32 }}>{step.icon}</span>

                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </span>

                <span
                  style={{
                    fontSize: 15,
                    color: "rgba(240,235,228,0.4)",
                    lineHeight: 1.5,
                  }}
                >
                  {step.desc}
                </span>
              </div>

              {i < steps.length - 1 && <Arrow />}
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#d9734a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
              R
            </span>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: "rgba(240,235,228,0.35)",
              letterSpacing: "0.02em",
            }}
          >
            Not RAG. The <strong style={{ color: "#f0ebe4", fontWeight: 600 }}>write side</strong> of the context problem.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
