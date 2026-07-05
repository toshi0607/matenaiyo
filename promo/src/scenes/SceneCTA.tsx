import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Logo } from "../components/Logo";
import { colors, fontBody, fontHeading } from "../theme";

// クロージング: ロゴ + URL + CTA。
export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const title = spring({
    frame: frame - 16,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });
  const url = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });
  const cta = spring({ frame: frame - 44, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 9) * 0.02;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 40,
        padding: 90,
      }}
    >
      <div style={{ transform: `scale(${0.7 + logo * 0.3})` }}>
        <Logo size={230} />
      </div>

      <div
        style={{
          fontFamily: fontHeading,
          fontWeight: 700,
          fontSize: 96,
          color: colors.fg,
          letterSpacing: "-0.02em",
          opacity: title,
          transform: `translateY(${(1 - title) * 30}px)`,
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
          textAlign: "center",
          opacity: title,
        }}
      >
        待たせない、日程調整。
      </div>

      <div
        style={{
          fontFamily: fontBody,
          fontWeight: 700,
          fontSize: 44,
          color: colors.primaryDark,
          background: colors.primaryTint,
          borderRadius: 999,
          padding: "20px 46px",
          opacity: url,
          transform: `translateY(${(1 - url) * 24}px)`,
          marginTop: 10,
        }}
      >
        🍊 matenaiyo.vercel.app
      </div>

      <div
        style={{
          fontFamily: fontBody,
          fontWeight: 700,
          fontSize: 40,
          color: colors.onPrimary,
          background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primaryDark})`,
          borderRadius: 22,
          padding: "26px 70px",
          boxShadow: "0 16px 40px rgba(224,108,41,0.4)",
          opacity: cta,
          transform: `scale(${interpolate(cta, [0, 1], [0.8, 1]) * pulse})`,
          marginTop: 20,
        }}
      >
        今すぐ、無料ではじめる →
      </div>
    </AbsoluteFill>
  );
};
