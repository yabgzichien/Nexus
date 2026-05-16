"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import Link from "next/link";

export default function PublicProfilePage() {
  const params = useParams();
  const uid = params.uid as string;
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((docSnap) => {
      if (docSnap.exists()) {
        setProfileData({ uid, ...docSnap.data() } as UserProfile);
      } else {
        setNotFound(true);
      }
    });
  }, [uid]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-lg font-bold">
            NEX<span className="text-blue-400">US</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
              {profileData.role === "startup" ? "🚀" : "🎯"}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profileData.name}</h1>
              <p className="text-sm text-gray-400">
                {profileData.role === "startup" ? "Startup" : "Mentor"} · {profileData.industry}
              </p>
            </div>
          </div>

          {profileData.bio && (
            <p className="text-gray-300">{profileData.bio}</p>
          )}

          {profileData.role === "mentor" && profileData.expertise_areas && (
            <div>
              <h3 className="text-sm text-gray-500 mb-2">Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.expertise_areas.map((area) => (
                  <span key={area} className="bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full text-sm">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profileData.role === "startup" && profileData.tags && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm text-gray-500 mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.tags.tech_stack?.map((tech) => (
                    <span key={tech} className="bg-green-900/40 text-green-300 px-3 py-1 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              {profileData.tags.key_problem && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-1">Problem</h3>
                  <p className="text-sm text-gray-300">{profileData.tags.key_problem}</p>
                </div>
              )}
              {profileData.quality_score && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">AI Quality Score:</span>
                  <span className="text-blue-400 font-bold">{profileData.quality_score}/100</span>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Powered by NEXUS — AI Relationship Operating System
        </p>
      </div>
    </div>
  );
}
