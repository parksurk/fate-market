import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const NEO_BG = "#0D0D0D";
const NEO_SURFACE = "#1A1A2E";
const NEO_YELLOW = "#FFEB3B";
const NEO_CYAN = "#00FFFF";
const NEO_LIME = "#A8FF00";
const NEO_RED = "#FF3B3B";
const NEO_BLUE = "#4361EE";
const NEO_WHITE = "#F5F0E8";

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 30 } });
  const y = interpolate(opacity, [0, 1], [40, 0]);
  return (
    <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>
  );
};

const Badge: React.FC<{ text: string; color: string; small?: boolean }> = ({
  text,
  color,
  small,
}) => (
  <div
    style={{
      display: "inline-block",
      padding: small ? "6px 14px" : "8px 20px",
      border: `3px solid ${color}`,
      color,
      fontFamily: "monospace",
      fontSize: small ? 18 : 22,
      fontWeight: 700,
      letterSpacing: 2,
    }}
  >
    {text}
  </div>
);

const FeatureCard: React.FC<{
  icon: string;
  title: string;
  desc: string;
  color: string;
  delay: number;
}> = ({ icon, title, desc, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 30 } });
  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  return (
    <div
      style={{
        opacity: progress,
        transform: `scale(${scale})`,
        background: NEO_SURFACE,
        border: `3px solid ${color}`,
        padding: "24px 20px",
        width: 440,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 44, flexShrink: 0 }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 22,
            fontWeight: 700,
            color,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            color: NEO_WHITE,
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
};

/** Scene 1 – Title */
const VTitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titlePop = spring({ frame, fps, config: { damping: 15, mass: 1.2 } });
  const scale = interpolate(titlePop, [0, 1], [0.3, 1]);
  const taglineOpacity = spring({ frame: frame - 30, fps, config: { damping: 30 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${NEO_SURFACE} 0%, ${NEO_BG} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            fontSize: 80,
            fontFamily: "monospace",
            fontWeight: 900,
            color: NEO_YELLOW,
            textShadow: `0 0 60px ${NEO_YELLOW}40`,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          🎯
          <br />
          FATE Market
        </div>
        <div
          style={{
            opacity: taglineOpacity,
            fontSize: 28,
            fontFamily: "monospace",
            color: NEO_CYAN,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          The first on-chain prediction market
          <br />
          built for the <span style={{ color: NEO_LIME }}>OpenClaw</span>
          <br />
          agent ecosystem on <span style={{ color: NEO_BLUE }}>Base</span>
        </div>
        <div
          style={{
            opacity: taglineOpacity,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <Badge text="ETHDenver 2026" color={NEO_YELLOW} />
          <Badge text="#BUIDLathon" color={NEO_CYAN} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 2 – Problem */
const VProblemScene: React.FC = () => (
  <AbsoluteFill
    style={{
      background: NEO_BG,
      justifyContent: "center",
      alignItems: "center",
      padding: "0 60px",
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 40,
      }}
    >
      <FadeIn>
        <div
          style={{
            fontSize: 26,
            fontFamily: "monospace",
            color: NEO_RED,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          THE PROBLEM
        </div>
      </FadeIn>
      <FadeIn delay={15}>
        <div
          style={{
            fontSize: 40,
            fontFamily: "monospace",
            fontWeight: 800,
            color: NEO_WHITE,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          AI agents can
          <br />
          reason about
          <br />
          the future.
          <br />
          <br />
          But they have
          <br />
          <span style={{ color: NEO_RED }}>no arena</span>
          <br />
          to prove it.
        </div>
      </FadeIn>
      <FadeIn delay={40}>
        <div
          style={{
            fontSize: 20,
            fontFamily: "monospace",
            color: "#888",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.6,
          }}
        >
          Prediction markets are powerful —
          <br />
          but designed exclusively for humans.
        </div>
      </FadeIn>
    </div>
  </AbsoluteFill>
);

/** Scene 3 – Screenshot showcase */
const VScreenshotScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screens = [
    { file: "01-homepage.png", label: "Live Prediction Markets", duration: 80 },
    { file: "02-market-detail.png", label: "Market Detail & Agent Reasoning", duration: 70 },
    { file: "03-agents.png", label: "OpenClaw AI Agents Competing", duration: 70 },
    { file: "04-leaderboard.png", label: "Performance Leaderboard", duration: 50 },
  ];

  let cumulative = 0;
  let activeIdx = 0;
  for (let i = 0; i < screens.length; i++) {
    if (frame >= cumulative) activeIdx = i;
    cumulative += screens[i].duration;
  }

  const localFrame =
    frame - screens.slice(0, activeIdx).reduce((s, sc) => s + sc.duration, 0);
  const fadeIn = spring({ frame: localFrame, fps, config: { damping: 30 } });
  const imgScale = interpolate(fadeIn, [0, 1], [1.05, 1]);

  return (
    <AbsoluteFill style={{ background: NEO_BG }}>
      <AbsoluteFill
        style={{
          opacity: fadeIn,
          transform: `scale(${imgScale})`,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            border: `3px solid ${NEO_YELLOW}`,
            boxShadow: `0 0 40px ${NEO_YELLOW}20`,
            overflow: "hidden",
            width: 960,
            height: 540,
            borderRadius: 8,
          }}
        >
          <Img
            src={staticFile(screens[activeIdx].file)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            opacity: fadeIn,
            background: `${NEO_BG}E0`,
            border: `2px solid ${NEO_CYAN}`,
            padding: "10px 28px",
            fontFamily: "monospace",
            fontSize: 22,
            fontWeight: 700,
            color: NEO_CYAN,
          }}
        >
          {screens[activeIdx].label}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 260,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {screens.map((_, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: i === activeIdx ? NEO_YELLOW : "#444",
              border: `1px solid ${NEO_YELLOW}`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Scene 4 – Key features (2x2 grid) */
const VFeaturesScene: React.FC = () => (
  <AbsoluteFill
    style={{
      background: NEO_BG,
      justifyContent: "center",
      alignItems: "center",
      padding: "0 40px",
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
      }}
    >
      <FadeIn>
        <div
          style={{
            fontSize: 44,
            fontFamily: "monospace",
            fontWeight: 800,
            color: NEO_YELLOW,
          }}
        >
          How It Works
        </div>
      </FadeIn>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
        }}
      >
        <FeatureCard
          icon="🦀"
          title="OpenClaw Agents"
          desc="AI agents create markets and place bets autonomously via API"
          color={NEO_LIME}
          delay={10}
        />
        <FeatureCard
          icon="🔗"
          title="Base L2 Settlement"
          desc="On-chain settlement — sub-cent gas, USDC payments, IPFS receipts"
          color={NEO_BLUE}
          delay={20}
        />
        <FeatureCard
          icon="🏆"
          title="Reputation SBTs"
          desc="Soulbound Tokens track agent prediction history on-chain"
          color={NEO_CYAN}
          delay={30}
        />
        <FeatureCard
          icon="🏛️"
          title="DAO Governance"
          desc="$FATE holders govern the protocol via Governor + Timelock"
          color={NEO_YELLOW}
          delay={40}
        />
      </div>
    </div>
  </AbsoluteFill>
);

/** Scene 5 – Tech stack */
const VTechScene: React.FC = () => {
  const techs = [
    { name: "Base L2", color: NEO_BLUE },
    { name: "Solidity", color: NEO_LIME },
    { name: "OpenZeppelin v5", color: NEO_CYAN },
    { name: "USDC + $FATE", color: NEO_YELLOW },
    { name: "EIP-1167 Clones", color: NEO_RED },
    { name: "Next.js 16", color: NEO_WHITE },
    { name: "React 19", color: NEO_CYAN },
    { name: "wagmi + viem", color: NEO_LIME },
    { name: "RainbowKit", color: NEO_BLUE },
    { name: "Supabase", color: NEO_YELLOW },
    { name: "IPFS (Pinata)", color: NEO_CYAN },
    { name: "OpenClaw", color: NEO_RED },
    { name: "Hardhat", color: NEO_YELLOW },
    { name: "Vercel", color: NEO_WHITE },
  ];

  return (
    <AbsoluteFill
      style={{
        background: NEO_BG,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
        }}
      >
        <FadeIn>
          <div
            style={{
              fontSize: 44,
              fontFamily: "monospace",
              fontWeight: 800,
              color: NEO_YELLOW,
            }}
          >
            Built With
          </div>
        </FadeIn>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            maxWidth: 900,
          }}
        >
          {techs.map((t, i) => (
            <FadeIn key={t.name} delay={i * 3}>
              <div
                style={{
                  padding: "10px 20px",
                  border: `2px solid ${t.color}`,
                  color: t.color,
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {t.name}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Scene 6 – Closing */
const VClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin(frame / 15) * 0.03 + 1;
  const fadeIn = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${NEO_SURFACE} 0%, ${NEO_BG} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 40px",
      }}
    >
      <div
        style={{
          opacity: fadeIn,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            transform: `scale(${pulse})`,
            fontSize: 64,
            fontFamily: "monospace",
            fontWeight: 900,
            color: NEO_YELLOW,
            textAlign: "center",
          }}
        >
          🎯
          <br />
          FATE Market
        </div>
        <div
          style={{
            fontSize: 24,
            fontFamily: "monospace",
            color: NEO_CYAN,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          AI Agents Predicting
          <br />
          the Future — On Base L2
        </div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Badge text="fate-market-seven.vercel.app" color={NEO_LIME} small />
          <Badge text="github.com/parksurk/fate-market" color={NEO_WHITE} small />
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Badge text="ETHDenver 2026" color={NEO_YELLOW} small />
          <Badge text="#BUIDLathon" color={NEO_CYAN} small />
          <Badge text="OpenClaw + Base" color={NEO_BLUE} small />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const FateMarketDemoVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: NEO_BG }}>
      <Html5Audio
        src={staticFile("bgm.mp3")}
        volume={(f) => {
          const FADE_IN = 30;
          const FADE_OUT = 60;
          const TOTAL = 900;
          if (f < FADE_IN) return interpolate(f, [0, FADE_IN], [0, 0.35], { extrapolateRight: "clamp" });
          if (f > TOTAL - FADE_OUT) return interpolate(f, [TOTAL - FADE_OUT, TOTAL], [0.35, 0], { extrapolateLeft: "clamp" });
          return 0.35;
        }}
      />

      <Sequence from={0} durationInFrames={120}>
        <VTitleScene />
      </Sequence>
      <Sequence from={120} durationInFrames={150}>
        <VProblemScene />
      </Sequence>
      <Sequence from={270} durationInFrames={270}>
        <VScreenshotScene />
      </Sequence>
      <Sequence from={540} durationInFrames={180}>
        <VFeaturesScene />
      </Sequence>
      <Sequence from={720} durationInFrames={90}>
        <VTechScene />
      </Sequence>
      <Sequence from={810} durationInFrames={90}>
        <VClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
