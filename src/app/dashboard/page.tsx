"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship } from "@/lib/types";
import NavBar from "@/components/NavBar";
import Link from "next/link";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !profile) return;

    // Show all relationships for demo — seeded data uses hardcoded IDs
    const q = query(collection(db, "relationships"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rels = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Relationship));
      setRelationships(rels);
    });

    return () => unsubscribe();
  }, [user, profile]);

  if (loading || !profile) return null;

  const healthColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const trendIcon = (trend: string) => {
    if (trend === "improving") return "↑";
    if (trend === "decaying") return "↓";
    return "→";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Relationships</h1>
          <Link href="/matches" className="text-sm text-blue-400 hover:text-blue-300">
            View Matches →
          </Link>
        </div>

        {relationships.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No active relationships yet.</p>
            <p className="text-sm mt-2">
              Once your programme manager triggers AI matching, your matches will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {relationships.map((rel) => (
              <Link
                key={rel.id}
                href={`/matches/${rel.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Relationship #{rel.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-400">{rel.match_narrative}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={`text-2xl font-bold ${healthColor(rel.health_score)}`}>
                      {rel.health_score}
                    </p>
                    <p className={`text-xs ${healthColor(rel.health_score)}`}>
                      {trendIcon(rel.health_trend)} {rel.health_trend}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>Milestones: {rel.milestones_completed}/{rel.milestones_total}</span>
                  <span>Messages: {rel.platform_messages_sent}</span>
                  <span>Status: {rel.outcome_status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
