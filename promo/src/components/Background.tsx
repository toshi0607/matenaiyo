import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

// あたたかポップな背景。ほんのり動く2つのオレンジのぼかし玉。
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  const drift2 = Math.cos(frame / 110) * 50;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(170deg, ${colors.bg} 0%, ${colors.bgWarm} 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -220 + drift,
          right: -160,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(246,164,92,0.45), rgba(246,164,92,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -260 - drift2,
          left: -180,
          width: 760,
          height: 760,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,214,168,0.5), rgba(255,214,168,0) 66%)",
        }}
      />
    </AbsoluteFill>
  );
};
