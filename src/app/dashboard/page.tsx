"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Milestone, Relationship, UserProfile } from "@/lib/types";
import {
  AICallout,
  HealthBadge,
  Icon,
  NXAvatar,
  NXBtn,
  NXSearch,
  NXSidebar,
  NXTopbar,
  Sparkline,
} from "@/components/nx";
import Link from "next/link";

interface RelWithCounter extends Relationship {
  counter?: UserProfile;
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [rels, setRels] = useState<RelWithCounter[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingRels, setLoadingRels] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !profile) return;
    const field = profile.role === "startup" ? "startup_id" : "mentor_id";
    const q = query(collection(db, "relationships"), where(field, "==", user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const enriched = await Promise.all(
        snap.docs.map(async (d) => {
          const rel = { id: d.id, ...d.data() } as Relationship;
          const otherId =
            profile.role === "startup" ? rel.mentor_id : rel.startup_id;
          const otherDoc = await getDoc(doc(db, "users", otherId));
          return {
            ...rel,
            counter: otherDoc.exists()
              ? ({ uid: otherId, ...otherDoc.data() } as UserProfile)
              : undefined,
          };
        })
      );
      enriched.sort(
        (a, b) =>
          (b.last_active_at?.toMillis?.() ?? 0) -
          (a.last_active_at?.toMillis?.() ?? 0)
      );
      setRels(enriched);
      setLoadingRels(false);
    });
    return () => unsub();
  }, [user, profile]);

  useEffect(() => {
    if (!rels.length) {
      setMilestones([]);
      return;
    }
    (async () => {
      const all: Milestone[] = [];
      for (const r of rels.slice(0, 5)) {
        const ms = await getDocs(
          query(
            collection(db, "milestones"),
            where("relationship_id", "==", r.id),
            limit(20)
          )
        );
        ms.docs.forEach((d) =>
          all.push({ id: d.id, ...d.data() } as Milestone)
        );
      }
      setMilestones(all);
    })();
  }, [rels]);

  if (loading || !profile) return null;

  // Aggregates
  const activeMatches = rels.length;
  const completedMs = milestones.filter((m) => m.status === "completed").length;
  const totalMs = milestones.length;
  const healthAvg = rels.length
    ? Math.round(
        rels.reduce((a, r) => a + (r.health_score || 0), 0) / rels.length
      )
    : 0;
  const improvingCount = rels.filter((r) => r.health_trend === "improving").length;
  const decayingCount = rels.filter((r) => r.health_trend === "decaying").length;

  const stats =
    profile.role === "mentor"
      ? [
          {
            label: "Mentees",
            value: String(activeMatches).padStart(2, "0"),
            sub: `${improvingCount} improving · ${decayingCount} at-risk`,
          },
          {
            label: "Health avg",
            value: String(healthAvg),
            sub: improvingCount ? "↑ improving net" : "stable",
          },
          {
            label: "Milestones signed",
            value: String(completedMs).padStart(2, "0"),
            sub: `${totalMs} total tracked`,
          },
          {
            label: "Quality bar",
            value: "—",
            sub: profile.expertise_areas?.[0] || "Set your expertise",
          },
        ]
      : [
          {
            label: "Quality score",
            value: profile.quality_score
              ? String(profile.quality_score)
              : "—",
            sub: profile.quality_score
              ? "Above gate · qualified"
              : "Upload a deck to score",
          },
          {
            label: "Active matches",
            value: String(activeMatches).padStart(2, "0"),
            sub: `${improvingCount} improving · ${decayingCount} at-risk`,
          },
          {
            label: "Milestones",
            value: `${completedMs}/${totalMs || "—"}`,
            sub: totalMs ? "On pace" : "No milestones yet",
          },
          {
            label: "Health index",
            value: String(healthAvg),
            sub: improvingCount ? "↑ improving net" : "stable",
          },
        ];

  const recentSparkline = rels.length
    ? rels
        .slice(0, 6)
        .map((r) => r.health_score || 50)
        .reverse()
    : [50, 52, 55, 58, 62, 65, 68];

  const upcoming = milestones
    .filter((m) => m.status === "pending")
    .slice(0, 3);
  const recentDone = milestones
    .filter((m) => m.status === "completed")
    .slice(-1);
  const milestoneList = [...upcoming, ...recentDone].slice(0, 4);

  return (
    <div className="nx-shell">
      <NXSidebar current="dashboard" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow={`${
            profile.role === "mentor" ? "Mentor" : "Startup"
          } · Workspace`}
          title={`Welcome back, ${profile.name?.split(" ")[0] ?? "there"}.`}
        >
          <NXSearch style={{ maxWidth: 280 }} />
          <NXBtn kind="ghost" size="sm" onClick={() => router.push("/account#qr")}>
            {Icon.qr} QR Badge
          </NXBtn>
          <NXBtn
            kind="primary"
            size="sm"
            onClick={() => router.push("/matches")}
          >
            {Icon.plus} Find matches
          </NXBtn>
        </NXTopbar>

        <div
          className="nx-scroll"
          style={{
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            {stats.map((s) => (
              <div key={s.label} className="nx-stat">
                <span className="nx-stat__label">{s.label}</span>
                <span className="nx-stat__value">{s.value}</span>
                <span className="nx-stat__delta">{s.sub}</span>
              </div>
            ))}
          </div>

          {/* AI narration */}
          <AICallout
            label="This week's read · Nexus AI"
            model="Gemini 2.0 Flash"
          >
            {profile.role === "mentor"
              ? rels.length
                ? `You have ${activeMatches} mentee${activeMatches === 1 ? "" : "s"} in motion. ${
                    decayingCount
                      ? `${decayingCount} need attention — last signal silence is your leverage.`
                      : "Cadence is solid this week."
                  }`
                : "No mentees yet. Browse matches to start connecting."
              : rels.length
              ? `${
                  improvingCount > 0
                    ? `${improvingCount} relationship${
                        improvingCount === 1 ? "" : "s"
                      } improving.`
                    : "Hold the cadence."
                } ${
                  decayingCount
                    ? `${decayingCount} decaying — a reply this week is the biggest possible signal.`
                    : "Keep shipping milestones; they are the strongest health signal."
                }`
              : "Start with the Matches page to find compatible mentors. Quality decks score higher."}
          </AICallout>

          {/* Two-col body */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 20,
            }}
          >
            {/* Relationships */}
            <div
              className="nx-card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div>
                  <div className="t-eyebrow">Your relationships</div>
                  <h3
                    className="t-serif"
                    style={{ fontSize: 22, margin: "2px 0 0" }}
                  >
                    The graph, today.
                  </h3>
                </div>
                <Link href="/chat">
                  <NXBtn kind="ghost" size="sm">
                    See all {Icon.arrow}
                  </NXBtn>
                </Link>
              </div>
              {loadingRels ? (
                <div
                  className="t-meta"
                  style={{ padding: 28, textAlign: "center" }}
                >
                  Loading relationships…
                </div>
              ) : rels.length === 0 ? (
                <div
                  style={{
                    padding: 28,
                    textAlign: "center",
                    color: "var(--ink-3)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 14 }}>
                    No relationships yet.
                  </p>
                  <p
                    className="t-meta"
                    style={{ marginTop: 4 }}
                  >
                    Wait for your programme manager to generate matches, or
                    request a connection from{" "}
                    <Link href="/matches" className="nx-link">
                      Matches
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--paper-2)" }}>
                      {["Counterpart", "Edge", "Health", "Milestones", "Last signal"].map(
                        (h) => (
                          <th
                            key={h}
                            className="t-mono"
                            style={{
                              textAlign: "left",
                              padding: "10px 20px",
                              fontWeight: 500,
                              fontSize: 10,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "var(--ink-3)",
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rels.slice(0, 5).map((r) => {
                      const c = r.counter;
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderTop: "1px solid var(--rule)",
                            cursor: "pointer",
                          }}
                          onClick={() => router.push(`/chat/${r.id}`)}
                        >
                          <td style={{ padding: "12px 20px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <NXAvatar
                                size="sm"
                                id={c?.uid}
                                name={c?.name ?? "Unknown"}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <span style={{ fontWeight: 500 }}>
                                  {c?.name ?? "Unknown"}
                                </span>
                                <span className="t-meta">
                                  {c?.role === "mentor"
                                    ? c?.expertise_areas?.[0] ?? "Mentor"
                                    : c?.industry ?? "Startup"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            style={{ padding: "12px 20px" }}
                            className="t-num"
                          >
                            {r.edge_weight ?? "—"}
                          </td>
                          <td style={{ padding: "12px 20px" }}>
                            <HealthBadge
                              score={r.health_score}
                              trend={r.health_trend}
                            />
                          </td>
                          <td
                            style={{ padding: "12px 20px" }}
                            className="t-num"
                          >
                            {r.milestones_completed ?? 0}/
                            {r.milestones_total ?? 0}
                          </td>
                          <td
                            style={{ padding: "12px 20px" }}
                            className="t-meta"
                          >
                            {r.last_active_at?.toDate?.()
                              ? formatRelative(r.last_active_at.toDate())
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div className="nx-card" style={{ padding: 20 }}>
                <div className="t-eyebrow" style={{ marginBottom: 6 }}>
                  Next milestones
                </div>
                <h3 className="t-serif" style={{ fontSize: 22, margin: 0 }}>
                  Up next.
                </h3>
                {milestoneList.length === 0 ? (
                  <p
                    className="t-meta"
                    style={{ marginTop: 12 }}
                  >
                    No milestones set yet. They appear here once your mentor
                    creates them.
                  </p>
                ) : (
                  <ul
                    style={{
                      margin: "14px 0 0",
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {milestoneList.map((m, i) => (
                      <li
                        key={m.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 0",
                          borderTop: i ? "1px solid var(--rule)" : 0,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: "1.5px solid var(--ink)",
                            flex: "0 0 18px",
                            background:
                              m.status === "completed"
                                ? "var(--ink)"
                                : "transparent",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--paper)",
                          }}
                        >
                          {m.status === "completed" && Icon.check}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, lineHeight: 1.3 }}>
                            {m.title}
                          </div>
                          <div className="t-meta" style={{ marginTop: 3 }}>
                            {m.blueprint_type}
                            {m.due_at?.toDate?.()
                              ? ` · due ${m.due_at.toDate().toLocaleDateString()}`
                              : ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="nx-card" style={{ padding: 20 }}>
                <div className="t-eyebrow" style={{ marginBottom: 6 }}>
                  Health · trend
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <span
                    className="t-serif"
                    style={{
                      fontSize: 44,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {healthAvg || "—"}
                  </span>
                  <Sparkline
                    width={150}
                    height={42}
                    points={recentSparkline}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <span className="t-meta">{rels.length} relationship{rels.length === 1 ? "" : "s"}</span>
                  <span className="t-meta">{improvingCount} improving</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diff / day);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
