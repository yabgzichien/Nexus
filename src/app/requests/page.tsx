"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ConnectionRequest, UserProfile } from "@/lib/types";
import {
  AICallout,
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  NXSearch,
  NXSidebar,
  NXTopbar,
} from "@/components/nx";

interface ReqWithUser extends ConnectionRequest {
  sender: UserProfile;
}

type Tab = "incoming" | "sent" | "archived";

export default function RequestsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState<ReqWithUser[]>([]);
  const [sent, setSent] = useState<ReqWithUser[]>([]);
  const [archived, setArchived] = useState<ReqWithUser[]>([]);
  const [selected, setSelected] = useState<ReqWithUser | null>(null);
  const [tab, setTab] = useState<Tab>("incoming");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsubIn = onSnapshot(
      query(
        collection(db, "connection_requests"),
        where("receiver_id", "==", user.uid),
        where("status", "==", "pending")
      ),
      async (snap) => {
        const list: ReqWithUser[] = [];
        for (const d of snap.docs) {
          const data = d.data() as ConnectionRequest;
          const senderDoc = await getDoc(doc(db, "users", data.sender_id));
          if (senderDoc.exists()) {
            list.push({
              ...data,
              id: d.id,
              sender: {
                uid: data.sender_id,
                ...senderDoc.data(),
              } as UserProfile,
            });
          }
        }
        setIncoming(list);
        setSelected((cur) => cur ?? list[0] ?? null);
      }
    );
    const unsubSent = onSnapshot(
      query(
        collection(db, "connection_requests"),
        where("sender_id", "==", user.uid),
        where("status", "==", "pending")
      ),
      async (snap) => {
        const list: ReqWithUser[] = [];
        for (const d of snap.docs) {
          const data = d.data() as ConnectionRequest;
          const otherDoc = await getDoc(doc(db, "users", data.receiver_id));
          if (otherDoc.exists()) {
            list.push({
              ...data,
              id: d.id,
              sender: {
                uid: data.receiver_id,
                ...otherDoc.data(),
              } as UserProfile,
            });
          }
        }
        setSent(list);
      }
    );
    const unsubArch = onSnapshot(
      query(
        collection(db, "connection_requests"),
        where("receiver_id", "==", user.uid),
        where("status", "in", ["approved", "rejected"])
      ),
      async (snap) => {
        const list: ReqWithUser[] = [];
        for (const d of snap.docs) {
          const data = d.data() as ConnectionRequest;
          const senderDoc = await getDoc(doc(db, "users", data.sender_id));
          if (senderDoc.exists()) {
            list.push({
              ...data,
              id: d.id,
              sender: {
                uid: data.sender_id,
                ...senderDoc.data(),
              } as UserProfile,
            });
          }
        }
        setArchived(list);
      }
    );
    return () => {
      unsubIn();
      unsubSent();
      unsubArch();
    };
  }, [user]);

  const handleApprove = async (r: ReqWithUser) => {
    setProcessing(true);
    await updateDoc(doc(db, "connection_requests", r.id), {
      status: "approved",
    });
    setSelected(null);
    setProcessing(false);
  };

  const handleReject = async (r: ReqWithUser) => {
    setProcessing(true);
    await updateDoc(doc(db, "connection_requests", r.id), {
      status: "rejected",
    });
    setSelected(null);
    setProcessing(false);
  };

  const currentList =
    tab === "incoming" ? incoming : tab === "sent" ? sent : archived;

  if (loading || !profile) return null;

  return (
    <div className="nx-shell">
      <NXSidebar current="requests" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow={`Requests · ${incoming.length} awaiting · ${sent.length} sent`}
          title="Inbox."
        >
          <NXSearch style={{ maxWidth: 280 }} />
        </NXTopbar>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1.4fr",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* List */}
          <div
            style={{
              borderRight: "1px solid var(--rule)",
              overflow: "auto",
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "14px 20px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              {(
                [
                  ["incoming", incoming.length],
                  ["sent", sent.length],
                  ["archived", archived.length],
                ] as const
              ).map(([key, count]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as Tab)}
                  style={{ all: "unset", cursor: "pointer" }}
                >
                  <span
                    className={`nx-pill ${tab === key ? "nx-pill--ink" : ""}`}
                    style={{ textTransform: "capitalize" }}
                  >
                    {key}{" "}
                    <span style={{ opacity: 0.6 }}>{count}</span>
                  </span>
                </button>
              ))}
            </div>
            {currentList.length === 0 ? (
              <div
                className="t-meta"
                style={{ padding: 28, textAlign: "center" }}
              >
                Nothing in {tab}.
              </div>
            ) : (
              currentList.map((q) => {
                const isSel = selected?.id === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelected(q)}
                    style={{
                      all: "unset",
                      display: "flex",
                      gap: 12,
                      width: "100%",
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--rule)",
                      background: isSel ? "var(--paper-2)" : "transparent",
                      borderLeft: `3px solid ${
                        isSel ? "var(--ink)" : "transparent"
                      }`,
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <NXAvatar
                      size="md"
                      id={q.sender.uid}
                      name={q.sender.name}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: 14 }}>
                          {q.sender.name}
                        </span>
                        <span className="t-meta">
                          {q.created_at?.toDate?.()
                            ? relTime(q.created_at.toDate())
                            : ""}
                        </span>
                      </div>
                      <span
                        className="t-meta"
                        style={{
                          fontStyle: "italic",
                          fontFamily: "var(--font-serif)",
                          fontSize: 13,
                        }}
                      >
                        {q.sender.role === "mentor" ? "Mentor" : "Startup"} ·{" "}
                        {q.sender.industry}
                      </span>
                      {q.sender.role === "startup" &&
                        q.sender.quality_score !== undefined && (
                          <div style={{ marginTop: 6 }}>
                            <NXPill kind="ai">
                              {Icon.spark} quality {q.sender.quality_score}
                            </NXPill>
                          </div>
                        )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail */}
          <div style={{ padding: 28, overflow: "auto", minHeight: 0 }}>
            {!selected ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 8,
                }}
              >
                <span className="t-serif" style={{ fontSize: 28 }}>
                  Pick a request.
                </span>
                <span className="t-meta">
                  Nothing selected — start with the highest-edge match.
                </span>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <NXAvatar
                    size="xl"
                    id={selected.sender.uid}
                    name={selected.sender.name}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="t-eyebrow">
                      {selected.sender.role === "mentor"
                        ? "Mentor"
                        : "Startup"}{" "}
                      · {tab === "sent" ? "you contacted" : "wants to connect"}
                    </div>
                    <h2
                      className="t-serif"
                      style={{
                        fontSize: 40,
                        margin: "4px 0 0",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                      }}
                    >
                      {selected.sender.name}
                    </h2>
                    <span
                      className="t-meta"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 16,
                      }}
                    >
                      {selected.sender.industry}
                    </span>
                  </div>
                  <span className="t-meta">
                    {selected.created_at?.toDate?.()
                      ? relTime(selected.created_at.toDate())
                      : ""}
                  </span>
                </div>

                {selected.sender.description && (
                  <div
                    style={{
                      marginTop: 24,
                      padding: 20,
                      background: "var(--paper-2)",
                      borderRadius: "var(--r-lg)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        fontFamily: "var(--font-serif)",
                      }}
                    >
                      &ldquo;{selected.sender.description}&rdquo;
                    </p>
                  </div>
                )}

                <div
                  style={{ display: "flex", gap: 28, marginTop: 24 }}
                >
                  <Stat
                    n={selected.sender.quality_score ?? "—"}
                    l="Quality"
                  />
                  <Stat
                    n={
                      selected.sender.role === "mentor"
                        ? `${selected.sender.years_experience ?? "—"}y`
                        : selected.sender.stage ?? "—"
                    }
                    l={
                      selected.sender.role === "mentor"
                        ? "Tenure"
                        : "Stage"
                    }
                  />
                  <Stat
                    n={
                      selected.sender.role === "mentor"
                        ? selected.sender.expertise_areas?.length ?? 0
                        : selected.sender.tags?.tech_stack?.length ?? 0
                    }
                    l="Tags"
                  />
                </div>

                <hr className="nx-rule" style={{ margin: "24px 0" }} />

                {selected.sender.quality_summary && (
                  <AICallout label="Why this request makes sense">
                    {selected.sender.quality_summary}
                  </AICallout>
                )}

                {selected.sender.role === "mentor" &&
                  selected.sender.expertise_areas?.length && (
                    <div style={{ marginTop: 24 }}>
                      <div
                        className="t-eyebrow"
                        style={{ marginBottom: 10 }}
                      >
                        Expertise
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {selected.sender.expertise_areas.map((t) => (
                          <NXPill key={t} kind="ai">
                            {t}
                          </NXPill>
                        ))}
                      </div>
                    </div>
                  )}

                {tab === "incoming" && selected.status === "pending" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 32,
                      paddingTop: 20,
                      borderTop: "1px solid var(--rule)",
                    }}
                  >
                    <NXBtn
                      kind="primary"
                      onClick={() => handleApprove(selected)}
                      disabled={processing}
                    >
                      {Icon.check} Approve & start chat
                    </NXBtn>
                    <NXBtn
                      kind="ghost"
                      onClick={() => handleReject(selected)}
                      disabled={processing}
                    >
                      Decline politely
                    </NXBtn>
                    <div style={{ flex: 1 }} />
                    <NXBtn
                      kind="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/view/${selected.sender.uid}`)
                      }
                    >
                      View full profile {Icon.arrow}
                    </NXBtn>
                  </div>
                )}

                {tab !== "incoming" && (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 32,
                      paddingTop: 20,
                      borderTop: "1px solid var(--rule)",
                    }}
                  >
                    <NXPill
                      kind={
                        selected.status === "approved"
                          ? "signal"
                          : selected.status === "rejected"
                          ? "crimson"
                          : "amber"
                      }
                    >
                      {selected.status}
                    </NXPill>
                    <div style={{ flex: 1 }} />
                    <NXBtn
                      kind="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/view/${selected.sender.uid}`)
                      }
                    >
                      View full profile {Icon.arrow}
                    </NXBtn>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string | number; l: string }) {
  return (
    <div>
      <div
        className="t-serif"
        style={{
          fontSize: 28,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {n}
      </div>
      <div className="t-meta" style={{ marginTop: 4 }}>
        {l}
      </div>
    </div>
  );
}

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
