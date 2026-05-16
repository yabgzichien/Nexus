"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JSX } from "react";
import { Icon } from "./icons";
import { NXAvatar } from "./primitives";
import { useAuth } from "@/lib/auth-context";

type NavKey = string;
type NavItem = [label: string, icon: JSX.Element, key: NavKey, href: string];
type NavGroup = [groupLabel: string, items: NavItem[]];

const NAV: Record<"startup" | "mentor" | "admin", NavGroup[]> = {
  startup: [
    [
      "Workspace",
      [
        ["Dashboard", Icon.home, "dashboard", "/dashboard"],
        ["Matches", Icon.spark, "matches", "/matches"],
        ["Requests", Icon.inbox, "requests", "/requests"],
        ["Chats", Icon.chat, "chat", "/chat"],
      ],
    ],
    [
      "Discover",
      [
        ["Programmes", Icon.layers, "programmes", "/programmes"],
        ["QR Badge", Icon.qr, "qr", "/account#qr"],
      ],
    ],
    [
      "You",
      [
        ["Profile", Icon.user, "profile", "/account"],
        ["Settings", Icon.settings, "settings", "/account"],
      ],
    ],
  ],
  mentor: [
    [
      "Workspace",
      [
        ["Dashboard", Icon.home, "dashboard", "/dashboard"],
        ["Matches", Icon.spark, "matches", "/matches"],
        ["Requests", Icon.inbox, "requests", "/requests"],
        ["Chats", Icon.chat, "chat", "/chat"],
      ],
    ],
    [
      "Discover",
      [
        ["Programmes", Icon.layers, "programmes", "/programmes"],
        ["QR Badge", Icon.qr, "qr", "/account#qr"],
      ],
    ],
    [
      "You",
      [
        ["Profile", Icon.user, "profile", "/account"],
        ["Settings", Icon.settings, "settings", "/account"],
      ],
    ],
  ],
  admin: [
    [
      "Programme",
      [
        ["Ecosystem", Icon.graph, "admin", "/admin/dashboard"],
        ["Generate", Icon.spark, "gen", "/admin/programme"],
      ],
    ],
    [
      "You",
      [
        ["Profile", Icon.user, "profile", "/account"],
        ["Settings", Icon.settings, "settings", "/account"],
      ],
    ],
  ],
};

export function NXSidebar({
  current,
  persona,
}: {
  current?: string;
  persona?: "startup" | "mentor" | "admin";
}) {
  const { profile } = useAuth();
  const pathname = usePathname() ?? "";
  const role = persona ?? profile?.role ?? "startup";
  const items = NAV[role];

  const isActive = (key: string, href: string) => {
    if (current) return current === key;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="nx-sidebar">
      <Link href="/" className="nx-sidebar__brand">
        <span style={{ fontStyle: "italic" }}>Nexus</span>
        <small>OS · v0.4</small>
      </Link>
      {items.map(([group, links]) => (
        <div key={group}>
          <div className="nx-sidebar__group">{group}</div>
          <div className="nx-nav">
            {links.map(([label, icon, key, href]) => {
              const active = isActive(key, href);
              return (
                <Link
                  key={key}
                  href={href}
                  className={`nx-nav__item ${active ? "nx-nav__item--active" : ""}`}
                >
                  <span style={{ width: 14, display: "inline-flex" }}>{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      {profile && (
        <Link
          href="/account"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 8px",
            borderTop: "1px solid var(--rule)",
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <NXAvatar size="sm" name={profile.name} id={profile.uid} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.2,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {profile.name || "Profile"}
            </span>
            <span className="t-meta" style={{ textTransform: "capitalize" }}>
              {role === "admin" ? "Programme Manager" : role}
            </span>
          </div>
        </Link>
      )}
    </aside>
  );
}
