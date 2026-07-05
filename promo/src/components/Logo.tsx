import { interpolate } from "remotion";
import { colors } from "../theme";

// アプリのブランドマーク: オレンジのバッジ + 白い○リング(-6度傾き)。
// draw を 0→1 に動かすとリングが円弧で描かれていく。
export const Logo: React.FC<{
  size: number;
  draw?: number;
  badge?: boolean;
}> = ({ size, draw = 1, badge = true }) => {
  const r = 26.5;
  const circumference = 2 * Math.PI * r;
  // リング本体 + 上部の跳ね上がりアーク分を少し足した長さを描画に使う。
  const dashVisible = interpolate(draw, [0, 1], [0, circumference]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-badge" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={colors.primaryLight} />
          <stop offset="55%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.primaryDark} />
        </linearGradient>
        <radialGradient id="logo-sheen" cx="32%" cy="24%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {badge && (
        <>
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="26"
            fill="url(#logo-badge)"
          />
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="26"
            fill="url(#logo-sheen)"
          />
        </>
      )}

      <g transform="rotate(-6 50 50)">
        <circle
          cx="50"
          cy="51.5"
          r={r}
          fill="none"
          stroke="#B4531B"
          strokeOpacity="0.22"
          strokeWidth="11"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={badge ? "#FFFFFF" : colors.primary}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dashVisible}
          transform="rotate(-90 50 50)"
        />
        <path
          d="M50 23.5 C 60 23.5, 70 30, 71 40"
          fill="none"
          stroke={badge ? "#FFFFFF" : colors.primary}
          strokeWidth="11"
          strokeLinecap="round"
          opacity={interpolate(draw, [0.85, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </g>
    </svg>
  );
};
