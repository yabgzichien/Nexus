"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, UserProfile, Programme } from "@/lib/types";
import cytoscape from "cytoscape";
import {
  AICallout,
  HealthBadge,
  Icon,
  NXBtn,
  NXPill,
  NXSidebar,
  NXTopbar,
  Sparkline,
} from "@/components/nx";

interface RelWithProfiles extends Relationship {
  mentorProfile?: UserProfile;
  startupProfile?: UserProfile;
}

export default function AdminDashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [rels, setRels] = useState<RelWithProfiles[]>([]);
  const [selectedRel, setSelectedRel] = useState<RelWithProfiles | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role !== "admin") router.push("/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "programmes")), (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Programme)
      );
      setProgrammes(list);
      if (list.length && !selectedProgramme) setSelectedProgramme(list[0].id);
    });
    return () => unsub();
  }, [user, selectedProgramme]);

  useEffect(() => {
    if (!selectedProgramme) return;
    setRels([]);
    setSelectedRel(null);
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
    const q = query(
      collection(db, "relationships"),
      where("programme_id", "==", selectedProgramme)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const rel = { id: d.id, ...d.data() } as Relationship;
          const [mDoc, sDoc] = await Promise.all([
            getDoc(doc(db, "users", rel.mentor_id)),
            getDoc(doc(db, "users", rel.startup_id)),
          ]);
          return {
            ...rel,
            mentorProfile: mDoc.exists()
              ? ({ uid: rel.mentor_id, ...mDoc.data() } as UserProfile)
              : undefined,
            startupProfile: sDoc.exists()
              ? ({ uid: rel.startup_id, ...sDoc.data() } as UserProfile)
              : undefined,
          };
        })
      );
      setRels(list);
    });
    return () => unsub();
  }, [selectedProgramme]);

  const initGraph = useCallback(() => {
    if (!graphRef.current || rels.length === 0) return;
    if (cyRef.current) cyRef.current.destroy();
    const nodes: cytoscape.ElementDefinition[] = [];
    const edges: cytoscape.ElementDefinition[] = [];
    const added = new Set<string>();
    rels.forEach((r) => {
      if (!added.has(r.mentor_id)) {
        nodes.push({
          data: {
            id: r.mentor_id,
            label: r.mentorProfile?.name ?? "Mentor",
            type: "mentor",
          },
        });
        added.add(r.mentor_id);
      }
      if (!added.has(r.startup_id)) {
        nodes.push({
          data: {
            id: r.startup_id,
            label: r.startupProfile?.name ?? "Startup",
            type: "startup",
          },
        });
        added.add(r.startup_id);
      }
      edges.push({
        data: {
          id: r.id,
          source: r.mentor_id,
          target: r.startup_id,
          health: r.health_score,
          trend: r.health_trend,
        },
      });
    });

    const cy = cytoscape({
      container: graphRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node[type='mentor']",
          style: {
            "background-color": "#1c1b18",
            label: "data(label)",
            color: "#3b342a",
            "font-size": "10px",
            "font-family": "Geist, system-ui, sans-serif",
            "text-valign": "bottom",
            "text-margin-y": 10,
            width: 44,
            height: 44,
            "border-width": 0,
          },
        },
        {
          selector: "node[type='startup']",
          style: {
            "background-color": "#FAFAF7",
            label: "data(label)",
            color: "#3b342a",
            "font-size": "10px",
            "font-family": "Geist, system-ui, sans-serif",
            "text-valign": "bottom",
            "text-margin-y": 10,
            width: 40,
            height: 40,
            "border-color": "#1c1b18",
            "border-width": 1.8,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2.5,
            "line-color": (ele: cytoscape.EdgeSingular) => {
              const h = ele.data("health") as number;
              if (h >= 70) return "#2A8E5C";
              if (h >= 40) return "#B68720";
              return "#B23A2A";
            },
            "line-style": (ele: cytoscape.EdgeSingular) => {
              return ele.data("trend") === "decaying" ? "dashed" : "solid";
            },
            "curve-style": "bezier",
            opacity: 0.85,
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 4,
            opacity: 1,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 10000,
        idealEdgeLength: () => 160,
      },
    });

    cy.on("tap", "edge", (evt) => {
      const id = evt.target.data("id");
      const rel = rels.find((r) => r.id === id);
      if (rel) setSelectedRel(rel);
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) setSelectedRel(null);
    });

    cyRef.current = cy;
  }, [rels]);

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  if (loading || !profile) return null;

  const atRisk = rels.filter((r) => r.health_trend === "decaying");
  const healthy = rels.filter((r) => r.health_score >= 70).length;
  const stable = rels.filter((r) => r.health_score >= 40 && r.health_score < 70).length;
  const decayingCount = rels.filter((r) => r.health_score < 40).length;
  const medianHealth = rels.length
    ? Math.round(
        [...rels].sort((a, b) => a.health_score - b.health_score)[
          Math.floor(rels.length / 2)
        ].health_score
      )
    : 0;

  return (
    <div className="nx-shell">
      <NXSidebar current="admin" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow={
            programmes.find((p) => p.id === selectedProgramme)?.name
              ? `Programme · ${
                  programmes.find((p) => p.id === selectedProgramme)?.name
                }`
              : "All programmes"
          }
          title="Ecosystem."
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <NXPill>
              <span className="nx-dot nx-dot--signal" />
              {healthy} healthy
            </NXPill>
            <NXPill kind="amber">
              <span className="nx-dot nx-dot--amber" />
              {stable} stable
            </NXPill>
            <NXPill kind="crimson">
              <span className="nx-dot nx-dot--crimson" />
              {decayingCount} at-risk
            </NXPill>
          </div>
          {programmes.length > 1 && (
            <select
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
              style={{
                padding: "7px 12px",
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: 999,
                fontSize: 12,
                color: "var(--ink)",
              }}
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </NXTopbar>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Stats */}
            <div
              style={{
                padding: "16px 28px",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <MiniStat
                n={String(rels.length)}
                l="Live relationships"
                delta={
                  rels.length
                    ? `${atRisk.length} need triage`
                    : "no matches yet"
                }
                tone="ink"
              />
              <MiniStat
                n={String(medianHealth)}
                l="Median health"
                delta={
                  rels.length
                    ? `${healthy} healthy / ${decayingCount} decaying`
                    : "—"
                }
                tone="signal"
              />
              <MiniStat
                n={
                  rels.length
                    ? String(
                        Math.round(
                          rels.reduce(
                            (a, r) => a + (r.edge_weight ?? 0),
                            0
                          ) / rels.length
                        )
                      )
                    : "—"
                }
                l="Avg edge"
                delta="Gemini-scored"
                tone="ink"
              />
              <MiniStat
                n={String(atRisk.length)}
                l="Decaying"
                delta={
                  atRisk.length
                    ? atRisk
                        .slice(0, 2)
                        .map((r) => r.id.slice(0, 4))
                        .join(", ")
                    : "—"
                }
                tone="crimson"
              />
            </div>

            <div
              style={{
                flex: 1,
                position: "relative",
                background: "var(--paper-2)",
                minHeight: 480,
              }}
            >
              {rels.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 10,
                    color: "var(--ink-3)",
                  }}
                >
                  <p
                    className="t-serif"
                    style={{ fontSize: 28, margin: 0 }}
                  >
                    Quiet ecosystem.
                  </p>
                  <p className="t-meta">
                    Run “Generate Matches” to populate this graph.
                  </p>
                  <NXBtn
                    kind="primary"
                    onClick={() => router.push("/admin/programme")}
                  >
                    {Icon.bolt} Generate
                  </NXBtn>
                </div>
              )}
              <div ref={graphRef} style={{ width: "100%", height: "100%" }} />
              <div
                style={{
                  position: "absolute",
                  bottom: 18,
                  left: 18,
                  padding: "10px 14px",
                  background: "var(--paper)",
                  border: "1px solid var(--rule)",
                  borderRadius: "var(--r-md)",
                  display: "flex",
                  gap: 14,
                  fontSize: 11,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: "var(--ink)",
                    }}
                  />{" "}
                  Mentor
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: "var(--paper)",
                      border: "1.5px solid var(--ink)",
                    }}
                  />{" "}
                  Startup
                </span>
                <span
                  style={{
                    width: 1,
                    height: 14,
                    background: "var(--rule)",
                  }}
                />
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      background: "var(--signal)",
                    }}
                  />{" "}
                  healthy
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      background: "var(--amber)",
                    }}
                  />{" "}
                  stable
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      background: "var(--crimson)",
                    }}
                  />{" "}
                  decaying
                </span>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <aside
            style={{
              borderLeft: "1px solid var(--rule)",
              overflow: "auto",
              background: "var(--paper)",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {selectedRel ? (
              <>
                <div>
                  <div className="t-eyebrow">
                    Selected relationship · {selectedRel.id.slice(0, 6)}
                  </div>
                  <h3
                    className="t-serif"
                    style={{
                      fontSize: 26,
                      margin: "6px 0 0",
                      lineHeight: 1.05,
                    }}
                  >
                    {selectedRel.startupProfile?.name ?? "Startup"}{" "}
                    <em style={{ color: "var(--ink-3)" }}>×</em>{" "}
                    {selectedRel.mentorProfile?.name ?? "Mentor"}
                  </h3>
                  <div
                    style={{ display: "flex", gap: 8, marginTop: 10 }}
                  >
                    <HealthBadge
                      score={selectedRel.health_score}
                      trend={selectedRel.health_trend}
                    />
                    <NXPill>edge {selectedRel.edge_weight ?? "—"}</NXPill>
                  </div>
                </div>
                {selectedRel.health_narration && (
                  <AICallout
                    label="Why · Gemini health read"
                    model="Gemini 2.0 Flash"
                  >
                    {selectedRel.health_narration}
                  </AICallout>
                )}
                <div>
                  <div className="t-eyebrow" style={{ marginBottom: 6 }}>
                    Health · sparkline
                  </div>
                  <Sparkline
                    width={290}
                    height={56}
                    color={
                      selectedRel.health_trend === "decaying"
                        ? "var(--crimson)"
                        : "var(--ink)"
                    }
                    points={[
                      Math.max(10, selectedRel.health_score - 30),
                      Math.max(10, selectedRel.health_score - 20),
                      Math.max(10, selectedRel.health_score - 10),
                      selectedRel.health_score,
                    ]}
                  />
                </div>
                {selectedRel.match_narrative && (
                  <div>
                    <div
                      className="t-eyebrow"
                      style={{ marginBottom: 6 }}
                    >
                      Why this match
                    </div>
                    <p
                      className="t-serif"
                      style={{
                        fontSize: 14,
                        fontStyle: "italic",
                        color: "var(--ink-2)",
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      &ldquo;{selectedRel.match_narrative}&rdquo;
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <NXBtn
                    kind="primary"
                    size="sm"
                    onClick={() =>
                      router.push(`/chat/${selectedRel.id}`)
                    }
                  >
                    Open chat {Icon.arrow}
                  </NXBtn>
                  <NXBtn
                    kind="ghost"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/view/${selectedRel.startup_id}`
                      )
                    }
                  >
                    Startup profile
                  </NXBtn>
                </div>
              </>
            ) : (
              <div>
                <div className="t-eyebrow">Tip</div>
                <p
                  className="t-serif"
                  style={{
                    fontSize: 20,
                    fontStyle: "italic",
                    margin: "6px 0 0",
                    lineHeight: 1.35,
                  }}
                >
                  Click an edge to read its health narration.
                </p>
              </div>
            )}

            {atRisk.length > 0 && (
              <>
                <hr className="nx-rule" />
                <div>
                  <div
                    className="t-eyebrow"
                    style={{ marginBottom: 8 }}
                  >
                    At-risk relationships
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {atRisk.map((r) => (
                      <li
                        key={r.id}
                        onClick={() => setSelectedRel(r)}
                        style={{
                          padding: 12,
                          background: "var(--crimson-soft)",
                          borderRadius: "var(--r-md)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--crimson-ink)",
                            }}
                          >
                            {r.startupProfile?.name ?? "—"} ×{" "}
                            {r.mentorProfile?.name ?? "—"}
                          </span>
                          <HealthBadge
                            score={r.health_score}
                            trend={r.health_trend}
                            compact
                          />
                        </div>
                        <span
                          className="t-meta"
                          style={{
                            color: "var(--crimson-ink)",
                            opacity: 0.7,
                          }}
                        >
                          {r.milestones_completed ?? 0}/
                          {r.milestones_total ?? 0} milestones ·{" "}
                          {r.platform_messages_sent ?? 0} msgs
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  n,
  l,
  delta,
  tone,
}: {
  n: string;
  l: string;
  delta: string;
  tone: "ink" | "signal" | "crimson";
}) {
  const color =
    tone === "signal"
      ? "var(--signal-ink)"
      : tone === "crimson"
      ? "var(--crimson-ink)"
      : "var(--ink-3)";
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          className="t-serif"
          style={{
            fontSize: 38,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {n}
        </span>
        <span
          className="t-mono"
          style={{ fontSize: 10, color }}
        >
          {delta}
        </span>
      </div>
      <span
        className="t-label"
        style={{ display: "block", marginTop: 4 }}
      >
        {l}
      </span>
    </div>
  );
}
