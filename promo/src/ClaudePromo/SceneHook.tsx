import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slower, softer text fade in
  const textOpacity = interpolate(frame, [8, 35], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Gentle upward drift
  const textY = interpolate(frame, [8, 40], [18, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Warm glow breathes in and out
  const glowOpacity = interpolate(frame, [20, 55, 80], [0, 0.5, 0.2], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const glowScale = interpolate(frame, [20, 80], [0.8, 1.1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Softer exit — longer crossfade
  const exitOpacity = interpolate(frame, [65, 89], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Accent line — gentler spring
  const lineWidth = spring({
    frame: frame - 25,
    fps,
    config: { damping: 100, stiffness: 60, mass: 0.8 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Warm glow — breathes */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,115,74,0.1) 0%, rgba(217,115,74,0.02) 50%, transparent 70%)",
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
          filter: "blur(70px)",
        }}
      />

      {/* Main hook text */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 64,
            fontWeight: 300,
            color: "#f0ebe4",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          Your AI just learned
        </p>
        <p
          style={{
            fontSize: 64,
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          something new.
        </p>

        {/* Accent line — slower, warmer */}
        <div
          style={{
            width: lineWidth * 120,
            height: 2,
            backgroundColor: "#d9734a",
            margin: "30px auto 0",
            opacity: 0.6,
            borderRadius: 1,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
