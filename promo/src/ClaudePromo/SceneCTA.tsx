import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tagline entrance
  const taglineSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 50, stiffness: 80, mass: 0.6 },
  });
  const taglineOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [25, 0]);

  // Subtext
  const subOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Logo / wordmark
  const logoSpring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 40, stiffness: 80, mass: 0.5 },
  });
  const logoOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.9, 1]);

  // Accent line
  const lineWidth = spring({
    frame: frame - 25,
    fps,
    config: { damping: 60, stiffness: 100, mass: 0.5 },
  });

  // Warm glow
  const glowOpacity = interpolate(frame, [20, 60], [0, 0.35], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Final fade out (last 10 frames)
  const exitOpacity = interpolate(frame, [120, 134], [1, 0.85], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.06) 0%, transparent 70%)",
          opacity: glowOpacity,
          filter: "blur(80px)",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Readflow wordmark */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Simple "R" mark */}
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
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                R
              </span>
            </div>
            <span
              style={{
                fontSize: 42,
                fontWeight: 600,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Readflow
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 56,
              fontWeight: 300,
              color: "#f0ebe4",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Your AI writes.
          </p>
          <p
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Readflow shares.
          </p>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth * 80,
            height: 2,
            backgroundColor: "#d9734a",
            marginTop: 40,
            opacity: 0.6,
            borderRadius: 1,
          }}
        />

        {/* URL */}
        <div
          style={{
            opacity: subOpacity,
            marginTop: 35,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: "rgba(240,235,228,0.45)",
              letterSpacing: "0.06em",
            }}
          >
            readflow.aranish.uk
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
