import { AbsoluteFill, Img, staticFile } from "remotion";
import { Logo } from "./components/Logo";
import { colors, fontBody, fontHeading } from "./theme";

// OGP 画像(1200×630)。案Cのイラストを背景に、実フォント(Zen Maru Gothic)で
// ブランド名・キャッチコピーを下部の余白に後乗せする。
export const Ogp: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Img
        src={staticFile("ogp-illustration.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* 下部の文字を確実に読ませるための、ごく淡いクリームのにじみ */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(125% 82% at 50% 100%, rgba(251,247,241,0.94) 0%, rgba(251,247,241,0.78) 42%, rgba(251,247,241,0) 72%)",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: fontHeading,
              fontWeight: 700,
              fontSize: 62,
              lineHeight: 1.1,
              color: colors.fg,
              letterSpacing: "-0.01em",
            }}
          >
            待たせない、<span style={{ color: colors.primary }}>日程調整</span>。
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Logo size={38} />
              <span
                style={{
                  fontFamily: fontHeading,
                  fontWeight: 700,
                  fontSize: 34,
                  color: colors.fg,
                  letterSpacing: "-0.01em",
                }}
              >
                matenaiyo
              </span>
            </div>
            <span style={{ color: colors.border, fontSize: 26 }}>|</span>
            <span
              style={{
                fontFamily: fontBody,
                fontWeight: 500,
                fontSize: 27,
                color: colors.mutedFg,
              }}
            >
              ログイン不要・URLひとつで完結
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
