"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROLE_CONFIG = {
  startup: {
    label: "Startup",
    badge: "bg-green-500/20 text-green-400 border-green-500/30",
    route: "/chat",
  },
  mentor: {
    label: "Mentor",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    route: "/chat",
  },
  admin: {
    label: "Programme Manager",
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    route: "/admin/dashboard",
  },
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

  if (!user) return null;

  const currentRole = (profile?.role ?? "startup") as RoleKey;
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
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-2 bg-gray-900 border border-gray-700 rounded-xl shadow-lg shadow-black/50 p-1 min-w-[200px]">
          {(Object.keys(ROLE_CONFIG) as RoleKey[]).map((role) => {
            const cfg = ROLE_CONFIG[role];
            const isActive = role === currentRole;
            return (
              <button
                key={role}
                onClick={() => handleSwitch(role)}
                disabled={switching}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "ring-2 ring-blue-500 bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-full px-4 py-2 shadow-lg shadow-black/50 hover:bg-gray-800 transition-all duration-200"
      >
        {switching ? (
          <svg
            className="animate-spin h-4 w-4 text-white"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${current.badge}`}
          >
            {current.label}
          </span>
        )}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
}
