"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/types";
import { Icon, NXBtn, NXPill } from "@/components/nx";

type RoleKind = "active" | "default" | "locked";

interface RoleCardProps {
  role: UserRole;
  kind: RoleKind;
  num: string;
  label: string;
  tag: string;
  description: string;
  bullets: string[];
  onClick?: () => void;
}

export default function RoleSelectPage() {
  const { user, profile, loading, setUserRole } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<UserRole>("startup");
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile) {
      router.push(profile.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [user, profile, loading, router]);

  if (loading || !user) return null;

  const handleContinue = async () => {
    setContinuing(true);
    if (selected === "admin") {
      await setUserRole("admin");
      router.push("/admin/dashboard");
    } else {
      router.push(`/auth/setup?role=${selected}`);
    }
    setContinuing(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
      }}
    >
      <header
        style={{
          padding: "20px 40px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span className="t-serif" style={{ fontSize: 22, fontStyle: "italic" }}>
          Nexus
        </span>
        <span className="t-meta" style={{ marginLeft: "auto" }}>
          {user.email} · signed in via Google
        </span>
      </header>

      <section
        style={{
          flex: 1,
          padding: "60px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
        }}
      >
        <div style={{ maxWidth: 720, textAlign: "center" }}>
          <div className="t-eyebrow" style={{ marginBottom: 14 }}>
            Step 01 / 03 · Identity
          </div>
          <h1
            className="t-serif"
            style={{
              fontSize: 64,
              margin: 0,
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            How are you arriving
            <br />
            <em>to the network?</em>
          </h1>
          <p
            style={{
              color: "var(--ink-3)",
              marginTop: 18,
              fontSize: 16,
            }}
          >
            Your answer changes how Nexus reads your profile and who it
            surfaces.
            <br />
            You can join a second programme later as a different role.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            width: "100%",
            maxWidth: 1080,
          }}
        >
          <RoleCard
            role="startup"
            kind={selected === "startup" ? "active" : "default"}
            num="01"
            label="Startup"
            tag="building something"
            description="You're shipping a product, hunting for the right operator-investor-thinker."
            bullets={[
              "Upload your pitch deck",
              "Gemini extracts your tags",
              "Get a quality score & matched mentors",
            ]}
            onClick={() => setSelected("startup")}
          />
          <RoleCard
            role="mentor"
            kind={selected === "mentor" ? "active" : "default"}
            num="02"
            label="Mentor"
            tag="lending pattern recognition"
            description="You've done this before. Share your superpower across programmes."
            bullets={[
              "Tell Nexus your expertise areas",
              "Get matched to qualified startups",
              "Track milestones, not meetings",
            ]}
            onClick={() => setSelected("mentor")}
          />
          <RoleCard
            role="admin"
            kind={selected === "admin" ? "active" : "default"}
            num="03"
            label="Programme Manager"
            tag="running a cohort"
            description="Admin access. Generate matches, watch the ecosystem health graph."
            bullets={["Invite-only — contact your programme administrator"]}
            onClick={() => setSelected("admin")}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <NXBtn kind="ghost" size="sm" onClick={() => router.push("/")}>
            ← Back
          </NXBtn>
          <NXBtn
            kind="primary"
            onClick={handleContinue}
            disabled={continuing}
          >
            {continuing
              ? "…"
              : `Continue as ${
                  selected === "admin"
                    ? "Programme Manager"
                    : selected[0].toUpperCase() + selected.slice(1)
                }`}{" "}
            {Icon.arrow}
          </NXBtn>
        </div>
      </section>
    </main>
  );
}

function RoleCard({
  kind,
  num,
  label,
  tag,
  description,
  bullets,
  onClick,
}: RoleCardProps) {
  const active = kind === "active";
  const locked = kind === "locked";
  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        all: "unset",
        cursor: locked ? "not-allowed" : "pointer",
        border: active ? "1.5px solid var(--ink)" : "1px solid var(--rule)",
        background: active ? "var(--paper)" : "var(--paper-2)",
        borderRadius: "var(--r-xl)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: locked ? 0.6 : 1,
        position: "relative",
        minHeight: 360,
        transition: "all .15s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <span
          className="t-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "var(--ink-3)",
          }}
        >
          {num}
        </span>
        {active && (
          <NXPill kind="ink">
            <span className="nx-dot" style={{ background: "var(--paper)" }} />
            SELECTED
          </NXPill>
        )}
        {locked && <NXPill>INVITE-ONLY</NXPill>}
      </div>
      <h3
        className="t-serif"
        style={{ fontSize: 44, margin: 0, letterSpacing: "-0.02em" }}
      >
        {label}
      </h3>
      <span
        className="t-meta"
        style={{
          fontStyle: "italic",
          fontFamily: "var(--font-serif)",
          fontSize: 16,
        }}
      >
        — {tag}
      </span>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-2)",
          margin: "8px 0 0",
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>
      <hr className="nx-rule" style={{ margin: "6px 0", width: "100%" }} />
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "100%",
        }}
      >
        {bullets.map((b, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 12.5,
              color: "var(--ink-2)",
            }}
          >
            <span
              className="t-mono"
              style={{
                fontSize: 10,
                color: "var(--ink-3)",
                minWidth: 14,
              }}
            >
              —
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
