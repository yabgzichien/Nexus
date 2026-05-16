"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import NavBar from "@/components/NavBar";

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

export default function ProfilePage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    bio: "",
    industry: "",
    customIndustry: "",
    stage: "",
    expertiseAreas: "",
    yearsExperience: "",
    pastMentoring: "",
    deckUploaded: false,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  const isOtherIndustry = form.industry === "Other" || (form.industry && !INDUSTRY_OPTIONS.includes(form.industry));

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (profile && !initialized.current) {
      initialized.current = true;
      const profileIndustry = profile.industry || "";
      const isOther = profileIndustry && !INDUSTRY_OPTIONS.includes(profileIndustry);
      setForm({
        name: profile.name || "",
        bio: profile.bio || "",
        industry: isOther ? "Other" : profileIndustry,
        customIndustry: isOther ? profileIndustry : "",
        stage: "",
        expertiseAreas: profile.role === "mentor" ? (profile.expertise_areas?.join(", ") || "") : "",
        yearsExperience: profile.role === "mentor" ? (profile.years_experience?.toString() || "") : "",
        pastMentoring: profile.role === "mentor" ? (profile.past_mentoring || "") : "",
        deckUploaded: !!profile.pitch_deck_url,
      });
    }
  }, [profile, loading, user, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const storageRef = ref(storage, `pitch-decks/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateProfile({ pitch_deck_url: url });
    setForm((prev) => ({ ...prev, deckUploaded: true }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const finalIndustry = form.industry === "Other" ? form.customIndustry : form.industry;
    const data: Record<string, unknown> = { name: form.name, bio: form.bio, industry: finalIndustry };

    if (profile?.role === "startup") {
      data.stage = form.stage;
    } else if (profile?.role === "mentor") {
      data.expertise_areas = form.expertiseAreas.split(",").map((s) => s.trim()).filter(Boolean);
      data.years_experience = parseInt(form.yearsExperience) || 0;
      data.past_mentoring = form.pastMentoring;
    }

    await updateProfile(data);
    setSaving(false);
    router.push("/dashboard");
  };

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {profile.role === "startup" ? "Startup Profile" : "Mentor Profile"}
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Industry</label>
            <select
              value={isOtherIndustry ? "Other" : form.industry}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  industry: val,
                  customIndustry: val !== "Other" ? "" : prev.customIndustry,
                }));
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {isOtherIndustry && (
              <input
                type="text"
                value={form.customIndustry}
                onChange={(e) => setForm((prev) => ({ ...prev, customIndustry: e.target.value }))}
                placeholder="Enter your industry"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mt-2 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          {profile.role === "startup" && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select stage</option>
                  <option value="ideation">Ideation</option>
                  <option value="mvp">MVP</option>
                  <option value="early-traction">Early Traction</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Pitch Deck</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {uploading ? "Uploading..." : form.deckUploaded ? "Replace Deck" : "Upload PDF"}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {form.deckUploaded && (
                    <span className="text-green-400 text-sm">✓ Deck uploaded</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Gemini AI will analyze your pitch deck to extract tags and score your startup.
                </p>
              </div>

              {profile.quality_score !== undefined && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">AI Quality Score</h3>
                    <span className="text-2xl font-bold text-blue-400">
                      {profile.quality_score}/100
                    </span>
                  </div>
                  {profile.quality_breakdown && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Problem Clarity</span>
                        <span>{profile.quality_breakdown.problem_clarity}/25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Market Size</span>
                        <span>{profile.quality_breakdown.market_size}/25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Team Strength</span>
                        <span>{profile.quality_breakdown.team_strength}/25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">MVP Readiness</span>
                        <span>{profile.quality_breakdown.mvp_readiness}/25</span>
                      </div>
                    </div>
                  )}
                  {profile.quality_summary && (
                    <p className="text-sm text-gray-300 italic">{profile.quality_summary}</p>
                  )}
                </div>
              )}

              {profile.tags && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium">AI-Extracted Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.tags.tech_stack?.map((tech) => (
                      <span key={tech} className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs">
                        {tech}
                      </span>
                    ))}
                    {profile.tags.industry && (
                      <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                        {profile.tags.industry}
                      </span>
                    )}
                    {profile.tags.stage && (
                      <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">
                        {profile.tags.stage}
                      </span>
                    )}
                  </div>
                  {profile.tags.key_problem && (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-500">Problem:</span> {profile.tags.key_problem}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {profile.role === "mentor" && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Expertise Areas</label>
                <input
                  type="text"
                  value={form.expertiseAreas}
                  onChange={(e) => setForm((prev) => ({ ...prev, expertiseAreas: e.target.value }))}
                  placeholder="e.g. Product Strategy, Fundraising, Go-to-Market"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Years of Experience</label>
                <input
                  type="number"
                  value={form.yearsExperience}
                  onChange={(e) => setForm((prev) => ({ ...prev, yearsExperience: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Past Mentoring Experience</label>
                <textarea
                  value={form.pastMentoring}
                  onChange={(e) => setForm((prev) => ({ ...prev, pastMentoring: e.target.value }))}
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
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
