"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Programme, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

export default function ProgrammePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState(60);
  const [creating, setCreating] = useState(false);

  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [startups, setStartups] = useState<UserProfile[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role !== "admin") router.push("/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    // Show all programmes for demo — seeded data uses hardcoded created_by IDs
    const q = query(collection(db, "programmes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProgrammes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Programme)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedProgramme) return;
    const loadStartups = async () => {
      const q = query(collection(db, "users"), where("role", "==", "startup"));
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
      setStartups(all.filter((s) => (s.quality_score || 0) >= selectedProgramme.match_threshold));
    };
    loadStartups();
  }, [selectedProgramme]);

  const handleCreate = async () => {
    if (!user || !name) return;
    setCreating(true);
    await addDoc(collection(db, "programmes"), {
      name,
      description,
      status: "active",
      match_threshold: threshold,
      created_by: user.uid,
      created_at: Timestamp.now(),
    });
    setName("");
    setDescription("");
    setThreshold(60);
    setShowCreate(false);
    setCreating(false);
  };

  const handleGenerateMatches = async () => {
    if (!selectedProgramme) return;
    setMatching(true);
    setMatchResult(null);

    try {
      const response = await fetch("/api/generate-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId: selectedProgramme.id }),
      });
      const data = await response.json();
      setMatchResult(`Generated ${data.matchCount} matches successfully!`);
    } catch {
      setMatchResult("Match generation triggered. Check the dashboard for results.");
    }
    setMatching(false);
  };

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Programmes</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Programme
          </button>
        </div>

        {showCreate && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 space-y-4">
            <h2 className="font-medium">Create Programme</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Programme name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Quality Threshold: {threshold}/100
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only startups scoring above this threshold will be matched.
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !name}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? "Creating..." : "Create Programme"}
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {programmes.map((prog) => (
            <div
              key={prog.id}
              className={`bg-gray-900 border rounded-lg p-5 cursor-pointer transition-colors ${
                selectedProgramme?.id === prog.id
                  ? "border-blue-500"
                  : "border-gray-800 hover:border-gray-600"
              }`}
              onClick={() => setSelectedProgramme(prog)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{prog.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{prog.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  prog.status === "active" ? "bg-green-900/50 text-green-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {prog.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Threshold: {prog.match_threshold}/100
              </p>
            </div>
          ))}
        </div>

        {selectedProgramme && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {selectedProgramme.name} — Startup Pool
              </h2>
              <button
                onClick={handleGenerateMatches}
                disabled={matching}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {matching ? "Generating..." : "🤖 Generate Matches"}
              </button>
            </div>

            {matchResult && (
              <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-3 text-sm text-purple-300">
                {matchResult}
              </div>
            )}

            <div className="grid gap-3">
              {startups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No qualified startups above threshold ({selectedProgramme.match_threshold}/100).
                </p>
              ) : (
                startups.map((startup) => (
                  <div
                    key={startup.uid}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{startup.name}</p>
                      <p className="text-xs text-gray-400">
                        {startup.industry} · {startup.tags?.stage || "Unknown stage"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-400">
                        {startup.quality_score || 0}
                      </p>
                      <p className="text-xs text-gray-500">quality score</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
