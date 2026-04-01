import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { SceneHook } from "./SceneHook";
import { ScenePrompt } from "./ScenePrompt";
import { SceneWorking } from "./SceneWorking";
import { SceneDone } from "./SceneDone";
import { SceneResult } from "./SceneResult";
import { SceneCTA } from "./SceneCTA";
import goldSrc from "../../gold-by-kv.mp3";

// 22 seconds at 30fps = 660 frames
// Scene 1: HOOK        0-3s     (0-89)
// Scene 2: PROMPT      3-5.5s   (90-164)
// Scene 3: WORKING     5.5-11s  (165-329)
// Scene 4: DONE        11-14s   (330-419)
// Scene 5: RESULT      14-17.5s (420-524)
// Scene 6: CTA         17.5-22s (525-659)

export const ChatGPTPromo: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in over first 1.5s (45 frames), fade out over last 3s (90 frames)
  const musicVolume = interpolate(
    frame,
    [0, 45, 570, 660],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#171717",
        fontFamily:
          "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Audio src={goldSrc} volume={musicVolume} startFrom={0} />
      <Sequence from={0} durationInFrames={90}>
        <SceneHook />
      </Sequence>

      <Sequence from={90} durationInFrames={75}>
        <ScenePrompt />
      </Sequence>

      <Sequence from={165} durationInFrames={165}>
        <SceneWorking />
      </Sequence>

      <Sequence from={330} durationInFrames={90}>
        <SceneDone />
      </Sequence>

      <Sequence from={420} durationInFrames={105}>
        <SceneResult />
      </Sequence>

      <Sequence from={525} durationInFrames={135}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
