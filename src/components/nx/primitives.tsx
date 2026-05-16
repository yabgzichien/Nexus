"use client";

import { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Icon } from "./icons";

/* ─── Initials + tone helpers ─── */
export function initials(name = ""): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarTone(id = ""): string {
  const tones = ["#1c1b18", "#3b342a", "#2e2b27", "#403832", "#2a2521"];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return tones[Math.abs(h) % tones.length];
}

/* ─── Avatar ─── */
export function NXAvatar({
  id,
  name = "",
  size = "md",
  tone,
  className = "",
  style,
}: {
  id?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const bg = tone ?? avatarTone(id || name);
  return (
    <span
      className={`nx-avatar nx-avatar--${size} ${className}`}
      style={{ background: bg, ...style }}
    >
      {initials(name) || "?"}
    </span>
  );
}

/* ─── Pill ─── */
export function NXPill({
  kind = "default",
  children,
  style,
  className = "",
}: {
  kind?: "default" | "signal" | "amber" | "crimson" | "ai" | "ink";
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const m: Record<string, string> = {
    default: "",
    signal: "nx-pill--signal",
    amber: "nx-pill--amber",
    crimson: "nx-pill--crimson",
    ai: "nx-pill--ai",
    ink: "nx-pill--ink",
  };
  return (
    <span className={`nx-pill ${m[kind]} ${className}`} style={style}>
      {children}
    </span>
  );
}

/* ─── Health badge ─── */
export function HealthBadge({
  score,
  trend,
  compact = false,
}: {
  score: number;
  trend?: "improving" | "stable" | "decaying";
  compact?: boolean;
}) {
  const kind = score >= 70 ? "signal" : score >= 40 ? "amber" : "crimson";
  const sym = trend === "improving" ? "↑" : trend === "decaying" ? "↓" : "·";
  return (
    <NXPill kind={kind}>
      <span
        className={`nx-dot nx-dot--${kind}`}
        style={{ background: "currentColor" }}
      />
      <span className="t-num">{score}</span>
      {!compact && trend && (
        <span style={{ opacity: 0.65 }}>
          {sym} {trend}
        </span>
      )}
    </NXPill>
  );
}

/* ─── Quality meter ─── */
export function QualityMeter({
  breakdown,
  size = "md",
}: {
  breakdown?: Partial<{
    problem_clarity: number;
    market_size: number;
    team_strength: number;
    mvp_readiness: number;
  }>;
  size?: "sm" | "md";
}) {
  const order: [keyof NonNullable<typeof breakdown>, string][] = [
    ["problem_clarity", "Problem"],
    ["market_size", "Market"],
    ["team_strength", "Team"],
    ["mvp_readiness", "MVP"],
  ];
  const h = size === "sm" ? 24 : 36;
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
      {order.map(([k, label]) => {
        const v = breakdown?.[k] ?? 0;
        return (
          <div
            key={k}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 22,
                height: h,
                background: "var(--paper-3)",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${(v / 25) * 100}%`,
                  background: "var(--ink)",
                }}
              />
            </div>
            {size !== "sm" && (
              <span className="t-meta" style={{ fontSize: 9 }}>
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Sparkline ─── */
export function Sparkline({
  points = [50, 52, 55, 53, 58, 62, 68, 72, 70, 74, 78, 82, 80, 84, 87],
  color = "var(--ink)",
  width = 120,
  height = 32,
}: {
  points?: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((p - min) / range) * (height - 4) - 2).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── AI Callout ─── */
export function AICallout({
  children,
  label = "Nexus AI",
  model = "Gemini 2.0 Flash",
}: {
  children: ReactNode;
  label?: string;
  model?: string;
}) {
  return (
    <div
      style={{
        background: "var(--ai-soft)",
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        border: "1px solid transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="t-mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ai)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {Icon.spark}
          {label}
        </span>
        <span
          className="t-meta"
          style={{ fontSize: 9, color: "var(--ai)", opacity: 0.7 }}
        >
          {model}
        </span>
      </div>
      <p
        className="t-serif"
        style={{
          fontSize: 17,
          fontStyle: "italic",
          margin: 0,
          color: "var(--ai)",
          letterSpacing: "-0.01em",
          lineHeight: 1.4,
        }}
      >
        {children}
      </p>
    </div>
  );
}

/* ─── Button ─── */
type BtnKind = "primary" | "ghost" | "accent" | "danger";
export function NXBtn({
  kind = "ghost",
  size,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: BtnKind;
  size?: "sm";
}) {
  const cls = `nx-btn nx-btn--${kind} ${size === "sm" ? "nx-btn--sm" : ""} ${className}`;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ─── Search ─── */
export function NXSearch({
  placeholder = "Search the network…",
  value,
  onChange,
  style,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div className="nx-search" style={style}>
      {Icon.search}
      <input
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 0,
          background: "transparent",
          outline: "none",
          font: "inherit",
          color: "var(--ink)",
        }}
      />
      <span className="t-mono" style={{ fontSize: 10, opacity: 0.5 }}>
        ⌘K
      </span>
    </div>
  );
}

/* ─── Section heading ─── */
export function SectionHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 16,
      }}
    >
      <div>
        {eyebrow && (
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>
            {eyebrow}
          </div>
        )}
        <h2
          className="t-serif"
          style={{
            fontSize: 28,
            margin: 0,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ─── Topbar ─── */
export function NXTopbar({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="nx-topbar">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
        }}
      >
        {eyebrow && <span className="t-eyebrow">{eyebrow}</span>}
        <h1 className="nx-topbar__title">{title}</h1>
      </div>
      {children}
      {action && <div>{action}</div>}
    </header>
  );
}

/* ─── Toggle ─── */
export function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        width: 36,
        height: 20,
        borderRadius: 999,
        background: on ? "var(--ink)" : "var(--paper-3)",
        position: "relative",
        flex: "0 0 36px",
        cursor: "pointer",
        border: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "var(--paper)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}
