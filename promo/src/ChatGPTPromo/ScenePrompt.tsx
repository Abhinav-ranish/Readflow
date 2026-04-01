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

  const imgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Gentle slow zoom centered on prompt area
  const scale = interpolate(frame, [0, 74], [1.05, 1.12], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const exitOpacity = interpolate(frame, [58, 74], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const labelOpacity = interpolate(frame, [22, 38], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const labelSpring = spring({
    frame: frame - 22,
    fps,
    config: { damping: 60, stiffness: 80, mass: 0.6 },
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
      {/* Screenshot — gentle zoom toward prompt area */}
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          opacity: imgOpacity,
          boxShadow:
            "0 40px 120px rgba(0,0,0,0.6), 0 0 60px rgba(16,163,127,0.05)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Img
          src={staticFile("assets/chatgpt/01-chatgpt.png")}
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
            backgroundColor: "rgba(16,163,127,0.1)",
            borderRadius: 100,
            border: "1px solid rgba(16,163,127,0.25)",
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "#10a37f",
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
