"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AICallout,
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  NXSidebar,
  NXTopbar,
  QualityMeter,
  SectionHead,
  Toggle,
} from "@/components/nx";

const INDUSTRY_OPTIONS = [
  "Fintech", "HealthTech", "EdTech", "CleanTech", "Deep Tech", "E-Commerce",
  "SaaS", "Marketplace", "AI / Machine Learning", "Blockchain / Web3",
  "Cybersecurity", "IoT / Hardware", "Gaming", "Media / Entertainment",
  "Agriculture Tech", "PropTech", "Logistics / Supply Chain", "FoodTech",
  "Travel / Hospitality", "Social Impact", "Other",
];

const EXPERTISE_OPTIONS = [
  "Payment Infrastructure", "Regulatory Compliance", "Fintech Scaling",
  "API Architecture", "Healthcare AI", "Data Privacy", "Product-Market Fit",
  "Fundraising", "Growth Strategy", "Marketplace Dynamics",
  "Consumer Behaviour", "Go-to-Market", "B2B SaaS", "Business Model Design",
  "Investor Relations", "Sustainability", "ESG Compliance",
  "Impact Measurement", "Carbon Markets", "Clinical Trials", "Supply Chain",
  "Other",
];

const STAGE_OPTIONS = ["ideation", "mvp", "early-traction", "growth", "scale"];

type Section = "profile" | "ai" | "notifications" | "privacy" | "danger";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "ai", label: "AI analysis" },
  { key: "notifications", label: "Notifications" },
  { key: "privacy", label: "Privacy & AI" },
  { key: "danger", label: "Danger zone" },
];

export default function AccountPage() {
  const { user, profile, loading, updateProfile, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>("profile");
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    customIndustry: "",
    stage: "",
    expertiseAreas: "",
    customExpertise: "",
    yearsExperience: "",
    pastMentoring: "",
    deckUploaded: false,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notifs, setNotifs] = useState({
    newRequests: true,
    matchRun: true,
    healthShift: true,
    milestoneDigest: false,
    crossCohort: true,
  });
  const [privacy, setPrivacy] = useState({
    extract: true,
    narrate: true,
    crossMatch: true,
    directory: false,
  });
  const initialized = useRef(false);

  const isOtherIndustry =
    form.industry === "Other" ||
    (!!form.industry && !INDUSTRY_OPTIONS.includes(form.industry));
  const isOtherExpertise =
    form.expertiseAreas === "Other" ||
    (!!form.expertiseAreas && !EXPERTISE_OPTIONS.includes(form.expertiseAreas));

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (profile && !initialized.current) {
      initialized.current = true;
      const p = profile.industry || "";
      const otherInd = !!p && !INDUSTRY_OPTIONS.includes(p);
      const pe = profile.expertise_areas?.[0] || "";
      const otherExp = !!pe && !EXPERTISE_OPTIONS.includes(pe);
      setForm({
        name: profile.name || "",
        description: profile.description || "",
        industry: otherInd ? "Other" : p,
        customIndustry: otherInd ? p : "",
        stage: profile.role === "startup" ? profile.stage || "" : "",
        expertiseAreas: otherExp ? "Other" : pe,
        customExpertise: otherExp ? pe : "",
        yearsExperience:
          profile.role === "mentor"
            ? profile.years_experience?.toString() || ""
            : "",
        pastMentoring:
          profile.role === "mentor" ? profile.past_mentoring || "" : "",
        deckUploaded: !!profile.pitch_deck_url,
      });
    }
  }, [profile, loading, user, router]);

  useEffect(() => {
    if (window.location.hash === "#qr") {
      router.replace("/qr");
    }
  }, [router]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setForm((p) => ({ ...p, deckUploaded: true }));
      const r = await fetch("/api/extract-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Pdf: base64, userId: user.uid }),
      });
      if (r.ok) {
        const data = await r.json();
        const update: Record<string, unknown> = {};
        if (data.tags) {
          update.tags = data.tags;
          setForm((p) => ({
            ...p,
            industry: data.tags.industry || p.industry,
          }));
        }
        if (data.quality_score !== undefined)
          update.quality_score = data.quality_score;
        if (data.quality_breakdown)
          update.quality_breakdown = data.quality_breakdown;
        if (data.quality_summary)
          update.quality_summary = data.quality_summary;
        await updateProfile(update);
        fetch("/api/embed-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const finalIndustry =
      form.industry === "Other" ? form.customIndustry : form.industry;
    const finalExpertise =
      form.expertiseAreas === "Other"
        ? form.customExpertise
        : form.expertiseAreas;
    const data: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      industry: finalIndustry,
    };
    if (profile?.role === "startup") {
      data.stage = form.stage;
    } else if (profile?.role === "mentor") {
      data.expertise_areas = finalExpertise ? [finalExpertise] : [];
      data.years_experience = parseInt(form.yearsExperience) || 0;
      data.past_mentoring = form.pastMentoring;
    }
    await updateProfile(data);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await logout();
      router.push("/");
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  if (loading || !profile || !user) return null;

  return (
    <div className="nx-shell">
      <NXSidebar current="settings" />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <NXTopbar
          eyebrow="Account · /settings"
          title="Configure Nexus."
        />

        <div
          className="nx-scroll"
          style={{
            padding: 28,
            overflow: "auto",
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 28,
          }}
        >
          {/* Secondary nav */}
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              position: "sticky",
              top: 0,
              alignSelf: "start",
            }}
          >
            {SECTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  padding: "8px 10px",
                  fontSize: 13,
                  color: section === key ? "var(--ink)" : "var(--ink-3)",
                  borderRadius: 6,
                  background:
                    section === key ? "var(--paper-2)" : "transparent",
                  fontWeight: section === key ? 500 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 760,
            }}
          >
            {section === "profile" && (
              <>
                <SectionHead
                  eyebrow="Profile"
                  title="Your public face."
                  sub="What mentors and admins see across every programme."
                />
                <div
                  className="nx-card"
                  style={{
                    padding: 22,
                    display: "flex",
                    gap: 20,
                    alignItems: "center",
                  }}
                >
                  <NXAvatar size="xl" id={user.uid} name={profile.name} />
                  <div style={{ flex: 1 }}>
                    <h3
                      className="t-serif"
                      style={{
                        fontSize: 26,
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {profile.name}
                    </h3>
                    <span className="t-meta">
                      {profile.role} · {profile.email}
                    </span>
                  </div>
                  <NXBtn kind="ghost" size="sm" onClick={handleSave}>
                    Refresh
                  </NXBtn>
                </div>

                <div
                  className="nx-card"
                  style={{
                    padding: 22,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div
                    className="nx-field"
                    style={{ gridColumn: "span 2" }}
                  >
                    <label>Full name</label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div
                    className="nx-field"
                    style={{ gridColumn: "span 2" }}
                  >
                    <label>Public bio</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="nx-field">
                    <label>Industry</label>
                    <select
                      value={isOtherIndustry ? "Other" : form.industry}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({
                          ...p,
                          industry: v,
                          customIndustry:
                            v !== "Other" ? "" : p.customIndustry,
                        }));
                      }}
                    >
                      <option value="">Select industry</option>
                      {INDUSTRY_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    {isOtherIndustry && (
                      <input
                        style={{ marginTop: 8 }}
                        placeholder="Enter your industry"
                        value={form.customIndustry}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            customIndustry: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                  {profile.role === "startup" && (
                    <div className="nx-field">
                      <label>Stage</label>
                      <select
                        value={form.stage}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, stage: e.target.value }))
                        }
                      >
                        <option value="">Select stage</option>
                        {STAGE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {profile.role === "mentor" && (
                    <>
                      <div
                        className="nx-field"
                        style={{ gridColumn: "span 2" }}
                      >
                        <label>Expertise area</label>
                        <select
                          value={
                            isOtherExpertise ? "Other" : form.expertiseAreas
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((p) => ({
                              ...p,
                              expertiseAreas: v,
                              customExpertise:
                                v !== "Other" ? "" : p.customExpertise,
                            }));
                          }}
                        >
                          <option value="">Select expertise area</option>
                          {EXPERTISE_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        {isOtherExpertise && (
                          <input
                            style={{ marginTop: 8 }}
                            placeholder="Enter expertise area"
                            value={form.customExpertise}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                customExpertise: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="nx-field">
                        <label>Years experience</label>
                        <input
                          type="number"
                          value={form.yearsExperience}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              yearsExperience: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="nx-field">
                        <label>Past mentoring</label>
                        <input
                          value={form.pastMentoring}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              pastMentoring: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                {profile.role === "startup" && (
                  <div className="nx-card" style={{ padding: 22 }}>
                    <div
                      className="t-eyebrow"
                      style={{ marginBottom: 6 }}
                    >
                      Pitch deck
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <label
                        style={{
                          cursor: "pointer",
                          padding: "10px 12px",
                          border: "1px dashed var(--rule-strong)",
                          borderRadius: "var(--r-md)",
                          fontSize: 13,
                          color: "var(--ink-2)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {Icon.upload}{" "}
                        {uploading
                          ? "Reading…"
                          : form.deckUploaded
                          ? "Replace deck"
                          : "Upload deck"}
                        <input
                          type="file"
                          accept=".pdf"
                          style={{ display: "none" }}
                          onChange={handleUpload}
                          disabled={uploading}
                        />
                      </label>
                      {form.deckUploaded && (
                        <NXPill kind="signal">✓ Uploaded</NXPill>
                      )}
                    </div>
                    <p className="t-meta" style={{ marginTop: 8 }}>
                      Gemini re-reads on upload and updates tags + quality
                      score. Re-uploads do not reset relationship signals.
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <NXBtn kind="ghost" onClick={() => router.push("/dashboard")}>
                    Cancel
                  </NXBtn>
                  <NXBtn kind="primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </NXBtn>
                </div>
              </>
            )}

            {section === "ai" &&
              (profile.quality_score !== undefined ? (
                <>
                  <SectionHead
                    eyebrow="AI analysis"
                    title="What Gemini found."
                  />
                  <div className="nx-card" style={{ padding: 22 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                      }}
                    >
                      <span
                        className="t-serif"
                        style={{
                          fontSize: 56,
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                        }}
                      >
                        {profile.quality_score}
                      </span>
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--ink-3)",
                        }}
                      >
                        / 100
                      </span>
                    </div>
                    {profile.quality_breakdown && (
                      <>
                        <hr
                          className="nx-rule"
                          style={{ margin: "14px 0" }}
                        />
                        <QualityMeter breakdown={profile.quality_breakdown} />
                      </>
                    )}
                  </div>
                  {profile.quality_summary && (
                    <AICallout model="Gemini 2.0 Flash">
                      {profile.quality_summary}
                    </AICallout>
                  )}
                  {profile.tags && (
                    <div
                      className="nx-card"
                      style={{ padding: 22 }}
                    >
                      <div className="t-eyebrow">Extracted tags</div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginTop: 10,
                        }}
                      >
                        {profile.tags.industry && (
                          <NXPill>{profile.tags.industry}</NXPill>
                        )}
                        {profile.tags.stage && (
                          <NXPill>{profile.tags.stage}</NXPill>
                        )}
                        {profile.tags.tech_stack?.map((t) => (
                          <NXPill key={t}>{t}</NXPill>
                        ))}
                      </div>
                      {profile.tags.key_problem && (
                        <p
                          style={{
                            marginTop: 12,
                            fontSize: 13,
                            color: "var(--ink-2)",
                          }}
                        >
                          <span className="t-eyebrow">Problem · </span>{" "}
                          {profile.tags.key_problem}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <SectionHead
                    eyebrow="AI analysis"
                    title="No analysis yet."
                    sub={
                      profile.role === "startup"
                        ? "Upload a pitch deck on the Profile tab to populate this section."
                        : "Quality scoring is only run for startup profiles."
                    }
                  />
                </>
              ))}

            {section === "notifications" && (
              <>
                <SectionHead
                  eyebrow="Notifications"
                  title="What Nexus tells you about."
                  sub="We only send when behaviour changes — never on a schedule."
                />
                <div className="nx-card" style={{ padding: 6 }}>
                  {(
                    [
                      [
                        "newRequests",
                        "New connection requests",
                        "When a mentor or startup wants in.",
                      ],
                      [
                        "matchRun",
                        "Match generation completed",
                        "When the admin runs Gemini on your cohort.",
                      ],
                      [
                        "healthShift",
                        "Health trend change",
                        "When any of your relationships moves between healthy / stable / decaying.",
                      ],
                      [
                        "milestoneDigest",
                        "Milestone reminders",
                        "Daily digest of upcoming milestones.",
                      ],
                      [
                        "crossCohort",
                        "Cross-cohort opportunities",
                        "When a relationship from a past cohort is re-eligible.",
                      ],
                    ] as const
                  ).map(([key, title, hint], i) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 18px",
                        borderTop: i ? "1px solid var(--rule)" : 0,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {title}
                        </div>
                        <span className="t-meta">{hint}</span>
                      </div>
                      <Toggle
                        on={notifs[key]}
                        onClick={() =>
                          setNotifs((p) => ({ ...p, [key]: !p[key] }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === "privacy" && (
              <>
                <SectionHead
                  eyebrow="Privacy & AI"
                  title="What Gemini sees."
                  sub="Your pitch deck text is parsed once on upload and stored as tags. The original PDF stays in Cloud Storage."
                />
                <div className="nx-card" style={{ padding: 6 }}>
                  {(
                    [
                      [
                        "extract",
                        "Allow Gemini to extract tags from your deck",
                      ],
                      [
                        "narrate",
                        "Allow Gemini to score and narrate health",
                      ],
                      [
                        "crossMatch",
                        "Allow your profile to surface in cross-cohort matching",
                      ],
                      [
                        "directory",
                        "Show your QR badge in printable cohort directory",
                      ],
                    ] as const
                  ).map(([key, title], i) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 18px",
                        borderTop: i ? "1px solid var(--rule)" : 0,
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13 }}>{title}</span>
                      <Toggle
                        on={privacy[key]}
                        onClick={() =>
                          setPrivacy((p) => ({ ...p, [key]: !p[key] }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === "danger" && (
              <>
                <SectionHead
                  eyebrow="Session & danger zone"
                  title="Sign out or delete account."
                />
                <div
                  className="nx-card"
                  style={{
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 14, fontWeight: 500 }}
                    >
                      Sign out
                    </div>
                    <span className="t-meta">
                      End the current Nexus session.
                    </span>
                  </div>
                  <NXBtn
                    kind="ghost"
                    onClick={async () => {
                      await logout();
                      router.push("/");
                    }}
                  >
                    {Icon.logout} Sign out
                  </NXBtn>
                </div>

                <div
                  className="nx-card"
                  style={{
                    padding: 22,
                    border: "1px solid var(--crimson)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--crimson-ink)",
                      }}
                    >
                      Delete account
                    </div>
                    <span className="t-meta">
                      Removes your profile data so you can sign up again
                      with the same Google account.
                    </span>
                  </div>
                  <NXBtn
                    kind="danger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete account
                  </NXBtn>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(false)}
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
              maxWidth: 420,
              margin: "0 16px",
              padding: 28,
            }}
          >
            <h2
              className="t-serif"
              style={{ fontSize: 28, margin: 0 }}
            >
              Delete account?
            </h2>
            <p
              style={{
                marginTop: 10,
                fontSize: 14,
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              This removes your profile data from the database. You can sign
              in again with the same Google account to create a new profile.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 18,
                justifyContent: "flex-end",
              }}
            >
              <NXBtn
                kind="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </NXBtn>
              <NXBtn
                kind="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </NXBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
