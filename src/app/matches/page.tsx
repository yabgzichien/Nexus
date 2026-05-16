"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

interface MatchWithProfile extends Relationship {
  matchedProfile?: UserProfile;
}

export default function MatchesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !profile) return;

    const loadMatches = async () => {
      const field = profile.role === "startup" ? "startup_id" : "mentor_id";
      const otherField = profile.role === "startup" ? "mentor_id" : "startup_id";

      const q = query(collection(db, "relationships"), where(field, "==", user.uid));
      const snapshot = await getDocs(q);

      const matchesWithProfiles: MatchWithProfile[] = await Promise.all(
        snapshot.docs.map(async (relDoc) => {
          const rel = { id: relDoc.id, ...relDoc.data() } as Relationship;
          const otherId = profile.role === "startup" ? rel.mentor_id : rel.startup_id;
          const profileDoc = await getDoc(doc(db, "users", otherId));
          const matchedProfile = profileDoc.exists()
            ? ({ uid: otherId, ...profileDoc.data() } as UserProfile)
            : undefined;
          return { ...rel, matchedProfile };
        })
      );

      setMatches(matchesWithProfiles);
      setLoadingMatches(false);
    };

    loadMatches();
  }, [user, profile]);

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {profile.role === "startup" ? "My Matched Mentors" : "My Matched Startups"}
        </h1>

        {loadingMatches ? (
          <div className="text-center py-16 text-gray-500 animate-pulse">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No matches yet.</p>
            <p className="text-sm mt-2">
              Your programme manager will trigger AI matching when the cohort is ready.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {match.matchedProfile?.name || "Unknown"}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {match.matchedProfile?.industry}
                      {match.matchedProfile?.expertise_areas &&
                        ` · ${match.matchedProfile.expertise_areas.join(", ")}`}
                    </p>
                  </div>
                  <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                    {match.edge_weight}% match
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-300 italic">
                    &ldquo;{match.match_narrative}&rdquo;
                  </p>
                  <p className="text-xs text-gray-500 mt-2">— Gemini AI Match Analysis</p>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <span>Health: <span className={
                    match.health_score >= 70 ? "text-green-400" :
                    match.health_score >= 40 ? "text-yellow-400" : "text-red-400"
                  }>{match.health_score}/100</span></span>
                  <span>Milestones: {match.milestones_completed}/{match.milestones_total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
