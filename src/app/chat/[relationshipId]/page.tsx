"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, Milestone, Message, UserProfile } from "@/lib/types";
import {
  HealthBadge,
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  NXSidebar,
  Sparkline,
} from "@/components/nx";

export default function ChatDetailPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const relationshipId = params.relationshipId as string;

  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [other, setOther] = useState<UserProfile | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const scrollEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!relationshipId) return;
    const unsub = onSnapshot(
      doc(db, "relationships", relationshipId),
      (s) => {
        if (s.exists())
          setRelationship({ id: s.id, ...s.data() } as Relationship);
      }
    );
    return () => unsub();
  }, [relationshipId]);

  useEffect(() => {
    if (!relationship || !profile) return;
    const otherId =
      profile.role === "startup"
        ? relationship.mentor_id
        : relationship.startup_id;
    getDoc(doc(db, "users", otherId)).then((s) => {
      if (s.exists()) setOther({ uid: otherId, ...s.data() } as UserProfile);
    });
    const unsub = onSnapshot(
      query(
        collection(db, "milestones"),
        where("relationship_id", "==", relationshipId)
      ),
      (snap) =>
        setMilestones(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Milestone))
        )
    );
    return () => unsub();
  }, [relationship, profile, relationshipId]);

  useEffect(() => {
    if (!relationshipId || !user) return;
    const unsub = onSnapshot(
      query(
        collection(db, "messages"),
        where("relationship_id", "==", relationshipId),
        orderBy("timestamp", "asc")
      ),
      async (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Message)
        );
        setMessages(list);
        // mark unread as read
        const unread = snap.docs.filter(
          (d) => !d.data().read && d.data().sender_id !== user.uid
        );
        for (const d of unread) {
          await updateDoc(doc(db, "messages", d.id), { read: true });
        }
      }
    );
    return () => unsub();
  }, [relationshipId, user]);

  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || !relationshipId) return;
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        relationship_id: relationshipId,
        sender_id: user.uid,
        text: text.trim(),
        timestamp: Timestamp.now(),
        read: false,
      });
      setText("");
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;

  const handleToggle = async (m: Milestone) => {
    if (!user || !relationship || !relationshipId) return;
    setToggling(m.id);
    const isCompleting = m.status === "pending";
    try {
      await updateDoc(doc(db, "milestones", m.id), {
        status: isCompleting ? "completed" : "pending",
        completed_at: isCompleting ? Timestamp.now() : null,
      });
      await addDoc(collection(db, "signals"), {
        relationship_id: relationshipId,
        signal_type: "milestone_complete",
        actor_id: user.uid,
        timestamp: Timestamp.now(),
        metadata: {
          milestone_id: m.id,
          action: isCompleting ? "complete" : "revert",
        },
      });
      const newCompleted = isCompleting ? completedCount + 1 : completedCount - 1;
      await updateDoc(doc(db, "relationships", relationshipId), {
        milestones_completed: newCompleted,
        last_active_at: Timestamp.now(),
      });
      if (isCompleting) {
        fetch("/api/health-narration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipId }),
        });
      }
    } catch (err) {
      console.error(err);
    }
    setToggling(null);
  };

  if (loading || !relationship || !profile) return null;

  return (
    <div className="nx-shell">
      <NXSidebar current="chat" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          minHeight: "100vh",
          minWidth: 0,
        }}
      >
        {/* Conversation */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid var(--rule)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--paper)",
            }}
          >
            <button
              onClick={() => router.push("/chat")}
              style={{
                all: "unset",
                cursor: "pointer",
                color: "var(--ink-2)",
              }}
            >
              {Icon.arrowLeft}
            </button>
            <NXAvatar size="md" id={other?.uid} name={other?.name ?? ""} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{other?.name ?? "—"}</div>
              <span className="t-meta">
                {other?.role === "mentor" ? "Mentor" : "Startup"} ·{" "}
                {other?.industry ?? "—"}
              </span>
            </div>
            <HealthBadge
              score={relationship.health_score}
              trend={relationship.health_trend}
            />
            {other && (
              <NXBtn
                kind="ghost"
                size="sm"
                onClick={() => router.push(`/view/${other.uid}`)}
              >
                {Icon.user} Profile
              </NXBtn>
            )}
          </div>

          <div
            className="nx-scroll"
            style={{
              flex: 1,
              padding: 24,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "var(--paper)",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  margin: "auto",
                  textAlign: "center",
                  color: "var(--ink-3)",
                }}
              >
                <p
                  className="t-serif"
                  style={{
                    fontSize: 22,
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  Start the conversation.
                </p>
                <p className="t-meta" style={{ marginTop: 6 }}>
                  Even a short reply is a strong signal.
                </p>
              </div>
            ) : (
              messages.map((m, i) => {
                const own = m.sender_id === user?.uid;
                const showDate = shouldShowDate(m, messages[i - 1]);
                return (
                  <div key={m.id}>
                    {showDate && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          margin: "8px 0",
                        }}
                      >
                        <span
                          className="nx-pill"
                          style={{ background: "var(--paper-2)" }}
                        >
                          {formatDateHeader(m.timestamp.toDate())}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: own ? "flex-end" : "flex-start",
                        gap: 4,
                      }}
                    >
                      <span className="t-meta">
                        {!own && (other?.name ? `${other.name} · ` : "")}
                        {m.timestamp?.toDate?.().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) ?? ""}
                      </span>
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "11px 14px",
                          borderRadius: 14,
                          fontSize: 13.5,
                          lineHeight: 1.45,
                          background: own ? "var(--ink)" : "var(--paper-2)",
                          color: own ? "var(--paper)" : "var(--ink)",
                          borderTopRightRadius: own ? 4 : 14,
                          borderTopLeftRadius: own ? 14 : 4,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollEnd} />
          </div>

          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--rule)",
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "var(--paper)",
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Write to ${other?.name ?? "…"}`}
              style={{
                flex: 1,
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: 999,
                padding: "10px 16px",
                fontFamily: "inherit",
                fontSize: 13.5,
                outline: "none",
                color: "var(--ink)",
              }}
            />
            <NXBtn
              kind="primary"
              size="sm"
              onClick={handleSend}
              disabled={sending || !text.trim()}
            >
              Send {Icon.arrow}
            </NXBtn>
          </div>
        </div>

        {/* Workspace */}
        <aside
          style={{
            borderLeft: "1px solid var(--rule)",
            overflow: "auto",
            background: "var(--paper)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>
              Relationship health
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 10 }}
            >
              <span
                className="t-serif"
                style={{
                  fontSize: 56,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {relationship.health_score}
              </span>
              <NXPill
                kind={
                  relationship.health_trend === "improving"
                    ? "signal"
                    : relationship.health_trend === "decaying"
                    ? "crimson"
                    : "amber"
                }
              >
                {relationship.health_trend === "improving"
                  ? "↑"
                  : relationship.health_trend === "decaying"
                  ? "↓"
                  : "·"}{" "}
                {relationship.health_trend}
              </NXPill>
            </div>
            <Sparkline
              width={280}
              height={48}
              points={[
                Math.max(20, relationship.health_score - 25),
                Math.max(20, relationship.health_score - 18),
                Math.max(20, relationship.health_score - 12),
                Math.max(20, relationship.health_score - 6),
                relationship.health_score,
              ]}
            />
            {relationship.health_narration && (
              <>
                <div
                  className="t-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ai)",
                    marginTop: 14,
                    marginBottom: 4,
                  }}
                >
                  {Icon.spark} Health narration
                </div>
                <p
                  className="t-serif"
                  style={{
                    fontSize: 14,
                    fontStyle: "italic",
                    margin: 0,
                    color: "var(--ink-2)",
                    lineHeight: 1.4,
                  }}
                >
                  {relationship.health_narration}
                </p>
              </>
            )}
          </div>

          <hr className="nx-rule" />

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <div className="t-eyebrow">
                Milestones · {completedCount} of {totalCount}
              </div>
            </div>
            {milestones.length === 0 ? (
              <p className="t-meta">No milestones yet.</p>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {milestones.map((m, i) => (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "8px 0",
                      borderTop: i ? "1px solid var(--rule)" : 0,
                    }}
                  >
                    <button
                      onClick={() => handleToggle(m)}
                      disabled={
                        toggling === m.id || profile?.role !== "startup"
                      }
                      style={{
                        all: "unset",
                        cursor:
                          profile?.role === "startup"
                            ? "pointer"
                            : "default",
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: "1.5px solid var(--ink)",
                        flex: "0 0 16px",
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
                    </button>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          lineHeight: 1.3,
                          textDecoration:
                            m.status === "completed"
                              ? "line-through"
                              : "none",
                          color:
                            m.status === "completed"
                              ? "var(--ink-3)"
                              : "var(--ink)",
                        }}
                      >
                        {m.title}
                      </div>
                      <span
                        className="t-meta"
                        style={{ fontSize: 10 }}
                      >
                        {m.blueprint_type}
                        {m.due_at?.toDate?.()
                          ? ` · due ${m.due_at.toDate().toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {relationship.match_narrative && (
            <>
              <hr className="nx-rule" />
              <div>
                <div className="t-eyebrow" style={{ marginBottom: 6 }}>
                  Why this match
                </div>
                <p
                  className="t-serif"
                  style={{
                    fontSize: 14,
                    fontStyle: "italic",
                    margin: 0,
                    color: "var(--ink-2)",
                    lineHeight: 1.4,
                  }}
                >
                  &ldquo;{relationship.match_narrative}&rdquo;
                </p>
                <span
                  className="t-meta"
                  style={{ display: "block", marginTop: 6 }}
                >
                  edge {relationship.edge_weight}
                </span>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function shouldShowDate(curr: Message, prev?: Message) {
  if (!prev) return true;
  const a = curr.timestamp?.toDate?.().toDateString();
  const b = prev.timestamp?.toDate?.().toDateString();
  return a !== b;
}

function formatDateHeader(d: Date) {
  const today = new Date();
  const diff = Math.floor(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
