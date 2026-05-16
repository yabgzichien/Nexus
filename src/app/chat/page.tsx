"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  where,
  query,
  getDocs,
  addDoc,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message, Relationship, UserProfile } from "@/lib/types";
import {
  HealthBadge,
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  NXSearch,
  NXSidebar,
  NXTopbar,
} from "@/components/nx";

interface ChatPreview {
  relationship: Relationship;
  other: UserProfile;
  lastMessage: Message | null;
  unread: number;
}

interface ConnectedPerson {
  uid: string;
  profile: UserProfile;
  requestId: string;
}

export default function ChatListPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [connected, setConnected] = useState<ConnectedPerson[]>([]);
  const [filter, setFilter] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const userCache = useRef<Map<string, UserProfile>>(new Map());
  const msgRef = useRef<Map<string, Message[]>>(new Map());

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/dashboard");
  }, [user, profile, loading, router]);

  // Load relationships (existing chats) — query both sides so nothing is missed
  useEffect(() => {
    if (!user || !profile) return;

    const relIds = new Set<string>();
    const rels = new Map<string, Relationship>();

    const processSnap = async (
      snap: QuerySnapshot<DocumentData>
    ) => {
      for (const d of snap.docs) {
        if (!relIds.has(d.id)) {
          relIds.add(d.id);
          rels.set(d.id, { id: d.id, ...d.data() } as Relationship);
        } else {
          rels.set(d.id, { id: d.id, ...d.data() } as Relationship);
        }
      }

      const need: string[] = [];
      for (const r of rels.values()) {
        const otherId =
          r.startup_id === user.uid ? r.mentor_id : r.startup_id;
        if (!userCache.current.has(otherId)) need.push(otherId);
      }
      if (need.length) {
        const docs = await Promise.all(
          need.map((id) => getDoc(doc(db, "users", id)))
        );
        docs.forEach((d, i) => {
          if (d.exists())
            userCache.current.set(need[i], {
              uid: need[i],
              ...d.data(),
            } as UserProfile);
        });
      }

      const previews: ChatPreview[] = Array.from(rels.values()).map((r) => {
        const otherId =
          r.startup_id === user.uid ? r.mentor_id : r.startup_id;
        const other = userCache.current.get(otherId) ?? ({
          uid: otherId,
          name: "Unknown",
          role: "startup",
        } as UserProfile);
        const messages = msgRef.current.get(r.id) ?? [];
        const last = messages.reduce<Message | null>((acc, m) => {
          if (!acc) return m;
          return (m.timestamp?.toMillis?.() ?? 0) >
            (acc.timestamp?.toMillis?.() ?? 0)
            ? m
            : acc;
        }, null);
        const unread = messages.filter(
          (m) => !m.read && m.sender_id !== user.uid
        ).length;
        return { relationship: r, other, lastMessage: last, unread };
      });

      previews.sort(
        (a, b) =>
          (b.lastMessage?.timestamp?.toMillis?.() ?? 0) -
          (a.lastMessage?.timestamp?.toMillis?.() ?? 0)
      );
      setChats(previews);
    };

    const unsubA = onSnapshot(
      query(collection(db, "relationships"), where("startup_id", "==", user.uid)),
      processSnap
    );
    const unsubB = onSnapshot(
      query(collection(db, "relationships"), where("mentor_id", "==", user.uid)),
      processSnap
    );

    const unsubMsgs = onSnapshot(collection(db, "messages"), (snap) => {
      const grouped = new Map<string, Message[]>();
      snap.docs.forEach((d) => {
        const m = { id: d.id, ...d.data() } as Message;
        const arr = grouped.get(m.relationship_id) ?? [];
        arr.push(m);
        grouped.set(m.relationship_id, arr);
      });
      msgRef.current = grouped;
      setChats((prev) =>
        [...prev]
          .map((c) => {
            const arr = grouped.get(c.relationship.id) ?? [];
            const last = arr.reduce<Message | null>((acc, m) => {
              if (!acc) return m;
              return (m.timestamp?.toMillis?.() ?? 0) >
                (acc.timestamp?.toMillis?.() ?? 0)
                ? m
                : acc;
            }, null);
            const unread = arr.filter(
              (m) => !m.read && m.sender_id !== user.uid
            ).length;
            return { ...c, lastMessage: last, unread };
          })
          .sort(
            (a, b) =>
              (b.lastMessage?.timestamp?.toMillis?.() ?? 0) -
              (a.lastMessage?.timestamp?.toMillis?.() ?? 0)
          )
      );
    });

    return () => {
      unsubA();
      unsubB();
      unsubMsgs();
    };
  }, [user, profile]);

  // Load approved connections (people you're connected with but may not have a relationship/chat yet)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sentSnap = await getDocs(
        query(
          collection(db, "connection_requests"),
          where("sender_id", "==", user.uid),
          where("status", "==", "approved")
        )
      );
      const rcvSnap = await getDocs(
        query(
          collection(db, "connection_requests"),
          where("receiver_id", "==", user.uid),
          where("status", "==", "approved")
        )
      );

      const pairs: { otherId: string; requestId: string }[] = [];
      sentSnap.docs.forEach((d) => {
        pairs.push({ otherId: d.data().receiver_id as string, requestId: d.id });
      });
      rcvSnap.docs.forEach((d) => {
        pairs.push({ otherId: d.data().sender_id as string, requestId: d.id });
      });

      // dedupe
      const seen = new Set<string>();
      const unique = pairs.filter(({ otherId }) => {
        if (seen.has(otherId)) return false;
        seen.add(otherId);
        return true;
      });

      const people: ConnectedPerson[] = [];
      for (const { otherId, requestId } of unique) {
        let p = userCache.current.get(otherId);
        if (!p) {
          const snap = await getDoc(doc(db, "users", otherId));
          if (snap.exists()) {
            p = { uid: otherId, ...snap.data() } as UserProfile;
            userCache.current.set(otherId, p);
          }
        }
        if (p) people.push({ uid: otherId, profile: p, requestId });
      }
      setConnected(people);
    })();
  }, [user]);

  // Find or create a relationship doc and navigate to it
  const handleStartChat = async (person: ConnectedPerson) => {
    if (!user || !profile) return;
    setStarting(person.uid);

    // Check if a relationship already exists between these two users
    const [snapA, snapB] = await Promise.all([
      getDocs(
        query(
          collection(db, "relationships"),
          where("startup_id", "==", user.uid),
          where("mentor_id", "==", person.uid)
        )
      ),
      getDocs(
        query(
          collection(db, "relationships"),
          where("mentor_id", "==", user.uid),
          where("startup_id", "==", person.uid)
        )
      ),
    ]);

    let relId: string | null = null;
    if (!snapA.empty) relId = snapA.docs[0].id;
    else if (!snapB.empty) relId = snapB.docs[0].id;

    if (!relId) {
      // Determine startup vs mentor roles for the relationship doc
      const isMyRoleStartup = profile.role === "startup";
      const relData = {
        startup_id: isMyRoleStartup ? user.uid : person.uid,
        mentor_id: isMyRoleStartup ? person.uid : user.uid,
        programme_id: "direct",
        created_at: Timestamp.now(),
        last_active_at: Timestamp.now(),
        health_score: 50,
        health_trend: "stable",
        health_narration: "",
        platform_messages_sent: 0,
        milestones_total: 0,
        milestones_completed: 0,
        edge_weight: 0,
        match_narrative: "Direct connection",
        outcome_status: "active",
      };
      const ref = await addDoc(collection(db, "relationships"), relData);
      relId = ref.id;
    }

    setStarting(null);
    setShowNewChat(false);
    router.push(`/chat/${relId}`);
  };

  if (loading || !profile) return null;

  const filtered = chats.filter((c) =>
    !filter
      ? true
      : (c.other.name + (c.lastMessage?.text ?? ""))
          .toLowerCase()
          .includes(filter.toLowerCase())
  );

  // Connected people who already have a relationship (chat exists)
  const chatsOtherIds = new Set(chats.map((c) => c.other.uid));
  const readyToChat = connected.filter((p) => !chatsOtherIds.has(p.uid));

  return (
    <div className="nx-shell">
      <NXSidebar current="chat" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow={`Chats · ${chats.length} active · ${readyToChat.length} ready to start`}
          title="Conversations."
        >
          <NXSearch
            style={{ maxWidth: 280 }}
            value={filter}
            onChange={setFilter}
            placeholder="Search a name or message…"
          />
          <NXBtn
            kind="primary"
            size="sm"
            onClick={() => setShowNewChat(true)}
            disabled={connected.length === 0}
          >
            {Icon.plus} New chat
          </NXBtn>
        </NXTopbar>

        <div
          className="nx-scroll"
          style={{
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Active chats */}
          {filtered.length === 0 && readyToChat.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--ink-3)",
              }}
            >
              <p className="t-serif" style={{ fontSize: 28, margin: 0 }}>
                No conversations yet.
              </p>
              <p className="t-meta" style={{ marginTop: 8 }}>
                Connect with someone from Matches, then start a chat here.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <NXBtn kind="primary" onClick={() => router.push("/matches")}>
                  {Icon.spark} Browse matches
                </NXBtn>
              </div>
            </div>
          ) : (
            <>
              {filtered.length > 0 && (
                <>
                  <div
                    className="t-eyebrow"
                    style={{
                      padding: "16px 28px 8px",
                      borderBottom: "1px solid var(--rule)",
                    }}
                  >
                    Active conversations
                  </div>
                  {filtered.map((c) => (
                    <ChatRow
                      key={c.relationship.id}
                      chat={c}
                      currentUserId={user?.uid ?? ""}
                      onClick={() =>
                        router.push(`/chat/${c.relationship.id}`)
                      }
                    />
                  ))}
                </>
              )}

              {/* People ready to chat (connected but no chat started) */}
              {readyToChat.length > 0 && (
                <>
                  <div
                    className="t-eyebrow"
                    style={{
                      padding: "16px 28px 8px",
                      borderBottom: "1px solid var(--rule)",
                      marginTop: filtered.length ? 8 : 0,
                    }}
                  >
                    Connected · start a conversation
                  </div>
                  {readyToChat.map((p) => (
                    <button
                      key={p.uid}
                      onClick={() => handleStartChat(p)}
                      disabled={starting === p.uid}
                      style={{
                        all: "unset",
                        cursor: starting === p.uid ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 28px",
                        borderBottom: "1px solid var(--rule)",
                        width: "100%",
                        boxSizing: "border-box",
                        background: "var(--paper-2)",
                      }}
                    >
                      <NXAvatar
                        size="md"
                        id={p.profile.uid}
                        name={p.profile.name}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {p.profile.name}
                        </div>
                        <div className="t-meta" style={{ marginTop: 2 }}>
                          {p.profile.role === "mentor" ? "Mentor" : "Startup"}{" "}
                          · {p.profile.industry ?? "—"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--ink-2)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        {starting === p.uid
                          ? "Starting…"
                          : <>Start chat {Icon.arrow}</>}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <NewChatModal
          connected={connected}
          starting={starting}
          onStart={handleStartChat}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
}

function ChatRow({
  chat,
  currentUserId,
  onClick,
}: {
  chat: ChatPreview;
  currentUserId: string;
  onClick: () => void;
}) {
  const timeStr = chat.lastMessage?.timestamp?.toDate?.()
    ? relTime(chat.lastMessage.timestamp.toDate())
    : "";

  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 28px",
        borderBottom: "1px solid var(--rule)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <NXAvatar size="md" id={chat.other.uid} name={chat.other.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {chat.other.name}
          </span>
          <span className="t-meta" style={{ flexShrink: 0 }}>
            {timeStr}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
          }}
        >
          <span
            className="t-meta"
            style={{
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontStyle: chat.lastMessage ? "normal" : "italic",
            }}
          >
            {chat.lastMessage
              ? chat.lastMessage.sender_id === currentUserId
                ? `You: ${chat.lastMessage.text}`
                : chat.lastMessage.text
              : "No messages yet — say hello"}
          </span>
          <HealthBadge
            score={chat.relationship.health_score}
            trend={chat.relationship.health_trend}
            compact
          />
        </div>
      </div>
      {chat.unread > 0 && (
        <NXPill kind="ink" style={{ flexShrink: 0 }}>
          {chat.unread}
        </NXPill>
      )}
    </button>
  );
}

function NewChatModal({
  connected,
  starting,
  onStart,
  onClose,
}: {
  connected: ConnectedPerson[];
  starting: string | null;
  onStart: (p: ConnectedPerson) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = connected.filter((p) =>
    !search
      ? true
      : p.profile.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.profile.industry ?? "").toLowerCase().includes(search.toLowerCase())
  );

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
          maxWidth: 480,
          margin: "0 16px",
          maxHeight: "70vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 20px 12px",
            borderBottom: "1px solid var(--rule)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h2 className="t-serif" style={{ fontSize: 26, margin: 0 }}>
            Start a new chat
          </h2>
          <button
            onClick={onClose}
            style={{ all: "unset", cursor: "pointer", color: "var(--ink-3)" }}
          >
            {Icon.close}
          </button>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)" }}>
          <div className="nx-search" style={{ maxWidth: "100%" }}>
            {Icon.search}
            <input
              autoFocus
              placeholder="Search your connections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                outline: "none",
                font: "inherit",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div
              className="t-meta"
              style={{ padding: 24, textAlign: "center" }}
            >
              {connected.length === 0
                ? "No approved connections yet. Go to Matches to connect with people."
                : "No results for that search."}
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.uid}
                onClick={() => onStart(p)}
                disabled={starting === p.uid}
                style={{
                  all: "unset",
                  cursor: starting === p.uid ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 20px",
                  width: "100%",
                  boxSizing: "border-box",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <NXAvatar
                  size="md"
                  id={p.profile.uid}
                  name={p.profile.name}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {p.profile.name}
                  </div>
                  <div className="t-meta" style={{ marginTop: 2 }}>
                    {p.profile.role === "mentor" ? "Mentor" : "Startup"} ·{" "}
                    {p.profile.industry ?? "—"}
                    {p.profile.role === "mentor" &&
                      p.profile.years_experience &&
                      ` · ${p.profile.years_experience}y`}
                    {p.profile.role === "startup" &&
                      p.profile.quality_score !== undefined &&
                      ` · score ${p.profile.quality_score}`}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: starting === p.uid ? "var(--ink-3)" : "var(--ink)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {starting === p.uid ? "Starting…" : <>Chat {Icon.arrow}</>}
                </span>
              </button>
            ))
          )}
        </div>

        {connected.length === 0 && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--rule)",
              textAlign: "center",
            }}
          >
            <a
              href="/matches"
              style={{
                fontSize: 13,
                color: "var(--ink)",
                textDecoration: "underline",
                textDecorationColor: "var(--rule-strong)",
              }}
            >
              Browse matches to connect with people
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
