"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Programme, ProgrammeRegistration } from "@/lib/types";
import {
  Icon,
  NXBtn,
  NXPill,
  NXSearch,
  NXSidebar,
  NXTopbar,
} from "@/components/nx";

type FilterKey = "all" | "open" | "active" | "completed" | "eligible";

export default function ProgrammesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<ProgrammeRegistration[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/programme");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "programmes"));
    const unsub = onSnapshot(q, (snap) =>
      setProgrammes(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Programme))
      )
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "programme_registrations"),
      where("user_id", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) =>
      setRegistrations(
        snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ProgrammeRegistration)
        )
      )
    );
    return () => unsub();
  }, [user]);

  const handleRegister = async (programmeId: string) => {
    if (!user || !profile) return;
    setRegistering(programmeId);
    try {
      await addDoc(collection(db, "programme_registrations"), {
        programme_id: programmeId,
        user_id: user.uid,
        role: profile.role,
        status: "pending",
        created_at: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to register:", err);
    }
    setRegistering(null);
  };

  const getRegistration = (id: string) =>
    registrations.find((r) => r.programme_id === id);

  const isEligible = (p: Programme) => {
    if (!profile) return false;
    if (profile.role === "mentor") return true;
    return (profile.quality_score || 0) >= p.match_threshold;
  };

  const filtered = programmes.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    switch (filter) {
      case "open":
        return p.status === "active" && (!getRegistration(p.id));
      case "active":
        return p.status === "active";
      case "completed":
        return p.status === "completed";
      case "eligible":
        return isEligible(p);
      default:
        return true;
    }
  });

  const formatDate = (ts?: Timestamp) => {
    if (!ts?.toDate) return null;
    return ts.toDate().toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const daysLeft = (ts?: Timestamp) => {
    if (!ts?.toDate) return null;
    const diff = ts.toDate().getTime() - Date.now();
    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
  };

  if (loading || !profile) return null;

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open enrolment" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "eligible", label: "Eligible to me" },
  ];

  return (
    <div className="nx-shell">
      <NXSidebar current="programmes" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar eyebrow="Programmes" title="Browse cohorts.">
          <NXSearch
            style={{ maxWidth: 320 }}
            placeholder="Search programmes…"
            value={search}
            onChange={setSearch}
          />
          <NXBtn
            kind="primary"
            size="sm"
            onClick={() => router.push("/account")}
          >
            Edit my profile {Icon.arrow}
          </NXBtn>
        </NXTopbar>

        <div
          className="nx-scroll"
          style={{ padding: 28, overflow: "auto" }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{ all: "unset", cursor: "pointer" }}
              >
                <span
                  className={`nx-pill ${filter === key ? "nx-pill--ink" : ""}`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div
              className="t-meta"
              style={{ padding: 40, textAlign: "center" }}
            >
              No programmes match this filter.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
              }}
            >
              {filtered.map((p) => {
                const reg = getRegistration(p.id);
                const eligible = isEligible(p);
                const dl = daysLeft(p.end_date);
                return (
                  <div
                    key={p.id}
                    className="nx-card"
                    style={{
                      padding: 22,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div className="t-eyebrow">
                          {formatDate(p.start_date) ?? "TBD"} · Nexus
                        </div>
                        <h3
                          className="t-serif"
                          style={{
                            fontSize: 30,
                            margin: "6px 0 0",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {p.name}
                        </h3>
                      </div>
                      <NXPill
                        kind={p.status === "active" ? "signal" : "default"}
                      >
                        {p.status === "active" ? "● live" : "○ completed"}
                      </NXPill>
                    </div>

                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-2)",
                        margin: 0,
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.description || "No description provided."}
                    </p>

                    <hr className="nx-rule" style={{ margin: "4px 0" }} />

                    <div style={{ display: "flex", gap: 28 }}>
                      <Stat
                        n={p.capacity ?? "—"}
                        l="Capacity"
                      />
                      <Stat n={p.match_threshold} l="Quality gate" />
                      <Stat
                        n={dl ?? "—"}
                        l={dl ? "Days left" : "Date TBD"}
                      />
                    </div>

                    {p.venue && (
                      <div className="t-meta">📍 {p.venue}</div>
                    )}

                    <div style={{ display: "flex", gap: 10 }}>
                      <NXBtn
                        kind="ghost"
                        size="sm"
                        onClick={() => setSelectedProgramme(p)}
                      >
                        View details
                      </NXBtn>
                      {p.status === "active" && !reg && eligible && (
                        <NXBtn
                          kind="primary"
                          size="sm"
                          onClick={() => handleRegister(p.id)}
                          disabled={registering === p.id}
                        >
                          {registering === p.id ? "…" : "Register"} {Icon.arrow}
                        </NXBtn>
                      )}
                      {p.status === "active" && !reg && !eligible && (
                        <NXPill kind="crimson">
                          Need {p.match_threshold}+ quality
                        </NXPill>
                      )}
                      {reg && (
                        <NXPill
                          kind={
                            reg.status === "approved"
                              ? "signal"
                              : reg.status === "rejected"
                              ? "crimson"
                              : "amber"
                          }
                        >
                          {reg.status}
                        </NXPill>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedProgramme && (
        <ProgrammeModal
          programme={selectedProgramme}
          onClose={() => setSelectedProgramme(null)}
          eligible={isEligible(selectedProgramme)}
          profileScore={profile.quality_score}
        />
      )}
    </div>
  );
}

function Stat({ n, l }: { n: string | number; l: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        className="t-serif"
        style={{
          fontSize: 26,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <span className="t-meta" style={{ marginTop: 4 }}>
        {l}
      </span>
    </div>
  );
}

function ProgrammeModal({
  programme,
  onClose,
  eligible,
  profileScore,
}: {
  programme: Programme;
  onClose: () => void;
  eligible: boolean;
  profileScore?: number;
}) {
  const fmt = (ts?: Timestamp) =>
    ts?.toDate?.().toLocaleString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) ?? "TBD";

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
          maxWidth: 560,
          margin: "0 16px",
          maxHeight: "80vh",
          overflow: "auto",
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div className="t-eyebrow">
              {fmt(programme.start_date)} · Nexus
            </div>
            <h2
              className="t-serif"
              style={{
                fontSize: 36,
                margin: "6px 0 0",
                letterSpacing: "-0.02em",
              }}
            >
              {programme.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset",
              cursor: "pointer",
              color: "var(--ink-3)",
            }}
          >
            {Icon.close}
          </button>
        </div>

        <p
          style={{
            margin: "18px 0 0",
            color: "var(--ink-2)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {programme.description}
        </p>

        <hr className="nx-rule" style={{ margin: "20px 0" }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <KV k="Start" v={fmt(programme.start_date)} />
          <KV k="End" v={fmt(programme.end_date)} />
          <KV k="Venue" v={programme.venue ?? "TBD"} />
          <KV
            k="Registration deadline"
            v={fmt(programme.registration_deadline)}
          />
          <KV
            k="Capacity"
            v={programme.capacity?.toString() ?? "Unlimited"}
          />
          <KV
            k="Quality threshold"
            v={`${programme.match_threshold} / 100`}
          />
        </div>

        {programme.prerequisites && (
          <>
            <div
              className="t-eyebrow"
              style={{ marginTop: 18, marginBottom: 4 }}
            >
              Prerequisites
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--ink-2)",
              }}
            >
              {programme.prerequisites}
            </p>
          </>
        )}

        {programme.contact_email && (
          <>
            <div
              className="t-eyebrow"
              style={{ marginTop: 18, marginBottom: 4 }}
            >
              Contact
            </div>
            <p style={{ margin: 0, fontSize: 13 }}>
              <a
                href={`mailto:${programme.contact_email}`}
                className="nx-link"
              >
                {programme.contact_email}
              </a>
            </p>
          </>
        )}

        {!eligible && (
          <div
            style={{
              marginTop: 18,
              padding: 12,
              background: "var(--crimson-soft)",
              color: "var(--crimson-ink)",
              borderRadius: "var(--r-md)",
              fontSize: 13,
            }}
          >
            Your current quality score ({profileScore ?? 0}/100) is below the
            programme threshold ({programme.match_threshold}/100). Upload a
            stronger pitch deck or wait for re-evaluation.
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="t-label">{k}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{v}</div>
    </div>
  );
}
