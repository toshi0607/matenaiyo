import { loadFont as loadMaru } from "@remotion/google-fonts/ZenMaruGothic";
import { loadFont as loadKaku } from "@remotion/google-fonts/ZenKakuGothicNew";

// 見出し用の丸ゴシック(本家の親しみやすさを担う)、本文用の可読ゴシック。
export const { fontFamily: fontHeading } = loadMaru("normal", {
  weights: ["500", "700"],
});
export const { fontFamily: fontBody } = loadKaku("normal", {
  weights: ["400", "500", "700"],
});

// matenaiyo のブランドカラー(globals.css の oklch トークンを sRGB 近似)。
export const colors = {
  bg: "#FBF7F1",
  bgWarm: "#FDEFE0",
  fg: "#3A2E27",
  mutedFg: "#8B7B6C",
  card: "#FFFEFB",
  border: "#EADFCF",
  primary: "#EE8341",
  primaryDark: "#E06C29",
  primaryLight: "#F6A45C",
  primaryTint: "#FBE7D5",
  onPrimary: "#FFF7EF",
  // ○ の最多をハイライトする success 系トーン。
  bestBg: "#E4F5EC",
  bestFg: "#1F8F5F",
  bestBar: "#34B981",
  // ○△× の記号色(色覚対応は記号+テキストで担保、色は補助)。
  yes: "#2FA972",
  maybe: "#DFA021",
  no: "#B7AB9E",
} as const;
