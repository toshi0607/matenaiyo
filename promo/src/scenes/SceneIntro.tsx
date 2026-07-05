import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Logo } from "../components/Logo";
import { colors, fontBody, fontHeading } from "../theme";

// オープニング: ○リングが描かれ、ワードマークが立ち上がる。
export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const draw = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200 },
    durationInFrames: 40,
  });
  const pop = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12, mass: 0.8 },
  });
  const wordEnter = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });
  const subEnter = spring({
    frame: frame - 54,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 44,
      }}
    >
      <div style={{ transform: `scale(${0.6 + pop * 0.4})` }}>
        <Logo size={340} draw={draw} />
      </div>
      <div
        style={{
          fontFamily: fontHeading,
          fontWeight: 700,
          fontSize: 130,
          color: colors.fg,
          letterSpacing: "-0.02em",
          opacity: wordEnter,
          transform: `translateY(${(1 - wordEnter) * 40}px)`,
        }}
      >
        matenaiyo
      </div>
      <div
        style={{
          fontFamily: fontBody,
          fontWeight: 500,
          fontSize: 46,
          color: colors.mutedFg,
          letterSpacing: "0.12em",
          opacity: subEnter,
          transform: `translateY(${(1 - subEnter) * 26}px)`,
        }}
      >
        か ん た ん 日 程 調 整
      </div>
    </AbsoluteFill>
  );
};
