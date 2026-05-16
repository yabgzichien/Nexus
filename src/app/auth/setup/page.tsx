"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserRole } from "@/lib/types";

const INDUSTRY_OPTIONS = [
  "Fintech",
  "HealthTech",
  "EdTech",
  "CleanTech",
  "Deep Tech",
  "E-Commerce",
  "SaaS",
  "Marketplace",
  "AI / Machine Learning",
  "Blockchain / Web3",
  "Cybersecurity",
  "IoT / Hardware",
  "Gaming",
  "Media / Entertainment",
  "Agriculture Tech",
  "PropTech",
  "Logistics / Supply Chain",
  "FoodTech",
  "Travel / Hospitality",
  "Social Impact",
  "Other",
];

const EXPERTISE_OPTIONS = [
  "Payment Infrastructure",
  "Regulatory Compliance",
  "Fintech Scaling",
  "API Architecture",
  "Healthcare AI",
  "Data Privacy",
  "Product-Market Fit",
  "Fundraising",
  "Growth Strategy",
  "Marketplace Dynamics",
  "Consumer Behaviour",
  "Go-to-Market",
  "B2B SaaS",
  "Business Model Design",
  "Investor Relations",
  "Sustainability",
  "ESG Compliance",
  "Impact Measurement",
  "Carbon Markets",
  "Clinical Trials",
  "Supply Chain",
  "Other",
];

const roles: { role: UserRole; title: string; description: string; icon: string }[] = [
  {
    role: "startup",
    title: "Startup",
    description: "Upload your pitch deck, get matched with mentors, and track your growth milestones.",
    icon: "🚀",
  },
  {
    role: "mentor",
    title: "Mentor",
    description: "Share your expertise, get matched with high-potential startups, and guide their journey.",
    icon: "🎯",
  },
  {
    role: "admin",
    title: "Programme Manager",
    description: "Create programmes, trigger AI matching, and monitor ecosystem health.",
    icon: "📊",
  },
];

export default function SetupPage() {
  const { user, profile, loading, setUserRole, updateProfile } = useAuth();
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
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
  const [extractedTags, setExtractedTags] = useState<Record<string, unknown> | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [qualityBreakdown, setQualityBreakdown] = useState<Record<string, number> | null>(null);
  const [qualitySummary, setQualitySummary] = useState<string | null>(null);
  const initialized = useRef(false);

  const isOtherIndustry =
    form.industry === "Other" ||
    (form.industry && !INDUSTRY_OPTIONS.includes(form.industry));

  const isOtherExpertise =
    form.expertiseAreas === "Other" ||
    (form.expertiseAreas && !EXPERTISE_OPTIONS.includes(form.expertiseAreas));

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile) {
      if (profile.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/chat");
      }
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      setForm((prev) => ({
        ...prev,
        name: user.displayName || "",
      }));
    }
  }, [user]);

  const handleRoleSelect = (role: UserRole) => {
    if (role === "admin") {
      setUserRole(role).then(() => router.push("/admin/dashboard"));
    } else {
      setSelectedRole(role);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      setForm((prev) => ({ ...prev, deckUploaded: true }));

      // Call extract-deck API with base64 data directly
      try {
        const response = await fetch("/api/extract-deck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Pdf: base64Data,
            userId: user.uid,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.tags) {
            setExtractedTags(data.tags);
            setForm((prev) => ({
              ...prev,
              industry: data.tags.industry || prev.industry,
            }));
          }
          if (data.quality_score !== undefined) {
            setQualityScore(data.quality_score);
          }
          if (data.quality_breakdown) {
            setQualityBreakdown(data.quality_breakdown);
          }
          if (data.quality_summary) {
            setQualitySummary(data.quality_summary);
          }
        }
      } catch (apiError) {
        console.error("AI extraction failed:", apiError);
      }
    } catch (err) {
      console.error("File processing failed:", err);
      alert("Failed to process the PDF file. Please try again.");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!selectedRole || !user) return;

    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.industry) newErrors.industry = "Industry is required";
    if (isOtherIndustry && !form.customIndustry.trim())
      newErrors.industry = "Please enter your industry";
    if (selectedRole === "startup" && !form.stage)
      newErrors.stage = "Stage is required";
    if (selectedRole === "mentor" && !form.expertiseAreas)
      newErrors.expertise = "Expertise area is required";
    if (selectedRole === "mentor" && isOtherExpertise && !form.customExpertise.trim())
      newErrors.expertise = "Please enter your expertise area";

    if (Object.keys(newErrors).length > 0) {
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
    router.push("/chat");
  };

  if (loading || !user) return null;

  if (!selectedRole) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Welcome to NEXUS</h1>
            <p className="text-gray-400">Select your role to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map(({ role, title, description, icon }) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="flex flex-col items-center text-center p-6 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-gray-900 transition-all space-y-3"
              >
                <span className="text-4xl">{icon}</span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-gray-400">{description}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-sm text-gray-400 mt-1">
            Tell us about yourself to get started with NEXUS
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              className={`w-full bg-gray-900 border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none ${
                errors.name ? "border-red-500" : "border-gray-700"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Industry <span className="text-red-400">*</span>
            </label>
            <select
              value={isOtherIndustry ? "Other" : form.industry}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  industry: val,
                  customIndustry: val !== "Other" ? "" : prev.customIndustry,
                }));
                if (errors.industry)
                  setErrors((prev) => ({ ...prev, industry: "" }));
              }}
              className={`w-full bg-gray-900 border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none ${
                errors.industry ? "border-red-500" : "border-gray-700"
              }`}
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
                type="text"
                value={form.customIndustry}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    customIndustry: e.target.value,
                  }));
                  if (errors.industry)
                    setErrors((prev) => ({ ...prev, industry: "" }));
                }}
                placeholder="Enter your industry"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mt-2 focus:border-blue-500 focus:outline-none"
              />
            )}
            {errors.industry && (
              <p className="text-xs text-red-400 mt-1">{errors.industry}</p>
            )}
          </div>

          {selectedRole === "startup" && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Stage <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.stage}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, stage: e.target.value }));
                    if (errors.stage)
                      setErrors((prev) => ({ ...prev, stage: "" }));
                  }}
                  className={`w-full bg-gray-900 border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none ${
                    errors.stage ? "border-red-500" : "border-gray-700"
                  }`}
                >
                  <option value="">Select stage</option>
                  <option value="ideation">Ideation</option>
                  <option value="mvp">MVP</option>
                  <option value="early-traction">Early Traction</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                </select>
                {errors.stage && (
                  <p className="text-xs text-red-400 mt-1">{errors.stage}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Pitch Deck
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {uploading
                      ? "Uploading..."
                      : form.deckUploaded
                      ? "Replace Deck"
                      : "Upload PDF"}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {form.deckUploaded && (
                    <span className="text-green-400 text-sm">
                      ✓ Deck uploaded
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Gemini AI will analyze your pitch deck to extract tags and
                  score your startup.
                </p>
              </div>

              {/* AI Quality Score */}
              {qualityScore !== null && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">AI Quality Score</h3>
                    <span className="text-2xl font-bold text-blue-400">
                      {qualityScore}/100
                    </span>
                  </div>
                  {qualityBreakdown && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Problem Clarity</span>
                        <span>{qualityBreakdown.problem_clarity}/25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Market Size</span>
                        <span>{qualityBreakdown.market_size}/25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Team Strength</span>
                        <span>{qualityBreakdown.team_strength}/25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">MVP Readiness</span>
                        <span>{qualityBreakdown.mvp_readiness}/25</span>
                      </div>
                    </div>
                  )}
                  {qualitySummary && (
                    <p className="text-sm text-gray-300 italic">
                      {qualitySummary}
                    </p>
                  )}
                </div>
              )}

              {/* AI-Extracted Tags */}
              {extractedTags && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium">AI-Extracted Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(extractedTags.tech_stack as string[])?.map((tech) => (
                      <span
                        key={tech}
                        className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                    {extractedTags.industry ? (
                      <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                        {extractedTags.industry as string}
                      </span>
                    ) : null}
                    {extractedTags.stage ? (
                      <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">
                        {extractedTags.stage as string}
                      </span>
                    ) : null}
                  </div>
                  {extractedTags.key_problem ? (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-500">Problem:</span>{" "}
                      {extractedTags.key_problem as string}
                    </p>
                  ) : null}
                  {extractedTags.unique_value_prop ? (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-500">Unique Value:</span>{" "}
                      {extractedTags.unique_value_prop as string}
                    </p>
                  ) : null}
                </div>
              )}
            </>
          )}

          {selectedRole === "mentor" && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Expertise Area <span className="text-red-400">*</span>
                </label>
                <select
                  value={isOtherExpertise ? "Other" : form.expertiseAreas}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      expertiseAreas: val,
                      customExpertise:
                        val !== "Other" ? "" : prev.customExpertise,
                    }));
                    if (errors.expertise)
                      setErrors((prev) => ({ ...prev, expertise: "" }));
                  }}
                  className={`w-full bg-gray-900 border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none ${
                    errors.expertise ? "border-red-500" : "border-gray-700"
                  }`}
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
                    type="text"
                    value={form.customExpertise}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        customExpertise: e.target.value,
                      }));
                      if (errors.expertise)
                        setErrors((prev) => ({ ...prev, expertise: "" }));
                    }}
                    placeholder="Enter your expertise area"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mt-2 focus:border-blue-500 focus:outline-none"
                  />
                )}
                {errors.expertise && (
                  <p className="text-xs text-red-400 mt-1">{errors.expertise}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={form.yearsExperience}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      yearsExperience: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Past Mentoring Experience
                </label>
                <textarea
                  value={form.pastMentoring}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pastMentoring: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Describe your mentoring background..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? "Saving..." : "Get Started"}
          </button>
        </div>
      </div>
    </main>
  );
}
