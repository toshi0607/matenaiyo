import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhoneStage } from "../components/PhoneStage";
import { colors, fontBody, fontHeading } from "../theme";

// ステップ2: 共有URLを発行してコピー / LINE で送る。
export const SceneShare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const card = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const pressAt = 40;
  const press = spring({
    frame: frame - pressAt,
    fps,
    config: { damping: 10, mass: 0.5 },
  });
  const btnScale = 1 - interpolate(press, [0, 1], [0, 0.06]) * (frame < pressAt + 8 ? 1 : 0);
  const toast = spring({
    frame: frame - (pressAt + 4),
    fps,
    config: { damping: 16 },
  });
  const shareRow = spring({
    frame: frame - 64,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });

  return (
    <PhoneStage step="2" title="URLを送るだけ">
      <div
        style={{
          padding: 34,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: fontHeading,
            fontWeight: 700,
            fontSize: 34,
            color: colors.fg,
            marginBottom: 10,
          }}
        >
          共有URLができました
        </div>
        <div
          style={{
            fontFamily: fontBody,
            fontSize: 24,
            color: colors.mutedFg,
            marginBottom: 30,
          }}
        >
          このURLを送るだけ。相手の登録は不要。
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 24,
            padding: 26,
            opacity: card,
            transform: `translateY(${(1 - card) * 30}px)`,
            boxShadow: "0 10px 30px rgba(120,66,20,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: "18px 20px",
              fontFamily: fontBody,
              fontSize: 26,
              color: colors.fg,
              marginBottom: 20,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span style={{ color: colors.primary }}>🔗</span>
            matenaiyo.vercel.app/e/xY3k9Q
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primaryDark})`,
              color: colors.onPrimary,
              borderRadius: 16,
              padding: "20px 0",
              textAlign: "center",
              fontFamily: fontBody,
              fontWeight: 700,
              fontSize: 30,
              transform: `scale(${btnScale})`,
              boxShadow: "0 10px 24px rgba(224,108,41,0.32)",
            }}
          >
            URLをコピー
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 34,
            opacity: shareRow,
            transform: `translateY(${(1 - shareRow) * 20}px)`,
          }}
        >
          {[
            { label: "LINE", bg: "#06C755", fg: "#fff" },
            { label: "X", bg: "#111", fg: "#fff" },
            { label: "メール", bg: "#EFE7DB", fg: colors.fg },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: s.bg,
                color: s.fg,
                borderRadius: 18,
                padding: "20px 0",
                textAlign: "center",
                fontFamily: fontBody,
                fontWeight: 700,
                fontSize: 26,
              }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* コピー完了トースト */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 40,
            display: "flex",
            justifyContent: "center",
            opacity: toast,
            transform: `translateY(${(1 - toast) * 24}px)`,
          }}
        >
          <div
            style={{
              background: colors.fg,
              color: "#fff",
              borderRadius: 999,
              padding: "16px 32px",
              fontFamily: fontBody,
              fontWeight: 700,
              fontSize: 26,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: colors.bestBar }}>✓</span>
            コピーしました
          </div>
        </div>
      </div>
    </PhoneStage>
  );
};
