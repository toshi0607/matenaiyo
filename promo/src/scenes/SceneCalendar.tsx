import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhoneStage } from "../components/PhoneStage";
import { colors, fontBody, fontHeading } from "../theme";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
// 1日が木曜はじまりの月に見立てる(先頭に4つの空セル)。
const LEAD = 4;
const DAYS = 31;
// 選択される候補日と、それぞれが確定するフレーム。
const PICKS: Record<number, number> = { 13: 20, 14: 34, 20: 48 };

const DayCell: React.FC<{ day: number }> = ({ day }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = PICKS[day];
  const selected = at !== undefined;
  const pop = selected
    ? spring({ frame: frame - at, fps, config: { damping: 11, mass: 0.7 } })
    : 0;
  const ripple = selected ? frame - at : -1;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        fontFamily: fontBody,
        fontWeight: selected ? 700 : 500,
        fontSize: 32,
        color: selected ? colors.onPrimary : colors.fg,
        background: selected
          ? `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primaryDark})`
          : "transparent",
        transform: `scale(${selected ? 0.85 + pop * 0.15 : 1})`,
        boxShadow: selected ? "0 8px 18px rgba(224,108,41,0.32)" : "none",
      }}
    >
      {day}
      {ripple >= 0 && ripple < 24 && (
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: 22,
            border: `4px solid ${colors.primary}`,
            opacity: interpolate(ripple, [0, 6, 24], [0, 0.6, 0]),
            transform: `scale(${interpolate(ripple, [0, 24], [0.6, 1.5])})`,
          }}
        />
      )}
    </div>
  );
};

export const SceneCalendar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chip = spring({ frame: frame - 62, fps, config: { damping: 14 } });

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < LEAD; i++) cells.push(<div key={`lead-${i}`} />);
  for (let d = 1; d <= DAYS; d++) cells.push(<DayCell key={d} day={d} />);

  return (
    <PhoneStage step="1" title="候補日をカレンダーで選ぶ">
      <div style={{ padding: "34px 34px", height: "100%" }}>
        <div
          style={{
            fontFamily: fontHeading,
            fontWeight: 700,
            fontSize: 34,
            color: colors.fg,
            marginBottom: 24,
          }}
        >
          候補日を選ぶ
        </div>

        <div
          style={{
            background: colors.card,
            borderRadius: 28,
            border: `1px solid ${colors.border}`,
            padding: 22,
            boxShadow: "0 10px 30px rgba(120,66,20,0.06)",
          }}
        >
          <div
            style={{
              fontFamily: fontBody,
              fontWeight: 700,
              fontSize: 28,
              color: colors.fg,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            2026年 7月
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
            }}
          >
            {WEEK.map((w, i) => (
              <div
                key={w}
                style={{
                  textAlign: "center",
                  fontFamily: fontBody,
                  fontWeight: 700,
                  fontSize: 22,
                  color:
                    i === 0
                      ? colors.no
                      : i === 6
                        ? colors.primary
                        : colors.mutedFg,
                  paddingBottom: 6,
                }}
              >
                {w}
              </div>
            ))}
            {cells}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 26,
            opacity: chip,
            transform: `translateY(${(1 - chip) * 20}px)`,
          }}
        >
          {["7/13 19:00〜", "7/14 19:00〜", "7/20 終日"].map((t) => (
            <div
              key={t}
              style={{
                flex: 1,
                background: colors.primaryTint,
                color: colors.primaryDark,
                borderRadius: 16,
                padding: "14px 8px",
                textAlign: "center",
                fontFamily: fontBody,
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </PhoneStage>
  );
};
