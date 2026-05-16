"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon, NXBtn, NXPill } from "@/components/nx";

export default function Home() {
  const { user, profile, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      router.push(profile.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } else if (!loading && user && !profile) {
      router.push("/auth/role-select");
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--paper)",
        }}
      >
        <span className="t-meta">Loading…</span>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top nav */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flex: 1,
          }}
        >
          <span
            className="t-serif"
            style={{
              fontSize: 26,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
            }}
          >
            Nexus
          </span>
          <span
            className="t-mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
            }}
          >
            OS · v0.4
          </span>
        </div>
        <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Why Nexus", "Programmes", "For Admins", "Manifesto"].map((x) => (
            <a
              key={x}
              style={{ fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}
            >
              {x}
            </a>
          ))}
          <NXBtn kind="ghost" size="sm" onClick={signInWithGoogle}>
            Log in
          </NXBtn>
          <NXBtn kind="primary" size="sm" onClick={signInWithGoogle}>
            Get access {Icon.arrow}
          </NXBtn>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          padding: "64px 40px 40px",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 56,
          alignItems: "center",
          flex: 1,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <NXPill kind="ink">
              <span
                className="nx-dot"
                style={{ background: "var(--signal)" }}
              />
              LIVE — Q1 2026 Cohort
            </NXPill>
            <span className="t-meta">42 days · 18 mentors · 24 startups</span>
          </div>
          <h1
            className="t-serif"
            style={{
              fontSize: 92,
              lineHeight: 0.95,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Relationships
            <br />
            <em>aren&rsquo;t ratings.</em>
            <br />
            They are{" "}
            <span style={{ borderBottom: "4px solid var(--ink)" }}>
              signals.
            </span>
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "var(--ink-2)",
              maxWidth: 540,
              marginTop: 28,
              lineHeight: 1.45,
            }}
          >
            Nexus is the relationship operating system for innovation
            ecosystems. We read pitch decks, generate matches, and watch the
            relationship breathe — quietly, continuously, without surveys.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <NXBtn kind="primary" onClick={signInWithGoogle}>
              Continue with Google {Icon.arrow}
            </NXBtn>
          </div>
          <div
            style={{
              display: "flex",
              gap: 40,
              marginTop: 56,
              paddingTop: 24,
              borderTop: "1px solid var(--rule)",
            }}
          >
            {(
              [
                ["No ratings.", "Behavioural signals only."],
                ["Cross-cohort memory.", "Every match makes the next smarter."],
                ["Physical-digital bridge.", "QR badges at every event."],
              ] as const
            ).map(([t, s]) => (
              <div key={t} style={{ flex: 1 }}>
                <div
                  className="t-mono"
                  style={{ fontSize: 11, fontWeight: 500 }}
                >
                  {t}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginTop: 4,
                  }}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>

        <HeroNetwork />
      </section>

      {/* Footer strip */}
      <section
        style={{
          padding: "24px 40px",
          borderTop: "1px solid var(--rule)",
          display: "flex",
          gap: 40,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span className="t-eyebrow">Powering</span>
        {[
          "Innovation Spark",
          "Growth Catalyst",
          "Deep Tech",
          "LIVE! Edition",
        ].map((p) => (
          <span
            key={p}
            className="t-serif"
            style={{
              fontSize: 22,
              fontStyle: "italic",
              color: "var(--ink-3)",
            }}
          >
            {p}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <span className="t-meta">Built with Gemini · Firebase · Vercel</span>
      </section>
    </main>
  );
}

function HeroNetwork() {
  const nodes = [
    { id: "m1", x: 60, y: 80, r: 22, kind: "mentor", label: "Daniel" },
    { id: "m2", x: 410, y: 50, r: 22, kind: "mentor", label: "Suraya" },
    { id: "m3", x: 480, y: 290, r: 22, kind: "mentor", label: "Dr. Wong" },
    { id: "s1", x: 200, y: 200, r: 28, kind: "startup", label: "Veridian" },
    { id: "s2", x: 320, y: 360, r: 26, kind: "startup", label: "Pondok" },
    { id: "s3", x: 100, y: 360, r: 24, kind: "startup", label: "Lapis" },
    { id: "s4", x: 380, y: 160, r: 28, kind: "startup", label: "Tropika" },
  ];
  const edges = [
    { a: "m3", b: "s1", h: "signal" },
    { a: "m1", b: "s3", h: "signal" },
    { a: "m1", b: "s4", h: "amber" },
    { a: "m2", b: "s2", h: "signal" },
    { a: "m3", b: "s2", h: "crimson" },
    { a: "m2", b: "s4", h: "amber" },
    { a: "m3", b: "s4", h: "signal" },
  ];
  const n = (id: string) => nodes.find((x) => x.id === id)!;
  const cmap: Record<string, string> = {
    signal: "var(--signal)",
    amber: "var(--amber)",
    crimson: "var(--crimson)",
  };
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1/1",
        width: "100%",
        maxWidth: 540,
        marginInline: "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid var(--rule)",
          borderRadius: "var(--r-xl)",
          background: "var(--paper-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 20,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span className="t-eyebrow">Ecosystem · Sample</span>
          <span className="t-serif" style={{ fontSize: 22, fontStyle: "italic" }}>
            Innovation Spark
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            display: "flex",
            gap: 8,
          }}
        >
          <NXPill kind="signal">
            <span className="nx-dot nx-dot--signal" />
            healthy
          </NXPill>
          <NXPill kind="amber">
            <span className="nx-dot nx-dot--amber" />
            stable
          </NXPill>
          <NXPill kind="crimson">
            <span className="nx-dot nx-dot--crimson" />
            decaying
          </NXPill>
        </div>

        <svg
          viewBox="0 0 540 440"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {edges.map((e, i) => {
            const A = n(e.a);
            const B = n(e.b);
            return (
              <line
                key={i}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={cmap[e.h]}
                strokeWidth={e.h === "crimson" ? 1.5 : 2.5}
                strokeDasharray={e.h === "crimson" ? "4 4" : ""}
                opacity="0.85"
              />
            );
          })}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={node.kind === "mentor" ? "var(--ink)" : "var(--paper)"}
                stroke="var(--ink)"
                strokeWidth="1.5"
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontFamily="Instrument Serif"
                fontSize={node.kind === "mentor" ? 14 : 12}
                fill={node.kind === "mentor" ? "var(--paper)" : "var(--ink)"}
                fontStyle="italic"
              >
                {node.label.split(" ")[0]}
              </text>
            </g>
          ))}
        </svg>

        <div
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            maxWidth: 230,
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--r-md)",
            padding: 12,
          }}
        >
          <div
            className="t-mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              color: "var(--ai)",
              textTransform: "uppercase",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {Icon.spark} Health narration
          </div>
          <div
            className="t-serif"
            style={{
              fontSize: 14,
              fontStyle: "italic",
              lineHeight: 1.35,
              color: "var(--ink-2)",
            }}
          >
            Veridian ↔ Dr. Wong has shipped 4 of 6 milestones and is improving.
            The pairing matters: MARDI grant is at week 8.
          </div>
        </div>
      </div>
    </div>
  );
}
