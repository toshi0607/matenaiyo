import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { Background } from "./components/Background";
import { SceneAnswer } from "./scenes/SceneAnswer";
import { SceneCalendar } from "./scenes/SceneCalendar";
import { SceneCTA } from "./scenes/SceneCTA";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneShare } from "./scenes/SceneShare";
import { SceneTagline } from "./scenes/SceneTagline";
import { SceneTally } from "./scenes/SceneTally";

const fadeT = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: 16 }),
});
const slideT = (direction: "from-right" | "from-left") => ({
  presentation: slide({ direction }),
  timing: linearTiming({ durationInFrames: 18 }),
});

const TOTAL_FRAMES = 803;

// BGM の音量エンベロープ: 立ち上がりと終盤フェードアウトを動画尺に合わせる。
const bgmVolume = (frame: number): number => {
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [TOTAL_FRAMES - 55, TOTAL_FRAMES - 6],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return Math.min(fadeIn, fadeOut) * 0.68;
};

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile("bgm.wav")} volume={bgmVolume} />
      <Background />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={95}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT()} />

        <TransitionSeries.Sequence durationInFrames={110}>
          <SceneTagline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneCalendar />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideT("from-right")} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <SceneShare />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideT("from-right")} />

        <TransitionSeries.Sequence durationInFrames={145}>
          <SceneAnswer />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...slideT("from-right")} />

        <TransitionSeries.Sequence durationInFrames={135}>
          <SceneTally />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT()} />

        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
