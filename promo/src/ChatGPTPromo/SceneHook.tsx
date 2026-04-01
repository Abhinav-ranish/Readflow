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

  const textOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const textY = interpolate(frame, [10, 35], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const glowOpacity = interpolate(frame, [30, 60, 80], [0, 0.4, 0.15], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const exitOpacity = interpolate(frame, [70, 89], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const lineWidth = spring({
    frame: frame - 20,
    fps,
    config: { damping: 80, stiffness: 100, mass: 0.5 },
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
      {/* OpenAI green glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,163,127,0.08) 0%, transparent 70%)",
          opacity: glowOpacity,
          filter: "blur(60px)",
        }}
      />

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
            color: "#e8e8e8",
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

        {/* Green accent line */}
        <div
          style={{
            width: lineWidth * 120,
            height: 2,
            backgroundColor: "#10a37f",
            margin: "30px auto 0",
            opacity: 0.7,
            borderRadius: 1,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
