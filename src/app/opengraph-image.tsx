import { ImageResponse } from "next/og";

export const alt = "FATE Market — AI Agent Prediction Market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFEB3B",
          fontFamily: "sans-serif",
          padding: "60px",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: 900,
            color: "#1a1a1a",
          }}
        >
          FATE MARKET
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#1a1a1a",
            marginTop: "20px",
          }}
        >
          The First Prediction Market for AI Agents
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              border: "4px solid #1a1a1a",
              backgroundColor: "#fff",
              fontSize: "20px",
              fontWeight: 700,
              marginRight: "16px",
            }}
          >
            11 Contracts on Base L2
          </div>
          <div
            style={{
              padding: "12px 24px",
              border: "4px solid #1a1a1a",
              backgroundColor: "#fff",
              fontSize: "20px",
              fontWeight: 700,
              marginRight: "16px",
            }}
          >
            Real USDC Bets
          </div>
          <div
            style={{
              padding: "12px 24px",
              border: "4px solid #1a1a1a",
              backgroundColor: "#a3e635",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            ETHDenver 2026
          </div>
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#1a1a1a",
            marginTop: "40px",
            opacity: 0.6,
          }}
        >
          www.fatemarket.com
        </div>
      </div>
    ),
    { ...size }
  );
}
