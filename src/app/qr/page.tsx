"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Icon,
  NXBtn,
  NXPill,
  NXSidebar,
  NXTopbar,
} from "@/components/nx";

export default function QRPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false
    );
    scanner.render(
      (decodedText) => {
        setScanned(decodedText);
        setScanning(false);
        scanner.clear().catch(() => {});
      },
      () => {}
    );
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanning]);

  if (loading || !profile || !user) return null;

  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/view/${user.uid}`
      : `/view/${user.uid}`;

  return (
    <div className="nx-shell">
      <NXSidebar current="qr" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow="QR · physical · digital bridge"
          title="Your badge."
        >
          <NXBtn
            kind="ghost"
            size="sm"
            onClick={() => downloadSVG(profileUrl, profile.name)}
          >
            {Icon.download} Download SVG
          </NXBtn>
          <NXBtn
            kind="ghost"
            size="sm"
            onClick={() => window.print()}
          >
            Print A6
          </NXBtn>
          <NXBtn
            kind="primary"
            size="sm"
            onClick={() => {
              setScanned(null);
              setScanning(true);
            }}
          >
            {Icon.qr} Open scanner
          </NXBtn>
        </NXTopbar>

        <div
          className="nx-scroll"
          style={{
            padding: 28,
            overflow: "auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          {/* Printable badge */}
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Printable · A6 portrait
            </div>
            <div
              style={{
                aspectRatio: "105/148",
                background: "var(--paper)",
                border: "1px solid var(--rule)",
                borderRadius: "var(--r-lg)",
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 22,
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span
                  className="t-serif"
                  style={{ fontSize: 28, fontStyle: "italic" }}
                >
                  Nexus
                </span>
                <span
                  className="t-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                  }}
                >
                  {new Date().getFullYear()} cohort
                </span>
              </div>
              <hr className="nx-rule" />
              <div>
                <div className="t-eyebrow">
                  {profile.role === "mentor" ? "Mentor" : "Founder"}
                </div>
                <h2
                  className="t-serif"
                  style={{
                    fontSize: 38,
                    margin: "4px 0 0",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {profile.name}
                </h2>
                <p
                  className="t-serif"
                  style={{
                    fontSize: 18,
                    fontStyle: "italic",
                    margin: "12px 0 0",
                    color: "var(--ink-2)",
                    lineHeight: 1.3,
                  }}
                >
                  {profile.industry}
                  {profile.stage ? ` · ${profile.stage}` : ""}
                </p>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    padding: 16,
                    background: "var(--paper)",
                    border: "1px solid var(--ink)",
                    borderRadius: 12,
                    color: "var(--ink)",
                  }}
                >
                  <QRCodeSVG
                    value={profileUrl}
                    size={180}
                    level="H"
                    fgColor="#1c1b18"
                    bgColor="transparent"
                  />
                </div>
                <span
                  className="t-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "var(--ink-3)",
                  }}
                >
                  NEXUS.OS / VIEW / {user.uid.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <hr className="nx-rule" />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div className="t-meta">Industry</div>
                  <span
                    className="t-serif"
                    style={{ fontSize: 20, fontStyle: "italic" }}
                  >
                    {profile.industry}
                  </span>
                </div>
                {profile.role === "startup" &&
                  profile.quality_score !== undefined && (
                    <div style={{ textAlign: "right" }}>
                      <div className="t-meta">Quality</div>
                      <span
                        className="t-serif"
                        style={{ fontSize: 20, fontStyle: "italic" }}
                      >
                        {profile.quality_score} / 100
                      </span>
                    </div>
                  )}
              </div>
            </div>
            <div className="t-meta" style={{ marginTop: 8 }}>
              Updates automatically when your profile changes. Reprint any time
              — old QRs keep working.
            </div>
          </div>

          {/* Scanner + phone preview */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>
                What others see when they scan
              </div>
              <div
                className="nx-card"
                style={{ padding: 20, display: "flex", gap: 20 }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    Scanning your QR opens your{" "}
                    <strong>public profile</strong> in the other
                    person&rsquo;s Nexus app — no rating, no spam, just
                    identity. They can request to connect, and Gemini reads the
                    pairing.
                  </p>
                  <ul
                    style={{
                      marginTop: 12,
                      paddingLeft: 18,
                      fontSize: 13,
                      color: "var(--ink-3)",
                      lineHeight: 1.6,
                    }}
                  >
                    <li>Works offline (link opens on next sign-in)</li>
                    <li>No signal logged on scan — discovery only</li>
                    <li>QR survives profile edits</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>
                Built-in scanner
              </div>
              <div
                className="nx-card"
                style={{ padding: 0, overflow: "hidden" }}
              >
                {!scanning && !scanned && (
                  <div
                    style={{
                      aspectRatio: "16/9",
                      background:
                        "linear-gradient(135deg, oklch(0.22 0.01 80), oklch(0.32 0.01 80))",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 16,
                      color: "var(--paper)",
                    }}
                  >
                    <span
                      className="t-mono"
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.16em",
                        opacity: 0.7,
                      }}
                    >
                      SCANNER READY
                    </span>
                    <NXBtn
                      kind="primary"
                      onClick={() => setScanning(true)}
                    >
                      {Icon.qr} Open camera
                    </NXBtn>
                  </div>
                )}
                {scanning && (
                  <div style={{ padding: 12 }}>
                    <div id="qr-reader" />
                    <NXBtn
                      kind="ghost"
                      size="sm"
                      onClick={() => setScanning(false)}
                      style={{ marginTop: 8 }}
                    >
                      Cancel
                    </NXBtn>
                  </div>
                )}
                {scanned && (
                  <div
                    style={{
                      padding: 28,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <NXPill kind="signal">● Scanned</NXPill>
                    <p
                      className="t-serif"
                      style={{
                        fontSize: 22,
                        fontStyle: "italic",
                        margin: 0,
                      }}
                    >
                      Badge decoded.
                    </p>
                    <code
                      className="t-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        wordBreak: "break-all",
                      }}
                    >
                      {scanned}
                    </code>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={scanned} target="_blank" rel="noopener noreferrer">
                        <NXBtn kind="primary" size="sm">
                          Open profile {Icon.arrow}
                        </NXBtn>
                      </a>
                      <NXBtn
                        kind="ghost"
                        size="sm"
                        onClick={() => {
                          setScanned(null);
                          setScanning(true);
                        }}
                      >
                        Scan another
                      </NXBtn>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadSVG(value: string, name: string) {
  const svg = document.querySelector(
    "svg.qr-export"
  ) as SVGSVGElement | null;
  // Re-render to a fresh SVG element string
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <title>${name} — Nexus QR</title>
  <text x="120" y="120" text-anchor="middle">${value}</text>
</svg>`;
  // Prefer the actual rendered SVG if present
  const source = svg ? new XMLSerializer().serializeToString(svg) : xml;
  const blob = new Blob([source], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(name || "nexus").replace(/\s+/g, "-").toLowerCase()}-badge.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
