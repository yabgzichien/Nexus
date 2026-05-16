"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, Milestone, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

export default function RelationshipDetailPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const relationshipId = params.id as string;

  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!relationshipId) return;

    const unsubscribe = onSnapshot(doc(db, "relationships", relationshipId), (docSnap) => {
      if (docSnap.exists()) {
        setRelationship({ id: docSnap.id, ...docSnap.data() } as Relationship);
      }
    });

    return () => unsubscribe();
  }, [relationshipId]);

  useEffect(() => {
    if (!relationship || !profile) return;

    const otherId = profile.role === "startup" ? relationship.mentor_id : relationship.startup_id;
    getDoc(doc(db, "users", otherId)).then((docSnap) => {
      if (docSnap.exists()) {
        setOtherProfile({ uid: otherId, ...docSnap.data() } as UserProfile);
      }
    });

    const q = query(collection(db, "milestones"), where("relationship_id", "==", relationshipId));
    getDocs(q).then((snapshot) => {
      setMilestones(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Milestone)));
    });
  }, [relationship, profile, relationshipId]);

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!user || !relationshipId) return;
    setCompleting(milestoneId);

    try {
      console.log("Step 1: updating milestone", milestoneId);
      await updateDoc(doc(db, "milestones", milestoneId), {
        status: "completed",
        completed_at: Timestamp.now(),
      });

      console.log("Step 2: logging signal");
      await addDoc(collection(db, "signals"), {
        relationship_id: relationshipId,
        signal_type: "milestone_complete",
        actor_id: user.uid,
        timestamp: Timestamp.now(),
        metadata: { milestone_id: milestoneId },
      });

      console.log("Step 3: updating relationship health");
      const newCompleted = (relationship?.milestones_completed || 0) + 1;
      const newHealth = Math.min(100, (relationship?.health_score || 50) + 8);
      await updateDoc(doc(db, "relationships", relationshipId), {
        milestones_completed: newCompleted,
        health_score: newHealth,
        last_active_at: Timestamp.now(),
      });

      // Trigger health narration (non-blocking)
      fetch("/api/health-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId }),
      });

      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, status: "completed", completed_at: Timestamp.now() } : m
        )
      );
    } catch (err) {
      console.error("Milestone completion failed:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    setCompleting(null);
  };

  if (loading || !relationship || !profile) return null;

  const healthColor =
    relationship.health_score >= 70 ? "text-green-400" :
    relationship.health_score >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-white mb-4"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {otherProfile?.name || "Loading..."}
              </h1>
              <p className="text-sm text-gray-400">
                {otherProfile?.role === "mentor" ? "Mentor" : "Startup"}
                {otherProfile?.industry && ` · ${otherProfile.industry}`}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${healthColor}`}>
                {relationship.health_score}
              </p>
              <p className={`text-sm ${healthColor}`}>
                {relationship.health_trend === "improving" ? "↑ Improving" :
                 relationship.health_trend === "decaying" ? "↓ Decaying" : "→ Stable"}
              </p>
            </div>
          </div>

          {relationship.match_narrative && (
            <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-300 italic">
                &ldquo;{relationship.match_narrative}&rdquo;
              </p>
              <p className="text-xs text-gray-500 mt-1">— AI Match Reasoning</p>
            </div>
          )}

          {relationship.health_narration && (
            <div className="mt-3 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                {relationship.health_narration}
              </p>
              <p className="text-xs text-blue-400/60 mt-1">— Gemini Health Analysis</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{relationship.edge_weight}%</p>
            <p className="text-xs text-gray-500">Match Score</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">
              {relationship.milestones_completed}/{relationship.milestones_total}
            </p>
            <p className="text-xs text-gray-500">Milestones</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{relationship.platform_messages_sent}</p>
            <p className="text-xs text-gray-500">Messages</p>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="font-bold mb-4">Dynamic Blueprint — Milestones</h2>
          {milestones.length === 0 ? (
            <p className="text-gray-500 text-sm">No milestones set for this relationship yet.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    milestone.status === "completed"
                      ? "border-green-800/30 bg-green-900/10"
                      : "border-gray-700 bg-gray-800/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      milestone.status === "completed"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {milestone.status === "completed" ? "✓" : "○"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{milestone.title}</p>
                      <p className="text-xs text-gray-500">
                        {milestone.blueprint_type}
                        {milestone.due_at && ` · Due: ${milestone.due_at.toDate?.()?.toLocaleDateString() || ""}`}
                      </p>
                    </div>
                  </div>
                  {milestone.status === "pending" && (
                    <button
                      onClick={() => handleCompleteMilestone(milestone.id)}
                      disabled={completing === milestone.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      {completing === milestone.id ? "..." : "Complete"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
