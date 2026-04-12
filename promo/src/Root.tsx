import "./index.css";
import { Composition, Still } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { ReadflowPromo } from "./ClaudePromo";
import { ChatGPTPromo } from "./ChatGPTPromo";
import { ClaudeThumbnail } from "./ClaudePromo/Thumbnail";
import { ChatGPTThumbnail } from "./ChatGPTPromo/Thumbnail";
import { HeroShot } from "./DevpostScreenshots/HeroShot";
import { ArchitectureShot } from "./DevpostScreenshots/ArchitectureShot";
import { CLIShot } from "./DevpostScreenshots/CLIShot";
import { FeaturesShot } from "./DevpostScreenshots/FeaturesShot";
import { FlowShot } from "./DevpostScreenshots/FlowShot";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Readflow Promo — Claude Version */}
      <Composition
        id="ReadflowPromo"
        component={ReadflowPromo}
        durationInFrames={660}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Readflow Promo — ChatGPT Version */}
      <Composition
        id="ChatGPTPromo"
        component={ChatGPTPromo}
        durationInFrames={660}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Thumbnails — 1280x720 YouTube recommended */}
      <Still
        id="ClaudeThumbnail"
        component={ClaudeThumbnail}
        width={1280}
        height={720}
      />
      <Still
        id="ChatGPTThumbnail"
        component={ChatGPTThumbnail}
        width={1280}
        height={720}
      />

      {/* Devpost Screenshots — 1920x1080 */}
      <Still id="DevpostHero" component={HeroShot} width={1920} height={1080} />
      <Still id="DevpostArchitecture" component={ArchitectureShot} width={1920} height={1080} />
      <Still id="DevpostCLI" component={CLIShot} width={1920} height={1080} />
      <Still id="DevpostFeatures" component={FeaturesShot} width={1920} height={1080} />
      <Still id="DevpostFlow" component={FlowShot} width={1920} height={1080} />

      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema2}
        defaultProps={{
          logoColor1: "#91dAE2" as const,
          logoColor2: "#86A8E7" as const,
        }}
      />
    </>
  );
};
