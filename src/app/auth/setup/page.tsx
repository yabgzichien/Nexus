"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { UserRole } from "@/lib/types";
import {
  AICallout,
  Icon,
  NXAvatar,
  NXBtn,
  NXPill,
  QualityMeter,
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

interface ExtractedTags {
  industry?: string;
  stage?: string;
  tech_stack?: string[];
  funding_ask?: string;
  team_size?: number;
  key_problem?: string;
  unique_value_prop?: string;
}

interface QualityBreakdown {
  problem_clarity?: number;
  market_size?: number;
  team_strength?: number;
  mvp_readiness?: number;
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupInner />
    </Suspense>
  );
}

function SetupInner() {
  const { user, profile, loading, setUserRole, updateProfile } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const roleParam = (search.get("role") as UserRole) || "startup";
  const selectedRole: UserRole =
    roleParam === "mentor" || roleParam === "admin" ? roleParam : "startup";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [extractedTags, setExtractedTags] = useState<ExtractedTags | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [qualityBreakdown, setQualityBreakdown] =
    useState<QualityBreakdown | null>(null);
  const [qualitySummary, setQualitySummary] = useState<string | null>(null);
  const initialized = useRef(false);

  const isOtherIndustry =
    form.industry === "Other" ||
    (!!form.industry && !INDUSTRY_OPTIONS.includes(form.industry));

  const isOtherExpertise =
    form.expertiseAreas === "Other" ||
    (!!form.expertiseAreas && !EXPERTISE_OPTIONS.includes(form.expertiseAreas));

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile) {
      router.push(profile.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      setForm((p) => ({ ...p, name: user.displayName || "" }));
    }
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setForm((p) => ({ ...p, deckUploaded: true }));
      const response = await fetch("/api/extract-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Pdf: base64Data, userId: user.uid }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.tags) {
          setExtractedTags(data.tags as ExtractedTags);
          setForm((p) => ({
            ...p,
            industry: data.tags.industry || p.industry,
          }));
        }
        if (data.quality_score !== undefined) setQualityScore(data.quality_score);
        if (data.quality_breakdown) setQualityBreakdown(data.quality_breakdown);
        if (data.quality_summary) setQualitySummary(data.quality_summary);
      }
    } catch (err) {
      console.error("File processing failed:", err);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.industry) newErrors.industry = "Industry is required";
    if (isOtherIndustry && !form.customIndustry.trim())
      newErrors.industry = "Please enter your industry";
    if (selectedRole === "startup" && !form.stage)
      newErrors.stage = "Stage is required";
    if (selectedRole === "mentor" && !form.expertiseAreas)
      newErrors.expertise = "Expertise area is required";
    if (
      selectedRole === "mentor" &&
      isOtherExpertise &&
      !form.customExpertise.trim()
    )
      newErrors.expertise = "Please enter your expertise area";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    await setUserRole(selectedRole);
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
    if (selectedRole === "startup") {
      data.stage = form.stage;
    } else if (selectedRole === "mentor") {
      data.expertise_areas = [finalExpertise];
      data.years_experience = parseInt(form.yearsExperience) || 0;
      data.past_mentoring = form.pastMentoring;
    }
    await updateProfile(data);
    setSaving(false);
    router.push("/dashboard");
  };

  if (loading || !user) return null;

  const displayName = form.name || user.displayName || "Your name";
  const displayIndustry = isOtherIndustry
    ? form.customIndustry || "Industry"
    : form.industry || "Industry";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
      }}
    >
      <header
        style={{
          padding: "20px 40px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span className="t-serif" style={{ fontSize: 22, fontStyle: "italic" }}>
          Nexus
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginLeft: 24,
          }}
        >
          {["Identity", "Profile", "Deck"].map((s, i) => (
            <div
              key={s}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  className="t-mono"
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: i <= 1 ? "var(--ink)" : "var(--paper-3)",
                    color: i <= 1 ? "var(--paper)" : "var(--ink-3)",
                  }}
                >
                  {`0${i + 1}`}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: i === 1 ? "var(--ink)" : "var(--ink-3)",
                    fontWeight: i === 1 ? 500 : 400,
                  }}
                >
                  {s}
                </span>
              </div>
              {i < 2 && (
                <div
                  style={{
                    width: 40,
                    height: 1,
                    background: "var(--rule-strong)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <span className="t-meta" style={{ marginLeft: "auto" }}>
          {selectedRole === "mentor" ? "Mentor" : "Startup"} setup
        </span>
      </header>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 0,
        }}
      >
        {/* Left: form */}
        <div
          style={{
            padding: "40px 56px",
            overflow: "auto",
            borderRight: "1px solid var(--rule)",
          }}
        >
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Step 02 / 03
          </div>
          <h2
            className="t-serif"
            style={{
              fontSize: 44,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {selectedRole === "mentor" ? (
              <>
                Tell us what
                <br />
                <em>you&rsquo;ve seen.</em>
              </>
            ) : (
              <>
                Tell us what
                <br />
                <em>you&rsquo;re building.</em>
              </>
            )}
          </h2>
          <p
            style={{
              color: "var(--ink-3)",
              fontSize: 14,
              marginTop: 14,
              maxWidth: 480,
            }}
          >
            We use what you write here to seed the graph. Be specific — Gemini
            reads it once and remembers across every cohort you join.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 32,
            }}
          >
            <div className="nx-field" style={{ gridColumn: "span 2" }}>
              <label>Name {errors.name && `— ${errors.name}`}</label>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value }));
                  if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                }}
              />
            </div>

            <div className="nx-field" style={{ gridColumn: "span 2" }}>
              <label>Short description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            <div className="nx-field" style={{ gridColumn: "span 2" }}>
              <label>Industry {errors.industry && `— ${errors.industry}`}</label>
              <select
                value={isOtherIndustry ? "Other" : form.industry}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((p) => ({
                    ...p,
                    industry: val,
                    customIndustry: val !== "Other" ? "" : p.customIndustry,
                  }));
                  if (errors.industry)
                    setErrors((p) => ({ ...p, industry: "" }));
                }}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {isOtherIndustry && (
                <input
                  style={{ marginTop: 8 }}
                  value={form.customIndustry}
                  placeholder="Enter your industry"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      customIndustry: e.target.value,
                    }))
                  }
                />
              )}
            </div>

            {selectedRole === "startup" && (
              <>
                <div className="nx-field">
                  <label>Stage {errors.stage && `— ${errors.stage}`}</label>
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
                <div className="nx-field">
                  <label>Pitch deck (PDF)</label>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 12px",
                      border: "1px dashed var(--rule-strong)",
                      borderRadius: "var(--r-md)",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--ink-2)",
                      background: "var(--paper)",
                    }}
                  >
                    {Icon.upload}
                    {uploading
                      ? "Reading deck…"
                      : form.deckUploaded
                      ? "Replace deck"
                      : "Upload deck"}
                    <input
                      type="file"
                      accept=".pdf"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </>
            )}

            {selectedRole === "mentor" && (
              <>
                <div className="nx-field" style={{ gridColumn: "span 2" }}>
                  <label>
                    Expertise area {errors.expertise && `— ${errors.expertise}`}
                  </label>
                  <select
                    value={isOtherExpertise ? "Other" : form.expertiseAreas}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({
                        ...p,
                        expertiseAreas: val,
                        customExpertise:
                          val !== "Other" ? "" : p.customExpertise,
                      }));
                      if (errors.expertise)
                        setErrors((p) => ({ ...p, expertise: "" }));
                    }}
                  >
                    <option value="">Select expertise area</option>
                    {EXPERTISE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {isOtherExpertise && (
                    <input
                      style={{ marginTop: 8 }}
                      value={form.customExpertise}
                      placeholder="Enter your expertise area"
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
                  <label>Years of experience</label>
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
                    placeholder="Programmes, cohorts you've supported"
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

            {extractedTags && (
              <div className="nx-field" style={{ gridColumn: "span 2" }}>
                <label>Tags · auto-filled from deck</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    padding: "8px 10px",
                    border: "1px dashed var(--rule-strong)",
                    borderRadius: "var(--r-md)",
                    minHeight: 46,
                  }}
                >
                  {extractedTags.industry && (
                    <NXPill>{extractedTags.industry}</NXPill>
                  )}
                  {extractedTags.stage && (
                    <NXPill>{extractedTags.stage}</NXPill>
                  )}
                  {extractedTags.tech_stack?.map((t) => (
                    <NXPill key={t}>{t}</NXPill>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <NXBtn
              kind="ghost"
              onClick={() => router.push("/auth/role-select")}
            >
              ← Back
            </NXBtn>
            <NXBtn kind="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Continue"} {Icon.arrow}
            </NXBtn>
          </div>
        </div>

        {/* Right: live preview */}
        <div
          style={{
            padding: "40px 32px",
            background: "var(--paper-2)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            overflow: "auto",
          }}
        >
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Live preview · how others see you
            </div>
            <div className="nx-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <NXAvatar size="lg" id={user.uid} name={displayName} />
                <div>
                  <h3
                    className="t-serif"
                    style={{
                      fontSize: 26,
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {displayName}
                  </h3>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <NXPill>{displayIndustry}</NXPill>
                    {selectedRole === "startup" && form.stage && (
                      <NXPill>{form.stage}</NXPill>
                    )}
                    {selectedRole === "mentor" && form.yearsExperience && (
                      <NXPill>{form.yearsExperience}y</NXPill>
                    )}
                  </div>
                </div>
              </div>
              {form.description && (
                <p
                  className="t-serif"
                  style={{
                    fontSize: 18,
                    fontStyle: "italic",
                    margin: "16px 0 0",
                    lineHeight: 1.4,
                  }}
                >
                  &ldquo;{form.description}&rdquo;
                </p>
              )}
              {qualityScore !== null && (
                <>
                  <hr className="nx-rule" style={{ margin: "16px 0" }} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="t-eyebrow">Quality (provisional)</span>
                    <span className="t-mono" style={{ fontSize: 11 }}>
                      {qualityScore} / 100
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <QualityMeter breakdown={qualityBreakdown ?? {}} />
                  </div>
                </>
              )}
            </div>
          </div>

          {qualitySummary && <AICallout>{qualitySummary}</AICallout>}

          {selectedRole === "startup" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 14,
                background: "var(--paper)",
                border: "1px dashed var(--rule-strong)",
                borderRadius: "var(--r-md)",
              }}
            >
              <span style={{ color: "var(--ai)" }}>{Icon.spark}</span>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.45,
                }}
              >
                <strong
                  className="t-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Extraction
                </strong>
                <br />
                We&rsquo;ll re-read your pitch deck on upload and update tags +
                scores automatically. Re-uploads do not reset relationship
                signals.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
