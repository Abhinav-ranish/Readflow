import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
  spring,
  useVideoConfig,
} from "remotion";

export const SceneResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 22], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const kenBurns = interpolate(frame, [0, 104], [0.9, 0.97], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const driftX = interpolate(frame, [0, 104], [3, -3], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const exitOpacity = interpolate(frame, [82, 104], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const captionSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 70, stiffness: 60, mass: 0.7 },
  });
  const captionOpacity = interpolate(frame, [18, 35], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const captionY = interpolate(captionSpring, [0, 1], [10, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Browser frame — asset is already clean, just show it */}
      <div
        style={{
          opacity,
          transform: `scale(${kenBurns}) translateX(${driftX}px)`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 50px 150px rgba(0,0,0,0.6), 0 0 100px rgba(217,115,74,0.04)",
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
              readflow.aranish.uk/s/8BcSQt8aSY
            </span>
          </div>
        </div>

        {/* Clean asset — no cropping needed */}
        <Img
          src={staticFile("assets/08-readflow-result.png")}
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
          top: 55,
          left: "50%",
          transform: `translateX(-50%) translateY(${captionY}px)`,
          opacity: captionOpacity,
        }}
      >
        <p
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "rgba(240,235,228,0.55)",
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
