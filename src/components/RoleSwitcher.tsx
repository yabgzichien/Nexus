"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROLE_CONFIG = {
  startup: { label: "Startup", route: "/dashboard" },
  mentor: { label: "Mentor", route: "/dashboard" },
  admin: { label: "Programme Manager", route: "/admin/dashboard" },
} as const;

type RoleKey = keyof typeof ROLE_CONFIG;

export default function RoleSwitcher() {
  const { user, profile, updateProfile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user || !profile) return null;

  const currentRole = (profile.role ?? "startup") as RoleKey;
  const current = ROLE_CONFIG[currentRole];

  async function handleSwitch(targetRole: RoleKey) {
    if (switching || targetRole === currentRole) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user!.uid, targetRole }),
      });
      if (!res.ok) throw new Error("Failed to switch role");
      const data = await res.json();
      await updateProfile(data.profile);
      setOpen(false);
      router.push(ROLE_CONFIG[targetRole].route);
    } catch {
      // silently fail for demo
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 50,
      }}
    >
      {open && (
        <div
          className="nx-card"
          style={{
            marginBottom: 8,
            padding: 4,
            minWidth: 220,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="t-eyebrow"
            style={{ padding: "8px 12px 4px" }}
          >
            Demo · switch role
          </div>
          {(Object.keys(ROLE_CONFIG) as RoleKey[]).map((role) => {
            const cfg = ROLE_CONFIG[role];
            const active = role === currentRole;
            return (
              <button
                key={role}
                onClick={() => handleSwitch(role)}
                disabled={switching}
                style={{
                  all: "unset",
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  cursor: switching ? "wait" : "pointer",
                  fontSize: 13,
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--paper)" : "var(--ink)",
                  boxSizing: "border-box",
                  display: "block",
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="nx-btn nx-btn--ghost nx-btn--sm"
        style={{
          background: "var(--paper)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span
          className="nx-dot"
          style={{
            background: "var(--signal)",
          }}
        />
        {switching ? "Switching…" : current.label}
        <span
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
            display: "inline-flex",
          }}
        >
          ▾
        </span>
      </button>
    </div>
  );
}
