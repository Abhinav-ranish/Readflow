import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  Img,
  staticFile,
  useVideoConfig,
} from "remotion";

export const SceneResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const kenBurns = interpolate(frame, [0, 104], [0.88, 0.95], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const driftX = interpolate(frame, [0, 104], [5, -5], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const exitOpacity = interpolate(frame, [85, 104], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const captionOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const captionY = spring({
    frame: frame - 20,
    fps,
    config: { damping: 50, stiffness: 100, mass: 0.5 },
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
      {/* Browser frame */}
      <div
        style={{
          opacity,
          transform: `scale(${kenBurns}) translateX(${driftX}px)`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 50px 150px rgba(0,0,0,0.6), 0 0 100px rgba(16,163,127,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Fake browser bar */}
        <div
          style={{
            height: 44,
            backgroundColor: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            paddingRight: 16,
            gap: 8,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
          <div
            style={{
              flex: 1,
              marginLeft: 16,
              height: 28,
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "monospace",
              }}
            >
              readflow.aranish.uk/s/8NJ-qfw3kU
            </span>
          </div>
        </div>

        {/* Image — shown directly, no cropping */}
        <Img
          src={staticFile("assets/chatgpt/07-chatgpt.png")}
          style={{
            width: 1400,
            display: "block",
          }}
        />
      </div>

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: `translateX(-50%) translateY(${interpolate(captionY, [0, 1], [10, 0])}px)`,
          opacity: captionOpacity,
        }}
      >
        <p
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "rgba(232,232,232,0.55)",
            letterSpacing: "0.03em",
            margin: 0,
          }}
        >
          From thought to published flow.
        </p>
      </div>
    </AbsoluteFill>
  );
};
