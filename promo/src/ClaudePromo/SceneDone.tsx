import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
  spring,
  useVideoConfig,
} from "remotion";

export const SceneDone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Gentle zoom
  const zoomProgress = interpolate(frame, [10, 65], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const finalScale = interpolate(zoomProgress, [0, 1], [0.82, 0.92]);
  const panY = interpolate(zoomProgress, [0, 1], [0, -30]);

  // "Shared. Automatically." at BOTTOM
  const textSpring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 60, stiffness: 70, mass: 0.7 },
  });
  const textOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const textY = interpolate(textSpring, [0, 1], [15, 0]);

  const exitOpacity = interpolate(frame, [72, 89], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
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
      {/* Screenshot — no orange highlight line */}
      <div
        style={{
          transform: `scale(${finalScale}) translateY(${panY}px)`,
          opacity,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(217,115,74,0.06)",
        }}
      >
        <Img
          src={staticFile("assets/07-claude-done.png")}
          style={{
            width: 1500,
            display: "block",
          }}
        />
      </div>

      {/* Text at BOTTOM */}
      <div
        style={{
          position: "absolute",
          bottom: 55,
          left: "50%",
          transform: `translateX(-50%) translateY(${textY}px)`,
          opacity: textOpacity,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 46,
            fontWeight: 500,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          Shared.{" "}
          <span style={{ color: "#d9734a" }}>Automatically.</span>
        </p>
      </div>
    </AbsoluteFill>
  );
};
