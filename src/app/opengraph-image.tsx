import { ImageResponse } from "next/og";
import { siteDescription, siteName } from "@/lib/seo";

export const alt = `${siteName} preview`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #f8fffb 0%, #e8f8ef 100%)",
          color: "#020617",
          padding: 72,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "#047857",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, color: "#065f46" }}>
            {siteName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              maxWidth: 880,
              fontSize: 76,
              lineHeight: 1.04,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            Volunteer opportunities that fit your schedule.
          </div>
          <div
            style={{
              maxWidth: 760,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#475569",
            }}
          >
            {siteDescription}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            color: "#065f46",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          <span>Join organizations</span>
          <span>-</span>
          <span>Register for sessions</span>
          <span>-</span>
          <span>Track your impact</span>
        </div>
      </div>
    ),
    size
  );
}
