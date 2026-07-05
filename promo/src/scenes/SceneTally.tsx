import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhoneStage } from "../components/PhoneStage";
import { colors, fontBody, fontHeading } from "../theme";

const PEOPLE = ["たなか", "さとう", "すずき", "やまだ"];
type Cell = "○" | "△" | "×";
const ROWS: { date: string; marks: Cell[]; count: number; best?: boolean }[] = [
  { date: "7/13 (月)", marks: ["○", "○", "○", "○"], count: 4, best: true },
  { date: "7/14 (火)", marks: ["○", "○", "△", "○"], count: 3 },
  { date: "7/20 (日)", marks: ["△", "×", "○", "△"], count: 1 },
];

const markColor = (c: Cell) =>
  c === "○" ? colors.yes : c === "△" ? colors.maybe : colors.no;

export const SceneTally: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bestAt = 40;
  const highlight = spring({
    frame: frame - bestAt,
    fps,
    config: { damping: 200 },
    durationInFrames: 18,
  });
  const badge = spring({ frame: frame - (bestAt + 10), fps, config: { damping: 10 } });

  return (
    <PhoneStage step="4" title="○最多の日が自動でわかる">
      <div style={{ padding: 34, height: "100%" }}>
        <div
          style={{
            fontFamily: fontHeading,
            fontWeight: 700,
            fontSize: 34,
            color: colors.fg,
            marginBottom: 8,
          }}
        >
          集計結果
        </div>
        <div
          style={{
            fontFamily: fontBody,
            fontSize: 24,
            color: colors.mutedFg,
            marginBottom: 26,
          }}
        >
          リアルタイムで自動集計。
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(120,66,20,0.06)",
          }}
        >
          {/* ヘッダー行 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr repeat(4, 1fr) 0.9fr",
              background: colors.bg,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={hcell}>日程</div>
            {PEOPLE.map((p) => (
              <div key={p} style={{ ...hcell, fontSize: 20 }}>
                {p}
              </div>
            ))}
            <div style={{ ...hcell, color: colors.primary }}>○</div>
          </div>

          {ROWS.map((row) => {
            const isBest = row.best;
            const bg = isBest
              ? `rgba(52,185,129,${0.14 * highlight})`
              : "transparent";
            return (
              <div
                key={row.date}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr repeat(4, 1fr) 0.9fr",
                  borderBottom: `1px solid ${colors.border}`,
                  background: bg,
                  position: "relative",
                }}
              >
                {isBest && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      background: colors.bestBar,
                      opacity: highlight,
                    }}
                  />
                )}
                <div
                  style={{
                    ...cell,
                    fontWeight: 700,
                    color: colors.fg,
                    justifyContent: "flex-start",
                    gap: 8,
                  }}
                >
                  {row.date}
                  {isBest && (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: colors.onPrimary,
                        background: colors.bestBar,
                        borderRadius: 999,
                        padding: "4px 12px",
                        transform: `scale(${badge})`,
                        display: "inline-block",
                      }}
                    >
                      ★ベスト
                    </span>
                  )}
                </div>
                {row.marks.map((m, i) => (
                  <div
                    key={`${row.date}-${i}`}
                    style={{ ...cell, color: markColor(m), fontWeight: 700 }}
                  >
                    {m}
                  </div>
                ))}
                <div
                  style={{
                    ...cell,
                    fontWeight: 700,
                    color: isBest ? colors.bestFg : colors.fg,
                  }}
                >
                  {row.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PhoneStage>
  );
};

const hcell: React.CSSProperties = {
  padding: "16px 6px",
  textAlign: "center",
  fontFamily: fontBody,
  fontWeight: 700,
  fontSize: 22,
  color: colors.mutedFg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cell: React.CSSProperties = {
  padding: "20px 10px",
  fontFamily: fontBody,
  fontSize: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
