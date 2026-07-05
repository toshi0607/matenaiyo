import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontBody, fontHeading } from "../theme";

// コンセプト提示:「待たせない、日程調整。」+ ログイン不要チップ。
export const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chip = spring({ frame, fps, config: { damping: 14 } });
  const line1 = spring({
    frame: frame - 12,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const line2 = spring({
    frame: frame - 26,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const sub = spring({
    frame: frame - 44,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });

  const rise = (s: number) => `translateY(${(1 - s) * 46}px)`;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 90,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 34px",
          borderRadius: 999,
          border: `2px solid ${colors.primary}33`,
          background: `${colors.primary}1A`,
          color: colors.primaryDark,
          fontFamily: fontBody,
          fontWeight: 700,
          fontSize: 40,
          opacity: chip,
          transform: `scale(${0.9 + chip * 0.1})`,
          marginBottom: 64,
        }}
      >
        <span>🍊</span>
        ログイン不要・URLひとつで完結
      </div>

      <div
        style={{
          fontFamily: fontHeading,
          fontWeight: 700,
          fontSize: 132,
          lineHeight: 1.14,
          color: colors.fg,
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        <div style={{ opacity: line1, transform: rise(line1) }}>
          待たせない、
        </div>
        <div style={{ opacity: line2, transform: rise(line2) }}>
          <span style={{ color: colors.primary }}>日程調整</span>。
        </div>
      </div>

      <div
        style={{
          fontFamily: fontBody,
          fontWeight: 500,
          fontSize: 46,
          color: colors.mutedFg,
          textAlign: "center",
          marginTop: 56,
          lineHeight: 1.5,
          opacity: sub,
          transform: rise(sub),
        }}
      >
        候補日を並べて共有するだけ。
        <br />
        あとはタップで集計まで自動です。
      </div>
    </AbsoluteFill>
  );
};
