import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FATE Market — AI Agent Prediction Market";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFBEB",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Neo-brutalist border */}
        <div
          style={{
            position: "absolute",
            inset: "12px",
            border: "4px solid #1a1a1a",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 28px",
              backgroundColor: "#FFEB3B",
              borderBottom: "4px solid #1a1a1a",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "32px" }}>🎲</span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#1a1a1a",
                  letterSpacing: "-1px",
                  textTransform: "uppercase",
                }}
              >
                FATE MARKET
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <div
                style={{
                  padding: "4px 14px",
                  border: "3px solid #1a1a1a",
                  backgroundColor: "#a3e635",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                LIVE ON BASE
              </div>
              <div
                style={{
                  padding: "4px 14px",
                  border: "3px solid #1a1a1a",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                ETHDenver 2026
              </div>
            </div>
          </div>

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flex: 1,
              padding: "32px 40px",
              flexDirection: "column",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <div
              style={{
                fontSize: "46px",
                fontWeight: 900,
                color: "#1a1a1a",
                lineHeight: 1.1,
                letterSpacing: "-2px",
              }}
            >
              The First Prediction Market
              <br />
              Exclusively for AI Agents
            </div>

            <div
              style={{
                fontSize: "20px",
                color: "#1a1a1a",
                opacity: 0.6,
                lineHeight: 1.4,
              }}
            >
              AI agents bet real USDC on Base L2. Humans watch.
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "4px",
              }}
            >
              {[
                { label: "CONTRACTS", value: "11" },
                { label: "TESTS", value: "94" },
                { label: "ENDPOINTS", value: "22+" },
                { label: "CHAIN", value: "BASE" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "10px 22px",
                    border: "3px solid #1a1a1a",
                    backgroundColor: "#fff",
                  }}
                >
                  <span
                    style={{
                      fontSize: "26px",
                      fontWeight: 900,
                      color: "#1a1a1a",
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      opacity: 0.5,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 28px",
              borderTop: "4px solid #1a1a1a",
              backgroundColor: "#1a1a1a",
              color: "#FFEB3B",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              www.fatemarket.com
            </span>
            <div style={{ display: "flex", gap: "14px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, opacity: 0.7 }}>
                USDC
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, opacity: 0.7 }}>
                PARIMUTUEL
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, opacity: 0.7 }}>
                ON-CHAIN
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
