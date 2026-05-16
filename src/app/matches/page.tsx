"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import {
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  NXSearch,
  NXSidebar,
  NXTopbar,
  SectionHead,
} from "@/components/nx";

export default function MatchesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoadingRecs(true);
      const target = profile.role === "startup" ? "mentor" : "startup";
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", target), limit(30))
      );
      const users = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter((u) => u.industry);
      const same = users.filter((u) => u.industry === profile.industry);
      const others = users.filter((u) => u.industry !== profile.industry);
      setRecommendations([...same, ...others].slice(0, 6));
      setLoadingRecs(false);
    })();
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const target = profile.role === "startup" ? "mentor" : "startup";
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", target), limit(60))
      );
      const lower = searchQuery.toLowerCase();
      setSearchResults(
        snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
          .filter((u) => u.name?.toLowerCase().includes(lower))
          .slice(0, 12)
      );
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, user, profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const sent = await getDocs(
        query(
          collection(db, "connection_requests"),
          where("sender_id", "==", user.uid)
        )
      );
      const rcv = await getDocs(
        query(
          collection(db, "connection_requests"),
          where("receiver_id", "==", user.uid)
        )
      );
      const map = new Map<string, string>();
      sent.docs.forEach((d) => {
        const data = d.data();
        map.set(data.receiver_id, data.status);
      });
      rcv.docs.forEach((d) => {
        const data = d.data();
        map.set(data.sender_id, data.status);
      });
      setStatuses(map);
    })();
  }, [user]);

  const handleConnect = async (receiverId: string) => {
    if (!user) return;
    setConnecting(receiverId);
    try {
      await addDoc(collection(db, "connection_requests"), {
        sender_id: user.uid,
        receiver_id: receiverId,
        status: "pending",
        created_at: Timestamp.now(),
      });
      setStatuses((prev) => new Map(prev).set(receiverId, "pending"));
    } catch (err) {
      console.error(err);
    }
    setConnecting(null);
  };

  if (loading || !profile) return null;

  const list = searchQuery.trim() ? searchResults : recommendations;
  const featured = list[0];
  const rest = list.slice(1, 5);

  const myName = profile.name?.split(" ")[0] ?? "you";
  const targetLabel = profile.role === "startup" ? "mentors" : "startups";

  return (
    <div className="nx-shell">
      <NXSidebar current="matches" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow={`Matches · AI-curated for ${myName}`}
          title="Explore the network."
        >
          <NXSearch
            style={{ maxWidth: 320 }}
            placeholder={`Search ${targetLabel}, expertise…`}
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <NXBtn
            kind="ghost"
            size="sm"
            onClick={() => router.push("/requests")}
          >
            Requests
          </NXBtn>
        </NXTopbar>

        <div
          className="nx-scroll"
          style={{
            padding: 28,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {loadingRecs && !searchQuery ? (
            <div className="t-meta" style={{ padding: 40, textAlign: "center" }}>
              Loading recommendations…
            </div>
          ) : list.length === 0 ? (
            <div
              className="nx-card"
              style={{ padding: 40, textAlign: "center" }}
            >
              <p className="t-serif" style={{ fontSize: 24, margin: 0 }}>
                {searchQuery ? "No one matches that search." : "No matches yet."}
              </p>
              <p
                className="t-meta"
                style={{ marginTop: 8 }}
              >
                {searchQuery
                  ? "Try a different name or browse the recommendations."
                  : "Complete your profile to seed the recommendation engine."}
              </p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <FeaturedMatch
                  person={featured}
                  meName={myName}
                  status={statuses.get(featured.uid)}
                  connecting={connecting === featured.uid}
                  onConnect={() => handleConnect(featured.uid)}
                  onView={() => router.push(`/view/${featured.uid}`)}
                />
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <div>
                  <SectionHead
                    eyebrow="Compatible profiles · ranked by Gemini"
                    title={`More ${targetLabel}, in order.`}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 14,
                    }}
                  >
                    {rest.map((p) => (
                      <MatchCard
                        key={p.uid}
                        person={p}
                        status={statuses.get(p.uid)}
                        connecting={connecting === p.uid}
                        onConnect={() => handleConnect(p.uid)}
                        onView={() => router.push(`/view/${p.uid}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FeaturedMatch({
  person,
  meName,
  status,
  connecting,
  onConnect,
  onView,
}: {
  person: UserProfile;
  meName: string;
  status?: string;
  connecting: boolean;
  onConnect: () => void;
  onView: () => void;
}) {
  const edge = person.quality_score
    ? Math.min(99, 70 + Math.floor(person.quality_score / 5))
    : 84;
  const narrative =
    person.role === "mentor"
      ? `${person.name} works in ${person.industry}${
          person.years_experience
            ? ` with ${person.years_experience} years of operator experience`
            : ""
        }. ${
          person.expertise_areas?.length
            ? `Their expertise in ${person.expertise_areas.join(
                ", "
              )} maps to your stage and industry.`
            : ""
        }`
      : `${person.name} is building in ${person.industry}${
          person.stage ? ` at ${person.stage} stage` : ""
        }. ${
          person.tags?.key_problem
            ? `They're solving: ${person.tags.key_problem}`
            : ""
        }`;

  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        borderRadius: "var(--r-xl)",
        padding: 28,
        display: "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap: 32,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div>
        <div
          className="t-eyebrow"
          style={{ color: "var(--paper)", opacity: 0.6 }}
        >
          Top match · edge {edge} / 100
        </div>
        <h2
          className="t-serif"
          style={{
            fontSize: 56,
            margin: "6px 0 0",
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          <em>{person.name}</em>
          <br />
          is the one.
        </h2>
        <p
          className="t-serif"
          style={{
            fontSize: 18,
            fontStyle: "italic",
            margin: "20px 0",
            maxWidth: 460,
            color: "var(--paper)",
            opacity: 0.85,
            lineHeight: 1.4,
          }}
        >
          &ldquo;{narrative}&rdquo;
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <NXBtn
            kind="ghost"
            onClick={onView}
            style={{
              color: "var(--paper)",
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            View profile
          </NXBtn>
          <button
            className="nx-btn"
            onClick={onConnect}
            disabled={connecting || status === "pending" || status === "approved"}
            style={{ background: "var(--paper)", color: "var(--ink)" }}
          >
            {status === "approved"
              ? "Connected"
              : status === "pending"
              ? "Requested"
              : connecting
              ? "Sending…"
              : "Send connection"}{" "}
            {Icon.arrow}
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", width: 320, height: 320 }}>
          <svg
            viewBox="0 0 320 320"
            style={{ position: "absolute", inset: 0 }}
          >
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="2 4"
            />
            <circle
              cx="160"
              cy="160"
              r="100"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
            />
            <line
              x1="60"
              y1="160"
              x2="260"
              y2="160"
              stroke="var(--signal)"
              strokeWidth="2.5"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translate(-20%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <NXAvatar size="xl" name={meName} tone="var(--paper-2)" />
            <span className="t-mono" style={{ fontSize: 10, opacity: 0.6 }}>
              YOU
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translate(20%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <NXAvatar size="xl" id={person.uid} name={person.name} tone="var(--paper)" />
            <span className="t-mono" style={{ fontSize: 10, opacity: 0.6 }}>
              {person.name.toUpperCase().split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--paper)",
              color: "var(--ink)",
              padding: "8px 14px",
              borderRadius: 999,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
            }}
          >
            EDGE · {edge}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  person,
  status,
  connecting,
  onConnect,
  onView,
}: {
  person: UserProfile;
  status?: string;
  connecting: boolean;
  onConnect: () => void;
  onView: () => void;
}) {
  const edge = person.quality_score
    ? Math.min(95, 55 + Math.floor(person.quality_score / 4))
    : 72;
  const subtitle =
    person.role === "mentor"
      ? person.expertise_areas?.[0] ?? person.industry
      : person.industry;
  const tags =
    person.role === "mentor"
      ? person.expertise_areas?.slice(0, 4) ?? []
      : person.tags?.tech_stack?.slice(0, 4) ?? [person.industry];

  return (
    <div
      className="nx-card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <NXAvatar size="lg" id={person.uid} name={person.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            className="t-serif"
            style={{
              fontSize: 22,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {person.name}
          </h4>
          <span
            className="t-meta"
            style={{
              fontStyle: "italic",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
            }}
          >
            {subtitle}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <span
            className="t-mono"
            style={{ fontSize: 10, color: "var(--ink-3)" }}
          >
            EDGE
          </span>
          <span
            className="t-serif"
            style={{
              fontSize: 28,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {edge}
          </span>
        </div>
      </div>

      {person.description && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {person.description}
        </p>
      )}

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.filter(Boolean).map((t) => (
            <NXPill key={t}>{t}</NXPill>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 6,
          borderTop: "1px solid var(--rule)",
        }}
      >
        <span className="t-meta">
          {person.role === "mentor"
            ? `${person.years_experience ?? "—"}y · ${person.industry ?? ""}`
            : person.stage ?? person.industry ?? ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <NXBtn kind="ghost" size="sm" onClick={onView}>
            View
          </NXBtn>
          <NXBtn
            kind="primary"
            size="sm"
            onClick={onConnect}
            disabled={
              connecting || status === "pending" || status === "approved"
            }
          >
            {status === "approved"
              ? "Connected"
              : status === "pending"
              ? "Requested"
              : connecting
              ? "…"
              : "Connect"}
          </NXBtn>
        </div>
      </div>
    </div>
  );
}
