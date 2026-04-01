import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
  spring,
  useVideoConfig,
} from "remotion";

const SCREENSHOTS = [
  { file: "chatgpt/03-chatgpt.png", label: "Thinking", frames: [0, 55] },
  { file: "chatgpt/04-chatgpt.png", label: "Exploring", frames: [55, 110] },
  { file: "chatgpt/05-chatgpt.png", label: "Sharing", frames: [110, 165] },
];

export const SceneWorking: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIndex = SCREENSHOTS.findIndex(
    (s) => frame >= s.frames[0] && frame < s.frames[1],
  );
  const active = activeIndex >= 0 ? activeIndex : SCREENSHOTS.length - 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0d0d",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Screenshot stack */}
      {SCREENSHOTS.map((shot, i) => {
        const isActive = i === active;
        const isPast = i < active;
        const isFuture = i > active;

        const localFrame = frame - shot.frames[0];
        const enterProgress = spring({
          frame: Math.max(0, localFrame),
          fps,
          config: { damping: 40, stiffness: 100, mass: 0.6 },
        });

        const slideX = isFuture
          ? 300
          : interpolate(enterProgress, [0, 1], [300, 0]);
        const opacity = isPast
          ? interpolate(
              frame,
              [shot.frames[1] - 8, shot.frames[1]],
              [1, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
            )
          : isFuture
            ? 0
            : interpolate(enterProgress, [0, 1], [0, 1]);

        const floatY = isActive
          ? Math.sin((frame - shot.frames[0]) * 0.08) * 3
          : 0;

        return (
          <div
            key={shot.file}
            style={{
              position: "absolute",
              transform: `translateX(${slideX}px) translateY(${floatY}px) scale(0.78)`,
              opacity,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(16,163,127,0.04)",
            }}
          >
            <Img
              src={staticFile(`assets/${shot.file}`)}
              style={{
                width: 1500,
                display: "block",
              }}
            />
          </div>
        );
      })}

      {/* Status label */}
      {SCREENSHOTS.map((shot, i) => {
        if (i !== active) return null;

        const localFrame = frame - shot.frames[0];
        const labelOpacity = interpolate(localFrame, [5, 15], [0, 1], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });

        return (
          <div
            key={`label-${shot.label}`}
            style={{
              position: "absolute",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: labelOpacity,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#10a37f",
                opacity: 0.5 + Math.sin(frame * 0.15) * 0.5,
              }}
            />
            <span
              style={{
                fontSize: 28,
                fontWeight: 400,
                color: "rgba(232,232,232,0.7)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {shot.label}...
            </span>
          </div>
        );
      })}

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
        }}
      >
        {SCREENSHOTS.map((_, i) => (
          <div
            key={`dot-${i}`}
            style={{
              width: i <= active ? 32 : 8,
              height: 4,
              borderRadius: 2,
              backgroundColor:
                i <= active ? "#10a37f" : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
