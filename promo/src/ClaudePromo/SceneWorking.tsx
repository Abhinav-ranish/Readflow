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
  { file: "03-claude-writing.png", label: "Writing", frames: [0, 40] },
  { file: "04-claude-fetching.png", label: "Discovering", frames: [40, 80] },
  { file: "05-claude-researching.png", label: "Researching", frames: [80, 120] },
  { file: "06-claude-executing.png", label: "Sharing", frames: [120, 165] },
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
      {/* Warm ambient glow that follows the action */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(217,115,74,0.04) 0%, transparent 70%)",
          opacity: 0.6,
          filter: "blur(60px)",
        }}
      />

      {/* Screenshot stack — softer crossfade transitions */}
      {SCREENSHOTS.map((shot, i) => {
        const isPast = i < active;
        const isFuture = i > active;
        const isActive = i === active;

        const localFrame = frame - shot.frames[0];

        // Softer spring — higher damping, lower stiffness for Claude
        const enterProgress = spring({
          frame: Math.max(0, localFrame),
          fps,
          config: { damping: 60, stiffness: 60, mass: 0.8 },
        });

        // Gentler slide — less distance, more fade-based
        const slideX = isFuture
          ? 150
          : interpolate(enterProgress, [0, 1], [150, 0]);

        // Longer crossfade overlap (12 frames instead of 8)
        const opacity = isPast
          ? interpolate(
              frame,
              [shot.frames[1] - 12, shot.frames[1]],
              [1, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
            )
          : isFuture
            ? 0
            : interpolate(enterProgress, [0, 1], [0, 1]);

        // Gentle breathing float
        const floatY = isActive
          ? Math.sin((frame - shot.frames[0]) * 0.06) * 4
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
                "0 30px 80px rgba(0,0,0,0.5), 0 0 50px rgba(217,115,74,0.04)",
              border: "1px solid rgba(255,255,255,0.03)",
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

      {/* Status label — softer entrance */}
      {SCREENSHOTS.map((shot, i) => {
        if (i !== active) return null;

        const localFrame = frame - shot.frames[0];
        const labelSpring = spring({
          frame: Math.max(0, localFrame - 8),
          fps,
          config: { damping: 80, stiffness: 50, mass: 0.7 },
        });
        const labelOpacity = interpolate(localFrame, [8, 22], [0, 1], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });
        const labelY = interpolate(labelSpring, [0, 1], [8, 0]);

        return (
          <div
            key={`label-${shot.label}`}
            style={{
              position: "absolute",
              bottom: 100,
              left: "50%",
              transform: `translateX(-50%) translateY(${labelY}px)`,
              opacity: labelOpacity,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Warm pulsing dot — slower pulse */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#d9734a",
                opacity: 0.4 + Math.sin(frame * 0.1) * 0.4,
                boxShadow: "0 0 12px rgba(217,115,74,0.3)",
              }}
            />
            <span
              style={{
                fontSize: 28,
                fontWeight: 400,
                color: "rgba(240,235,228,0.65)",
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
              height: 3,
              borderRadius: 2,
              backgroundColor:
                i <= active ? "#d9734a" : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
