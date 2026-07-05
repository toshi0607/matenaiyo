import { Composition } from "remotion";
import { PromoVideo } from "./Video";

// 27秒弱のプロモ動画。レイアウトは画面比で自動切替(縦型/横型)。
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 縦型(SNSリール/ストーリー向け) */}
      <Composition
        id="Promo"
        component={PromoVideo}
        durationInFrames={803}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 横型 16:9(X タイムライン向け) */}
      <Composition
        id="PromoWide"
        component={PromoVideo}
        durationInFrames={803}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
