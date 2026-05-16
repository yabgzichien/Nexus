"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

export default function ExplorePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !profile) return;

    const loadRecommendations = async () => {
      setLoadingRecommendations(true);
      const targetRole = profile.role === "startup" ? "mentor" : "startup";

      const q = query(
        collection(db, "users"),
        where("role", "==", targetRole),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter((u) => u.industry);

      const sameIndustry = users.filter(
        (u) => u.industry === profile.industry
      );
      const others = users.filter(
        (u) => u.industry !== profile.industry
      );

      const recommended = [...sameIndustry, ...others].slice(0, 5);
      setRecommendations(recommended);
      setLoadingRecommendations(false);
    };

    loadRecommendations();
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile || !searchQuery.trim()) {
      return;
    }

    const debounce = setTimeout(async () => {
      const targetRole = profile.role === "startup" ? "mentor" : "startup";
      const q = query(
        collection(db, "users"),
        where("role", "==", targetRole),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const query_lower = searchQuery.toLowerCase();
      const results = snapshot.docs
        .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
        .filter(
          (u) =>
            u.name && u.name.toLowerCase().includes(query_lower)
        )
        .slice(0, 10);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, user, profile]);

  useEffect(() => {
    if (!user) return;

    const loadSentRequests = async () => {
      const q = query(
        collection(db, "connection_requests"),
        where("sender_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const receiverIds = new Set(
        snapshot.docs.map((d) => d.data().receiver_id)
      );
      setSentRequests(receiverIds);
    };

    loadSentRequests();
  }, [user]);

  const handleConnect = async (receiverId: string) => {
    if (!user) return;
    setConnecting(receiverId);

    try {
      await addDoc(collection(db, "connection_requests"), {
        sender_id: user.uid,
        receiver_id: receiverId,
        status: "pending",
        created_at: Timestamp.now(),
      });
      setSentRequests((prev) => new Set(prev).add(receiverId));
    } catch (err) {
      console.error("Failed to send connection request:", err);
    }

    setConnecting(null);
  };

  const displayList = searchQuery.trim() ? searchResults : recommendations;
  const showSearch = searchQuery.trim().length > 0;

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Explore</h1>
          <button
            onClick={() => router.push("/requests")}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Requests
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSearchResults([]);
              }
            }}
            placeholder={`Search ${
              profile.role === "startup" ? "mentors" : "startups"
            } by name...`}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>

        {showSearch && (
          <p className="text-xs text-gray-500 mb-4">
            Search results for &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {!showSearch && (
          <p className="text-xs text-gray-500 mb-4">
            Recommended {profile.role === "startup" ? "mentors" : "startups"} for
            you
          </p>
        )}

        {loadingRecommendations && !showSearch ? (
          <div className="text-center py-16 text-gray-500 animate-pulse">
            Loading recommendations...
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">
              {showSearch
                ? "No users found."
                : "No recommendations available."}
            </p>
            <p className="text-sm mt-2">
              {showSearch
                ? "Try a different search term."
                : "Complete your profile to get recommendations."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((person) => (
              <div
                key={person.uid}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => router.push(`/view/${person.uid}`)}
                    className="flex items-center gap-3 text-left flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {person.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-sm text-gray-400">
                        {person.industry}
                      </p>
                      {person.role === "startup" &&
                        person.quality_score !== undefined && (
                          <p className="text-xs text-blue-400 mt-1">
                            Quality Score: {person.quality_score}/100
                          </p>
                        )}
                      {person.role === "mentor" &&
                        person.expertise_areas &&
                        person.expertise_areas.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {person.expertise_areas.join(", ")}
                          </p>
                        )}
                    </div>
                  </button>
                  <button
                    onClick={() => handleConnect(person.uid)}
                    disabled={
                      connecting === person.uid ||
                      sentRequests.has(person.uid)
                    }
                    className={`px-4 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      sentRequests.has(person.uid)
                        ? "bg-gray-700 text-gray-500 cursor-default"
                        : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    }`}
                  >
                    {sentRequests.has(person.uid)
                      ? "Requested"
                      : connecting === person.uid
                      ? "..."
                      : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
