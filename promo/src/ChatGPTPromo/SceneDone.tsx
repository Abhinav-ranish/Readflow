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

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const zoomProgress = interpolate(frame, [12, 60], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const finalScale = interpolate(zoomProgress, [0, 1], [0.82, 0.92]);
  const panY = interpolate(zoomProgress, [0, 1], [0, -30]);

  const textSpring = spring({
    frame: frame - 32,
    fps,
    config: { damping: 50, stiffness: 90, mass: 0.5 },
  });
  const textOpacity = interpolate(frame, [32, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const textY = interpolate(textSpring, [0, 1], [15, 0]);

  const exitOpacity = interpolate(frame, [75, 89], [1, 0], {
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
      {/* Screenshot — no highlight overlay */}
      <div
        style={{
          transform: `scale(${finalScale}) translateY(${panY}px)`,
          opacity,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(16,163,127,0.05)",
        }}
      >
        <Img
          src={staticFile("assets/chatgpt/06-chatgpt.png")}
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
          <span style={{ color: "#10a37f" }}>Automatically.</span>
        </p>
      </div>
    </AbsoluteFill>
  );
};
