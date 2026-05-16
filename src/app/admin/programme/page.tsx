"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Programme, ProgrammeRegistration, UserProfile } from "@/lib/types";
import {
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  NXSidebar,
  NXTopbar,
} from "@/components/nx";

interface RegWithUser extends ProgrammeRegistration {
  user?: UserProfile;
}

export default function AdminProgrammePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selected, setSelected] = useState<Programme | null>(null);
  const [regs, setRegs] = useState<RegWithUser[]>([]);
  const [startups, setStartups] = useState<UserProfile[]>([]);
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [processingReg, setProcessingReg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState({ quality: 65, edge: 60, maxMentors: 3 });

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
      if (!selected && list.length) setSelected(list[0]);
    });
    return () => unsub();
  }, [user, selected]);

  useEffect(() => {
    if (!selected) {
      setRegs([]);
      setStartups([]);
      setMentors([]);
      return;
    }
    setLoadingPool(true);
    (async () => {
      const regSnap = await getDocs(
        query(
          collection(db, "programme_registrations"),
          where("programme_id", "==", selected.id)
        )
      );
      const regList: RegWithUser[] = [];
      for (const d of regSnap.docs) {
        const r = d.data() as ProgrammeRegistration;
        const u = await getDocs(
          query(
            collection(db, "users"),
            where("__name__", "==", r.user_id)
          )
        );
        regList.push({
          id: d.id,
          programme_id: r.programme_id,
          user_id: r.user_id,
          role: r.role,
          status: r.status,
          created_at: r.created_at,
          user: u.empty
            ? undefined
            : ({ uid: r.user_id, ...u.docs[0].data() } as UserProfile),
        });
      }
      setRegs(regList);

      const sSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "startup"))
      );
      const allS = sSnap.docs.map(
        (d) => ({ uid: d.id, ...d.data() } as UserProfile)
      );
      setStartups(allS);

      const mSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "mentor"))
      );
      setMentors(
        mSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
      );
      setThresholds((t) => ({ ...t, quality: selected.match_threshold ?? 65 }));
      setLoadingPool(false);
    })();
  }, [selected]);

  const handleGenerate = async () => {
    if (!selected) return;
    setMatching(true);
    setMatchResult(null);
    try {
      const r = await fetch("/api/generate-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId: selected.id }),
      });
      const data = await r.json();
      setMatchResult(`Generated ${data.matchCount ?? "?"} pairings.`);
    } catch {
      setMatchResult("Match generation triggered. Check the ecosystem dashboard.");
    }
    setMatching(false);
  };

  const approveReg = async (id: string) => {
    setProcessingReg(id);
    await updateDoc(doc(db, "programme_registrations", id), {
      status: "approved",
    });
    setRegs((p) =>
      p.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    setProcessingReg(null);
  };

  const rejectReg = async (id: string) => {
    setProcessingReg(id);
    await updateDoc(doc(db, "programme_registrations", id), {
      status: "rejected",
    });
    setRegs((p) =>
      p.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
    setProcessingReg(null);
  };

  if (loading || !profile) return null;

  const qualifiedStartups = startups.filter(
    (s) => (s.quality_score ?? 0) >= thresholds.quality
  );
  const belowGate = startups.filter(
    (s) => (s.quality_score ?? 0) < thresholds.quality
  );

  return (
    <div className="nx-shell">
      <NXSidebar current="gen" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow={
            selected
              ? `Programme · ${selected.name}`
              : "Programme management"
          }
          title="Generate matches."
        >
          {programmes.length > 0 && (
            <select
              value={selected?.id ?? ""}
              onChange={(e) =>
                setSelected(
                  programmes.find((p) => p.id === e.target.value) ?? null
                )
              }
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
          <NXBtn
            kind="ghost"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            {Icon.plus} New programme
          </NXBtn>
        </NXTopbar>

        <div
          className="nx-scroll"
          style={{
            padding: 28,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {!selected ? (
            <div
              className="nx-card"
              style={{ padding: 40, textAlign: "center" }}
            >
              <p
                className="t-serif"
                style={{ fontSize: 28, margin: 0 }}
              >
                No programmes yet.
              </p>
              <p className="t-meta" style={{ marginTop: 8 }}>
                Create one to begin generating matches.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 14,
                }}
              >
                <NXBtn
                  kind="primary"
                  onClick={() => setShowCreate(true)}
                >
                  {Icon.plus} Create programme
                </NXBtn>
              </div>
            </div>
          ) : (
            <>
              {/* Hero generate panel */}
              <div
                className="nx-card"
                style={{
                  padding: 28,
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: 32,
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="t-eyebrow">
                    Matching engine · Gemini 2.5 Pro
                  </div>
                  <h2
                    className="t-serif"
                    style={{
                      fontSize: 52,
                      margin: "6px 0 0",
                      letterSpacing: "-0.025em",
                      lineHeight: 1,
                    }}
                  >
                    Run the pairing.
                  </h2>
                  <p
                    style={{
                      marginTop: 14,
                      fontSize: 15,
                      color: "var(--ink-2)",
                      maxWidth: 480,
                      lineHeight: 1.5,
                    }}
                  >
                    Gemini reads every qualified startup against every mentor
                    in this programme and writes a 2–3 sentence narrative for
                    each compatible pairing.
                  </p>

                  <div
                    style={{
                      marginTop: 26,
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    <SliderRow
                      label="Quality gate"
                      value={thresholds.quality}
                      hint="Startups scoring below this don't enter the pool."
                      onChange={(v) =>
                        setThresholds((t) => ({ ...t, quality: v }))
                      }
                    />
                    <SliderRow
                      label="Edge threshold"
                      value={thresholds.edge}
                      hint="Minimum compatibility for a match to be created."
                      onChange={(v) =>
                        setThresholds((t) => ({ ...t, edge: v }))
                      }
                    />
                    <SliderRow
                      label="Max mentors per startup"
                      value={thresholds.maxMentors}
                      max={6}
                      hint="Each startup gets at most this many pairings."
                      onChange={(v) =>
                        setThresholds((t) => ({ ...t, maxMentors: v }))
                      }
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                    <NXBtn
                      kind="primary"
                      onClick={handleGenerate}
                      disabled={matching}
                    >
                      {Icon.bolt}{" "}
                      {matching ? "Generating…" : "Generate matches"}
                    </NXBtn>
                    <NXBtn
                      kind="ghost"
                      onClick={() => router.push("/admin/dashboard")}
                    >
                      View ecosystem
                    </NXBtn>
                  </div>
                  {matchResult && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 12,
                        background: "var(--signal-soft)",
                        color: "var(--signal-ink)",
                        borderRadius: "var(--r-md)",
                        fontSize: 13,
                      }}
                    >
                      {matchResult}
                    </div>
                  )}
                </div>

                <PoolDiagram
                  startups={startups.length}
                  mentors={mentors.length}
                />
              </div>

              {/* Pools */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div
                  className="nx-card"
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div>
                    <div className="t-eyebrow">Startup pool</div>
                    <h3
                      className="t-serif"
                      style={{ fontSize: 24, margin: "2px 0 0" }}
                    >
                      {qualifiedStartups.length} qualified ·{" "}
                      {belowGate.length} below gate
                    </h3>
                  </div>
                  <hr className="nx-rule" />
                  {loadingPool ? (
                    <span className="t-meta">Loading…</span>
                  ) : startups.length === 0 ? (
                    <span className="t-meta">No startups in this cohort.</span>
                  ) : (
                    startups.map((s) => {
                      const q = s.quality_score ?? 0;
                      const ok = q >= thresholds.quality;
                      return (
                        <div
                          key={s.uid}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 0",
                            borderTop: "1px solid var(--rule)",
                            opacity: ok ? 1 : 0.55,
                          }}
                        >
                          <NXAvatar size="sm" id={s.uid} name={s.name} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>
                              {s.name}
                            </div>
                            <span className="t-meta">
                              {s.industry} · {s.stage ?? "—"}
                            </span>
                          </div>
                          <div style={{ width: 60 }}>
                            <div
                              style={{
                                height: 4,
                                background: "var(--paper-3)",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${q}%`,
                                  height: "100%",
                                  background: ok
                                    ? "var(--ink)"
                                    : "var(--crimson)",
                                }}
                              />
                            </div>
                          </div>
                          <span
                            className="t-num"
                            style={{
                              fontSize: 13,
                              minWidth: 32,
                              textAlign: "right",
                            }}
                          >
                            {q}
                          </span>
                          {ok ? (
                            <NXPill kind="signal">✓ in pool</NXPill>
                          ) : (
                            <NXPill kind="crimson">below gate</NXPill>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div
                  className="nx-card"
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div>
                    <div className="t-eyebrow">Mentor pool</div>
                    <h3
                      className="t-serif"
                      style={{ fontSize: 24, margin: "2px 0 0" }}
                    >
                      {mentors.length} mentor{mentors.length === 1 ? "" : "s"}
                    </h3>
                  </div>
                  <hr className="nx-rule" />
                  {loadingPool ? (
                    <span className="t-meta">Loading…</span>
                  ) : mentors.length === 0 ? (
                    <span className="t-meta">No mentors yet.</span>
                  ) : (
                    mentors.map((m) => (
                      <div
                        key={m.uid}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "8px 0",
                          borderTop: "1px solid var(--rule)",
                        }}
                      >
                        <NXAvatar size="sm" id={m.uid} name={m.name} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {m.name}
                          </div>
                          <span className="t-meta">{m.industry}</span>
                        </div>
                        <span className="t-meta" style={{ fontSize: 11 }}>
                          {m.years_experience ?? "—"}y
                        </span>
                        <NXPill>
                          {m.expertise_areas?.length ?? 0} tags
                        </NXPill>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Registrations */}
              <div className="nx-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div className="t-eyebrow">
                      Registrations · {regs.length}
                    </div>
                    <h3
                      className="t-serif"
                      style={{ fontSize: 24, margin: "2px 0 0" }}
                    >
                      Pending approval.
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <NXBtn
                      kind="ghost"
                      size="sm"
                      onClick={() => setEditing(selected)}
                    >
                      Edit programme
                    </NXBtn>
                    <NXBtn
                      kind="danger"
                      size="sm"
                      onClick={async () => {
                        if (!selected) return;
                        if (!confirm(`Delete ${selected.name}?`)) return;
                        setDeletingId(selected.id);
                        await deleteDoc(doc(db, "programmes", selected.id));
                        setSelected(null);
                        setDeletingId(null);
                      }}
                      disabled={deletingId === selected.id}
                    >
                      Delete
                    </NXBtn>
                  </div>
                </div>
                {regs.length === 0 ? (
                  <span className="t-meta">No registrations yet.</span>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {regs.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderTop: "1px solid var(--rule)",
                        }}
                      >
                        <NXAvatar
                          size="sm"
                          id={r.user?.uid}
                          name={r.user?.name ?? "?"}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{ fontSize: 13, fontWeight: 500 }}
                          >
                            {r.user?.name ?? "Unknown"}
                          </div>
                          <span className="t-meta">
                            {r.user?.role === "mentor" ? "Mentor" : "Startup"}{" "}
                            · {r.user?.industry ?? "—"}
                            {r.user?.quality_score !== undefined &&
                              ` · score ${r.user.quality_score}`}
                          </span>
                        </div>
                        {r.status === "pending" ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <NXBtn
                              kind="ghost"
                              size="sm"
                              onClick={() => rejectReg(r.id)}
                              disabled={processingReg === r.id}
                            >
                              Reject
                            </NXBtn>
                            <NXBtn
                              kind="primary"
                              size="sm"
                              onClick={() => approveReg(r.id)}
                              disabled={processingReg === r.id}
                            >
                              {processingReg === r.id ? "…" : "Approve"}
                            </NXBtn>
                          </div>
                        ) : (
                          <NXPill
                            kind={
                              r.status === "approved" ? "signal" : "crimson"
                            }
                          >
                            {r.status}
                          </NXPill>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {(showCreate || editing) && (
        <ProgrammeFormModal
          existing={editing}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          ownerId={user!.uid}
        />
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  hint,
  onChange,
  max = 100,
}: {
  label: string;
  value: number;
  hint: string;
  onChange: (v: number) => void;
  max?: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span className="t-label">{label}</span>
        <span className="t-num" style={{ fontSize: 18 }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ width: "100%" }}
      />
      <div
        style={{
          height: 6,
          background: "var(--paper-3)",
          borderRadius: 999,
          position: "relative",
          marginTop: -10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: "var(--ink)",
            borderRadius: 999,
          }}
        />
      </div>
      <span className="t-meta" style={{ marginTop: 6, display: "block" }}>
        {hint}
      </span>
    </div>
  );
}

function PoolDiagram({
  startups,
  mentors,
}: {
  startups: number;
  mentors: number;
}) {
  const renderS = Math.min(6, Math.max(2, startups || 4));
  const renderM = Math.min(6, Math.max(2, mentors || 4));
  return (
    <div style={{ position: "relative", aspectRatio: "1.1/1", width: "100%" }}>
      <svg viewBox="0 0 480 420" style={{ width: "100%", height: "100%" }}>
        {Array.from({ length: renderS }).map((_, i) => {
          const y = 40 + i * (340 / Math.max(1, renderS - 1));
          return (
            <g key={`s${i}`}>
              <circle
                cx="60"
                cy={y}
                r="14"
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth={1.5}
              />
              <text
                x="60"
                y={y + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="var(--ink-3)"
              >
                S{i + 1}
              </text>
              {[0, 1, 2].map((j) => {
                const yj =
                  40 + ((i + j) % renderM) * (340 / Math.max(1, renderM - 1));
                return (
                  <line
                    key={j}
                    x1="74"
                    y1={y}
                    x2="406"
                    y2={yj}
                    stroke="var(--ink-3)"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                );
              })}
            </g>
          );
        })}
        {Array.from({ length: renderM }).map((_, i) => {
          const y = 40 + i * (340 / Math.max(1, renderM - 1));
          return (
            <g key={`m${i}`}>
              <circle
                cx="420"
                cy={y}
                r="14"
                fill="var(--ink)"
                stroke="var(--ink)"
                strokeWidth="1.5"
              />
              <text
                x="420"
                y={y + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="var(--paper)"
              >
                M{i + 1}
              </text>
            </g>
          );
        })}
        <rect
          x="180"
          y="180"
          width="120"
          height="60"
          rx="30"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="1.5"
        />
        <text
          x="240"
          y="208"
          textAnchor="middle"
          fontFamily="var(--font-serif)"
          fontStyle="italic"
          fontSize="20"
          fill="var(--ink)"
        >
          Gemini
        </text>
        <text
          x="240"
          y="225"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="9"
          letterSpacing="0.14em"
          fill="var(--ink-3)"
        >
          2.5 PRO
        </text>
        <text
          x="60"
          y="20"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="10"
          letterSpacing="0.14em"
          fill="var(--ink-3)"
        >
          STARTUPS · {startups}
        </text>
        <text
          x="420"
          y="20"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="10"
          letterSpacing="0.14em"
          fill="var(--ink-3)"
        >
          MENTORS · {mentors}
        </text>
      </svg>
    </div>
  );
}

function ProgrammeFormModal({
  existing,
  onClose,
  ownerId,
}: {
  existing: Programme | null;
  onClose: () => void;
  ownerId: string;
}) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [threshold, setThreshold] = useState(existing?.match_threshold ?? 60);
  const [startDate, setStartDate] = useState(
    existing?.start_date?.toDate?.()?.toISOString().split("T")[0] ?? ""
  );
  const [endDate, setEndDate] = useState(
    existing?.end_date?.toDate?.()?.toISOString().split("T")[0] ?? ""
  );
  const [venue, setVenue] = useState(existing?.venue ?? "");
  const [regDeadline, setRegDeadline] = useState(
    existing?.registration_deadline?.toDate?.()?.toISOString().split("T")[0] ?? ""
  );
  const [capacity, setCapacity] = useState(
    existing?.capacity?.toString() ?? ""
  );
  const [prereqs, setPrereqs] = useState(existing?.prerequisites ?? "");
  const [contact, setContact] = useState(existing?.contact_email ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const data: Record<string, unknown> = {
      name,
      description,
      match_threshold: threshold,
      start_date: startDate ? Timestamp.fromDate(new Date(startDate)) : null,
      end_date: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
      venue: venue || null,
      registration_deadline: regDeadline
        ? Timestamp.fromDate(new Date(regDeadline))
        : null,
      capacity: capacity ? parseInt(capacity) : null,
      prerequisites: prereqs || null,
      contact_email: contact || null,
    };
    if (isEdit) {
      await updateDoc(doc(db, "programmes", existing!.id), data);
    } else {
      await addDoc(collection(db, "programmes"), {
        ...data,
        status: "active",
        created_by: ownerId,
        created_at: Timestamp.now(),
      });
    }
    setBusy(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,18,12,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="nx-card"
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 16px",
          maxHeight: "85vh",
          overflow: "auto",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 className="t-serif" style={{ fontSize: 32, margin: 0 }}>
            {isEdit ? "Edit programme" : "Create programme"}
          </h2>
          <button
            onClick={onClose}
            style={{ all: "unset", cursor: "pointer" }}
          >
            {Icon.close}
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div className="nx-field" style={{ gridColumn: "span 2" }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="nx-field" style={{ gridColumn: "span 2" }}>
            <label>Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="nx-field">
            <label>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="nx-field">
            <label>End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="nx-field">
            <label>Registration deadline</label>
            <input
              type="date"
              value={regDeadline}
              onChange={(e) => setRegDeadline(e.target.value)}
            />
          </div>
          <div className="nx-field">
            <label>Venue</label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="nx-field">
            <label>Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div className="nx-field">
            <label>Quality threshold ({threshold})</label>
            <input
              type="range"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
            />
          </div>
          <div className="nx-field" style={{ gridColumn: "span 2" }}>
            <label>Prerequisites</label>
            <textarea
              rows={2}
              value={prereqs}
              onChange={(e) => setPrereqs(e.target.value)}
            />
          </div>
          <div className="nx-field" style={{ gridColumn: "span 2" }}>
            <label>Contact email</label>
            <input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <NXBtn kind="ghost" onClick={onClose}>
            Cancel
          </NXBtn>
          <NXBtn kind="primary" onClick={submit} disabled={busy || !name}>
            {busy ? "Saving…" : isEdit ? "Save" : "Create"}
          </NXBtn>
        </div>
      </div>
    </div>
  );
}
