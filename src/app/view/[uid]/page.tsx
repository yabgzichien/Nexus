"use client";

import { useAuth } from "@/lib/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, ConnectionRequest } from "@/lib/types";
import Link from "next/link";
import {
  AICallout,
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  QualityMeter,
  Sparkline,
} from "@/components/nx";

export default function PublicProfilePage() {
  const { user, profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const [data, setData] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<ConnectionRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) setData({ uid, ...snap.data() } as UserProfile);
      else setNotFound(true);
    });
  }, [uid]);

  useEffect(() => {
    if (!user || !uid) return;
    (async () => {
      const sent = await getDocs(
        query(
          collection(db, "connection_requests"),
          where("sender_id", "==", user.uid),
          where("receiver_id", "==", uid)
        )
      );
      if (!sent.empty) setStatus((sent.docs[0].data() as ConnectionRequest).status);
      const rcv = await getDocs(
        query(
          collection(db, "connection_requests"),
          where("sender_id", "==", uid),
          where("receiver_id", "==", user.uid)
        )
      );
      if (!rcv.empty) {
        const d = rcv.docs[0].data() as ConnectionRequest;
        if (d.status === "pending")
          setPending({ ...d, id: rcv.docs[0].id } as ConnectionRequest);
        else setStatus(d.status);
      }
    })();
  }, [user, uid]);

  const handleConnect = async () => {
    if (!user || !uid) return;
    setConnecting(true);
    try {
      await addDoc(collection(db, "connection_requests"), {
        sender_id: user.uid,
        receiver_id: uid,
        status: "pending",
        created_at: Timestamp.now(),
      });
      setStatus("pending");
    } catch (err) {
      console.error(err);
    }
    setConnecting(false);
  };

  const handleApprove = async () => {
    if (!pending) return;
    setProcessing(true);
    await updateDoc(doc(db, "connection_requests", pending.id), {
      status: "approved",
    });
    setPending(null);
    setStatus("approved");
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!pending) return;
    setProcessing(true);
    await updateDoc(doc(db, "connection_requests", pending.id), {
      status: "rejected",
    });
    setPending(null);
    setProcessing(false);
  };

  if (notFound) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          background: "var(--paper)",
        }}
      >
        <h1 className="t-serif" style={{ fontSize: 36, margin: 0 }}>
          Profile not found.
        </h1>
        <Link href="/" className="nx-link">
          Back to Nexus
        </Link>
      </main>
    );
  }
  if (!data) return null;

  const tags =
    data.role === "startup"
      ? data.tags?.tech_stack ?? []
      : data.expertise_areas ?? [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "14px 28px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--ink-2)",
            fontSize: 13,
          }}
        >
          {Icon.arrowLeft} Back
        </button>
        <div style={{ flex: 1 }} />
        <span
          className="t-serif"
          style={{ fontSize: 22, fontStyle: "italic" }}
        >
          Nexus
        </span>
      </header>

      <div
        style={{
          flex: 1,
          padding: 28,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {/* Identity */}
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
            }}
          >
            <NXAvatar size="xl" id={data.uid} name={data.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-eyebrow">
                {data.role === "startup" ? "Startup" : "Mentor"} · {data.industry}
                {data.stage ? ` · ${data.stage}` : ""}
              </div>
              <h1
                className="t-serif"
                style={{
                  fontSize: 56,
                  margin: "4px 0 0",
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                {data.name}
              </h1>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {data.role === "mentor" && data.years_experience !== undefined && (
                  <NXPill>{data.years_experience}y experience</NXPill>
                )}
                {data.role === "startup" && data.tags?.team_size && (
                  <NXPill>Team of {data.tags.team_size}</NXPill>
                )}
                {data.role === "startup" && data.tags?.funding_ask && (
                  <NXPill>Asking {data.tags.funding_ask}</NXPill>
                )}
              </div>
            </div>
            {user && user.uid !== uid && (
              <ConnectionActions
                status={status}
                pending={pending}
                connecting={connecting}
                processing={processing}
                onConnect={handleConnect}
                onApprove={handleApprove}
                onReject={handleReject}
                isAuthed={!!profile}
              />
            )}
          </div>

          <hr className="nx-rule" />

          {/* Pitch / About */}
          {data.role === "startup" && data.tags?.key_problem ? (
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>
                The pitch (extracted)
              </div>
              <h2
                className="t-serif"
                style={{
                  fontSize: 36,
                  margin: 0,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                &ldquo;{data.tags.key_problem}&rdquo;
              </h2>
              {data.tags.unique_value_prop && (
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 16,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    maxWidth: 680,
                  }}
                >
                  {data.tags.unique_value_prop}
                </p>
              )}
              {data.description && (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: "var(--ink-3)",
                    lineHeight: 1.6,
                  }}
                >
                  {data.description}
                </p>
              )}
              {tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 16,
                  }}
                >
                  {tags.map((t) => (
                    <NXPill key={t}>{t}</NXPill>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>
                About
              </div>
              {data.description ? (
                <p
                  className="t-serif"
                  style={{
                    fontSize: 24,
                    margin: 0,
                    fontStyle: "italic",
                    lineHeight: 1.35,
                    color: "var(--ink)",
                  }}
                >
                  &ldquo;{data.description}&rdquo;
                </p>
              ) : (
                <p className="t-meta">No description yet.</p>
              )}
              {data.role === "mentor" && data.past_mentoring && (
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.6,
                  }}
                >
                  <strong className="t-eyebrow">Past mentoring · </strong>{" "}
                  {data.past_mentoring}
                </p>
              )}
              {tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 16,
                  }}
                >
                  {tags.map((t) => (
                    <NXPill key={t}>{t}</NXPill>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI callout */}
          {data.quality_summary && (
            <AICallout
              label="Why a mentor should care · Gemini"
              model="Gemini 2.5 Pro"
            >
              {data.quality_summary}
            </AICallout>
          )}
        </div>

        {/* Aside */}
        <aside
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {data.role === "startup" && data.quality_score !== undefined && (
            <div className="nx-card" style={{ padding: 18 }}>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>
                Quality gate
              </div>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: 10 }}
              >
                <span
                  className="t-serif"
                  style={{
                    fontSize: 56,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {data.quality_score}
                </span>
                <span
                  className="t-mono"
                  style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                  / 100
                </span>
              </div>
              <span className="t-meta">
                {data.quality_score >= 75
                  ? "Top tier · strongly qualified"
                  : data.quality_score >= 60
                  ? "Above standard quality gate"
                  : "Below most quality gates"}
              </span>
              {data.quality_breakdown && (
                <>
                  <hr className="nx-rule" style={{ margin: "14px 0" }} />
                  <QualityMeter breakdown={data.quality_breakdown} />
                </>
              )}
            </div>
          )}

          <div className="nx-card" style={{ padding: 18 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>
              Activity signal
            </div>
            <Sparkline
              width={260}
              height={56}
              points={[55, 58, 57, 60, 62, 65, 68, 66, 69, 72, 75, 74, 78, 82]}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <span className="t-meta">
                {data.role === "startup" ? "Deck uploaded" : "Profile active"}
              </span>
              <span className="t-meta">Nexus-tracked</span>
            </div>
          </div>

          {data.role === "mentor" && data.expertise_areas?.length && (
            <div className="nx-card" style={{ padding: 18 }}>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>
                Expertise
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {data.expertise_areas.map((a) => (
                  <NXPill key={a} kind="ai">
                    {a}
                  </NXPill>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer
        style={{
          padding: "16px 28px",
          textAlign: "center",
          borderTop: "1px solid var(--rule)",
        }}
      >
        <span className="t-meta">
          Powered by Nexus — AI Relationship Operating System
        </span>
      </footer>
    </main>
  );
}

function ConnectionActions({
  status,
  pending,
  connecting,
  processing,
  onConnect,
  onApprove,
  onReject,
  isAuthed,
}: {
  status: string | null;
  pending: ConnectionRequest | null;
  connecting: boolean;
  processing: boolean;
  onConnect: () => void;
  onApprove: () => void;
  onReject: () => void;
  isAuthed: boolean;
}) {
  if (!isAuthed) {
    return (
      <Link href="/">
        <NXBtn kind="primary">Sign in to connect {Icon.arrow}</NXBtn>
      </Link>
    );
  }
  if (pending) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <NXBtn kind="ghost" onClick={onReject} disabled={processing}>
          Decline
        </NXBtn>
        <NXBtn kind="primary" onClick={onApprove} disabled={processing}>
          {processing ? "…" : "Approve"} {Icon.check}
        </NXBtn>
      </div>
    );
  }
  if (status === "approved") return <NXPill kind="signal">● Connected</NXPill>;
  if (status === "pending") return <NXPill kind="amber">○ Requested</NXPill>;
  if (status === "rejected") return <NXPill kind="crimson">Declined</NXPill>;
  return (
    <NXBtn kind="primary" onClick={onConnect} disabled={connecting}>
      {connecting ? "Sending…" : "Send connection"} {Icon.arrow}
    </NXBtn>
  );
}
