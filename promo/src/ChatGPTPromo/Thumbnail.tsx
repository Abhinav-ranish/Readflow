import { AbsoluteFill, Img, staticFile } from "remotion";

export const ChatGPTThumbnail: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily:
          "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Green ambient glow behind the screenshot */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: "50%",
          transform: "translateY(-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,163,127,0.15) 0%, rgba(16,163,127,0.03) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Left side — text */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 520,
        }}
      >
        {/* Readflow badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: "#10a37f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}
            >
              R
            </span>
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Readflow
          </span>
        </div>

        {/* Headline */}
        <div>
          <p
            style={{
              fontSize: 58,
              fontWeight: 300,
              color: "#e8e8e8",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Turn ChatGPT into a
          </p>
          <p
            style={{
              fontSize: 58,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            publishing tool
          </p>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: "#10a37f",
            borderRadius: 2,
            opacity: 0.8,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: "rgba(232,232,232,0.5)",
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          AI writes. Readflow shares.
        </p>
      </div>

      {/* Right side — result screenshot */}
      <div
        style={{
          position: "absolute",
          right: -30,
          top: "50%",
          transform: "translateY(-50%) perspective(1200px) rotateY(-6deg)",
          width: 680,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <Img
            src={staticFile("assets/chatgpt/07-chatgpt.png")}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
