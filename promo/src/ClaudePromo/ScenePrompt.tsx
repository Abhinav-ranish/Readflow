import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
  spring,
  useVideoConfig,
} from "remotion";

export const ScenePrompt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gentle fade in
  const imgOpacity = interpolate(frame, [0, 22], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Gentle slow zoom — just enough to feel alive, NOT aggressive
  const scale = interpolate(frame, [0, 74], [1.05, 1.12], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Soft exit
  const exitOpacity = interpolate(frame, [55, 74], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Label
  const labelSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 80, stiffness: 60, mass: 0.8 },
  });
  const labelOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const labelY = interpolate(labelSpring, [0, 1], [12, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Screenshot — centered on prompt area, gentle zoom */}
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          opacity: imgOpacity,
          boxShadow:
            "0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(217,115,74,0.06)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Img
          src={staticFile("assets/02-user-prompt.png")}
          style={{
            width: 1500,
            display: "block",
            transform: `scale(${scale})`,
            transformOrigin: "center 75%",
          }}
        />
      </div>

      {/* Floating label */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: `translateX(-50%) translateY(${labelY}px)`,
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            padding: "14px 36px",
            backgroundColor: "rgba(217,115,74,0.1)",
            borderRadius: 100,
            border: "1px solid rgba(217,115,74,0.2)",
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "#d9734a",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            One prompt. That's it.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
