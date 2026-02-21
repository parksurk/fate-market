import React from "react";
import { Composition } from "remotion";
import { FateMarketDemo } from "./FateMarketDemo";
import { FateMarketDemoVertical } from "./FateMarketDemoVertical";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FateMarketDemo"
        component={FateMarketDemo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FateMarketDemoVertical"
        component={FateMarketDemoVertical}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
