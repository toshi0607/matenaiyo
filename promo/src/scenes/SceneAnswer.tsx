import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhoneStage } from "../components/PhoneStage";
import { colors, fontBody, fontHeading } from "../theme";

type MarkKey = "yes" | "maybe" | "no";
const MARKS: { key: MarkKey; symbol: string; color: string }[] = [
  { key: "yes", symbol: "○", color: colors.yes },
  { key: "maybe", symbol: "△", color: colors.maybe },
  { key: "no", symbol: "×", color: colors.no },
];

const MarkRow: React.FC<{
  date: string;
  chosen: MarkKey;
  at: number;
}> = ({ date, chosen, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - at, fps, config: { damping: 11, mass: 0.7 } });
  const active = frame >= at;
  const ripple = frame - at;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 22,
        padding: "20px 24px",
        boxShadow: "0 8px 20px rgba(120,66,20,0.05)",
      }}
    >
      <span
        style={{
          fontFamily: fontBody,
          fontWeight: 700,
          fontSize: 30,
          color: colors.fg,
        }}
      >
        {date}
      </span>
      <div style={{ display: "flex", gap: 12 }}>
        {MARKS.map((m) => {
          const isChosen = m.key === chosen;
          const on = isChosen && active;
          return (
            <div
              key={m.key}
              style={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fontBody,
                fontWeight: 700,
                fontSize: 40,
                color: on ? "#fff" : m.color,
                background: on ? m.color : colors.bg,
                border: `2px solid ${on ? m.color : colors.border}`,
                transform: `scale(${on ? 0.85 + pop * 0.15 : 1})`,
              }}
            >
              {m.symbol}
              {on && ripple >= 0 && ripple < 22 && (
                <div
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: 22,
                    border: `4px solid ${m.color}`,
                    opacity: interpolate(ripple, [0, 6, 22], [0, 0.7, 0]),
                    transform: `scale(${interpolate(ripple, [0, 22], [0.6, 1.5])})`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ステップ3: 名前を入れて ○△× をタップするだけ。
export const SceneAnswer: React.FC = () => {
  return (
    <PhoneStage step="3" title="○△× をタップで回答">
      <div
        style={{
          padding: 34,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            fontFamily: fontHeading,
            fontWeight: 700,
            fontSize: 34,
            color: colors.fg,
          }}
        >
          回答する
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: "16px 22px",
            fontFamily: fontBody,
            fontSize: 28,
            color: colors.fg,
          }}
        >
          <span style={{ color: colors.mutedFg }}>お名前</span>
          <span style={{ fontWeight: 700 }}>たなか</span>
        </div>

        <MarkRow date="7/13 (月) 19:00〜" chosen="yes" at={16} />
        <MarkRow date="7/14 (火) 19:00〜" chosen="yes" at={30} />
        <MarkRow date="7/20 (日) 終日" chosen="maybe" at={44} />

        <div
          style={{
            marginTop: "auto",
            background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primaryDark})`,
            color: colors.onPrimary,
            borderRadius: 18,
            padding: "22px 0",
            textAlign: "center",
            fontFamily: fontBody,
            fontWeight: 700,
            fontSize: 30,
            boxShadow: "0 10px 24px rgba(224,108,41,0.3)",
          }}
        >
          回答を送信
        </div>
      </div>
    </PhoneStage>
  );
};
