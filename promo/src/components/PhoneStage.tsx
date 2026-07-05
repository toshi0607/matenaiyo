import type React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption } from "./Caption";
import { PhoneFrame } from "./PhoneFrame";

// スマホ実演シーンの共通レイアウト。
// 縦型: 上に端末・下にキャプション。横型(16:9): 左に端末・右にキャプション。
export const PhoneStage: React.FC<{
  step?: string;
  title: string;
  captionDelay?: number;
  children: React.ReactNode;
}> = ({ step, title, captionDelay = 8, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const landscape = width > height;
  const enter = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });

  // 内部レイアウトは縦横で共通(540幅)。横型では端末全体を縮小して収める。
  const phone = (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 60}px)`,
      }}
    >
      <PhoneFrame width={540}>{children}</PhoneFrame>
    </div>
  );

  if (landscape) {
    return (
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 70,
          padding: "0 120px",
        }}
      >
        <div style={{ transform: "scale(0.8)", flexShrink: 0 }}>{phone}</div>
        <div style={{ width: 720, flexShrink: 0 }}>
          <Caption step={step} title={title} delay={captionDelay} vertical />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 120,
      }}
    >
      {phone}
      <div style={{ position: "absolute", bottom: 130, width: "100%" }}>
        <Caption step={step} title={title} delay={captionDelay} />
      </div>
    </AbsoluteFill>
  );
};
