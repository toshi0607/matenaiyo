import type React from "react";
import { colors, fontHeading } from "../theme";
import { Logo } from "./Logo";

// アプリ画面を収めるスマホの筐体。モバイルファーストな製品なので縦持ちで見せる。
export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
}> = ({ children, width = 540 }) => {
  const height = width * 2.04;
  const bezel = 18;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 60,
        background: "#241C16",
        padding: bezel,
        boxShadow:
          "0 40px 90px rgba(120, 66, 20, 0.28), 0 8px 24px rgba(120, 66, 20, 0.18)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 44,
          background: colors.bg,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* アプリのヘッダー(sticky なブランドバー) */}
        <div
          style={{
            height: 78,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 30px",
            borderBottom: `1px solid ${colors.border}`,
            background: "rgba(255,255,255,0.7)",
          }}
        >
          <Logo size={40} />
          <span
            style={{
              fontFamily: fontHeading,
              fontWeight: 700,
              fontSize: 26,
              color: colors.fg,
              letterSpacing: "-0.01em",
            }}
          >
            matenaiyo
          </span>
        </div>
        <div style={{ flex: 1, position: "relative" }}>{children}</div>
      </div>
    </div>
  );
};
