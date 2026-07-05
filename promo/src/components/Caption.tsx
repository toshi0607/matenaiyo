import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fontBody, fontHeading } from "../theme";

// 各ステップのキャプション(番号バッジ + 説明)。
// vertical=true でバッジを上・見出しを下の縦積みにする(横型レイアウト用)。
export const Caption: React.FC<{
  step?: string;
  title: string;
  delay?: number;
  vertical?: boolean;
}> = ({ step, title, delay = 0, vertical = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const y = (1 - enter) * 40;
  const badgeSize = vertical ? 92 : 72;
  const titleSize = vertical ? 60 : 52;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: vertical ? "flex-start" : "center",
        justifyContent: vertical ? "flex-start" : "center",
        gap: vertical ? 32 : 20,
        opacity: enter,
        transform: `translateY(${y}px)`,
      }}
    >
      {step && (
        <div
          style={{
            fontFamily: fontHeading,
            fontWeight: 700,
            fontSize: vertical ? 52 : 40,
            color: colors.onPrimary,
            background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primaryDark})`,
            width: badgeSize,
            height: badgeSize,
            borderRadius: vertical ? 28 : 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 28px rgba(224,108,41,0.35)",
            flexShrink: 0,
          }}
        >
          {step}
        </div>
      )}
      <span
        style={{
          fontFamily: fontBody,
          fontWeight: 700,
          fontSize: titleSize,
          lineHeight: 1.28,
          color: colors.fg,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </span>
    </div>
  );
};
