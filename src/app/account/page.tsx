"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
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

export default function AccountPage() {
  const { user, profile, loading, updateProfile, logout } = useAuth();
  const router = useRouter();

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedProfile, setScannedProfile] = useState<string | null>(null);
  const initialized = useRef(false);

  const isOtherIndustry =
    form.industry === "Other" ||
    (form.industry && !INDUSTRY_OPTIONS.includes(form.industry));

  const isOtherExpertise =
    form.expertiseAreas === "Other" ||
    (form.expertiseAreas &&
      !EXPERTISE_OPTIONS.includes(form.expertiseAreas));

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (profile && !initialized.current) {
      initialized.current = true;
      const profileIndustry = profile.industry || "";
      const isOther =
        profileIndustry && !INDUSTRY_OPTIONS.includes(profileIndustry);
      const profileExpertise = profile.expertise_areas?.[0] || "";
      const isOtherExp =
        profileExpertise &&
        !EXPERTISE_OPTIONS.includes(profileExpertise);
      setForm({
        name: profile.name || "",
        description: profile.description || "",
        industry: isOther ? "Other" : profileIndustry,
        customIndustry: isOther ? profileIndustry : "",
        stage: profile.role === "startup" ? (profile.stage || "") : "",
        expertiseAreas: isOtherExp ? "Other" : profileExpertise,
        customExpertise: isOtherExp ? profileExpertise : "",
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
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        setScannedProfile(decodedText);
        setScanning(false);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanning]);

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
          // Update local profile state with extracted data
          if (data.tags || data.quality_score !== undefined) {
            const updateData: Record<string, unknown> = {};
            if (data.tags) {
              updateData.tags = data.tags;
              setForm((prev) => ({
                ...prev,
                industry: data.tags.industry || prev.industry,
              }));
            }
            if (data.quality_score !== undefined) {
              updateData.quality_score = data.quality_score;
            }
            if (data.quality_breakdown) {
              updateData.quality_breakdown = data.quality_breakdown;
            }
            if (data.quality_summary) {
              updateData.quality_summary = data.quality_summary;
            }
            await updateProfile(updateData);

            // Fire and forget — generate embedding with updated tags
            fetch("/api/embed-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.uid }),
            }).catch((err) => console.error("Embed failed:", err));
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

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Failed to delete account:", err);
      setDeleting(false);
    }
  };

  if (loading || !profile || !user) return null;

  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/view/${user.uid}`
      : "";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Account</h1>

        <div className="space-y-8">
          {/* Profile Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">
              Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
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
                  Industry
                </label>
                <select
                  value={isOtherIndustry ? "Other" : form.industry}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      industry: val,
                      customIndustry:
                        val !== "Other" ? "" : prev.customIndustry,
                    }));
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
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
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customIndustry: e.target.value,
                      }))
                    }
                    placeholder="Enter your industry"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mt-2 focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>

              {profile.role === "startup" && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Stage
                    </label>
                    <select
                      value={form.stage}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, stage: e.target.value }))
                      }
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
                </>
              )}

              {profile.role === "mentor" && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Expertise Area
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
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
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
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            customExpertise: e.target.value,
                          }))
                        }
                        placeholder="Enter your expertise area"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mt-2 focus:border-blue-500 focus:outline-none"
                      />
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
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* AI Quality Section (Startup only) */}
          {profile.role === "startup" &&
            (profile.quality_score !== undefined || profile.tags) && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-300">
                  AI Analysis
                </h2>
                <div className="space-y-4">
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
                            <span className="text-gray-400">
                              Problem Clarity
                            </span>
                            <span>
                              {profile.quality_breakdown.problem_clarity}/25
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Market Size</span>
                            <span>
                              {profile.quality_breakdown.market_size}/25
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              Team Strength
                            </span>
                            <span>
                              {profile.quality_breakdown.team_strength}/25
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              MVP Readiness
                            </span>
                            <span>
                              {profile.quality_breakdown.mvp_readiness}/25
                            </span>
                          </div>
                        </div>
                      )}
                      {profile.quality_summary && (
                        <p className="text-sm text-gray-300 italic">
                          {profile.quality_summary}
                        </p>
                      )}
                    </div>
                  )}

                  {profile.tags && (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                      <h3 className="font-medium">AI-Extracted Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.tags.tech_stack?.map((tech) => (
                          <span
                            key={tech}
                            className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs"
                          >
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
                          <span className="text-gray-500">Problem:</span>{" "}
                          {profile.tags.key_problem}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* QR Badge Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">
              QR Badge
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center space-y-3">
                <h3 className="font-medium text-sm text-gray-400">My Badge</h3>
                <div className="inline-block bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={profileUrl}
                    size={150}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Show this at events for instant profile discovery
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center space-y-3">
                <h3 className="font-medium text-sm text-gray-400">
                  Scan a Badge
                </h3>

                {!scanning && !scannedProfile && (
                  <button
                    onClick={() => setScanning(true)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Open Scanner
                  </button>
                )}

                {scanning && (
                  <div>
                    <div
                      id="qr-reader"
                      className="rounded-lg overflow-hidden"
                    />
                    <button
                      onClick={() => setScanning(false)}
                      className="mt-2 text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {scannedProfile && (
                  <div className="space-y-2">
                    <p className="text-green-400 text-sm">Badge scanned!</p>
                    <a
                      href={scannedProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      View Profile
                    </a>
                    <button
                      onClick={() => {
                        setScannedProfile(null);
                        setScanning(false);
                      }}
                      className="block mx-auto text-xs text-gray-400 hover:text-white"
                    >
                      Scan Another
                    </button>
                  </div>
                )}

                {!scanning && !scannedProfile && (
                  <p className="text-xs text-gray-500">
                    Scan another participant&apos;s badge to view their profile
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sign Out Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">
              Session
            </h2>
            <button
              onClick={handleSignOut}
              className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-medium transition-colors text-red-400"
            >
              Sign Out
            </button>
          </div>

          {/* Delete Account Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">
              Danger Zone
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Delete your account data to test the sign-up flow again.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 py-3 rounded-lg font-medium transition-colors text-red-400"
            >
              Delete Account
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-sm mx-4 p-6">
                <h2 className="text-lg font-bold mb-2">Delete Account?</h2>
                <p className="text-sm text-gray-400 mb-6">
                  This will delete your profile data from the database. You can
                  sign in again with the same Google account to create a new
                  profile.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 py-2 rounded-lg font-medium transition-colors"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
