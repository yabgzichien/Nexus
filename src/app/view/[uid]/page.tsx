"use client";

import { useAuth } from "@/lib/auth-context";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, ConnectionRequest } from "@/lib/types";

export default function PublicProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ConnectionRequest | null>(null);
  const [processing, setProcessing] = useState(false);

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

  useEffect(() => {
    if (!user || !uid) return;

    const checkExistingRequest = async () => {
      const sentQ = query(
        collection(db, "connection_requests"),
        where("sender_id", "==", user.uid),
        where("receiver_id", "==", uid)
      );
      const sentSnap = await getDocs(sentQ);
      if (!sentSnap.empty) {
        const data = sentSnap.docs[0].data() as ConnectionRequest;
        setConnectionStatus(data.status);
      }

      const receivedQ = query(
        collection(db, "connection_requests"),
        where("sender_id", "==", uid),
        where("receiver_id", "==", user.uid)
      );
      const receivedSnap = await getDocs(receivedQ);
      if (!receivedSnap.empty) {
        const data = receivedSnap.docs[0].data() as ConnectionRequest;
        if (data.status === "pending") {
          setPendingRequest({
            ...data,
            id: receivedSnap.docs[0].id,
          } as ConnectionRequest);
        } else {
          setConnectionStatus(data.status);
        }
      }
    };

    checkExistingRequest();
  }, [user, uid]);

  const handleConnect = async () => {
    if (!user || !uid) return;
    setConnecting(true);

    try {
      await addDoc(collection(db, "connection_requests"), {
        sender_id: user.uid,
        receiver_id: uid,
        status: "pending",
        created_at: Timestamp.now(),
      });
      setConnectionStatus("pending");
    } catch (err) {
      console.error("Failed to send connection request:", err);
    }

    setConnecting(false);
  };

  const handleApprove = async () => {
    if (!pendingRequest) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "connection_requests", pendingRequest.id), {
        status: "approved",
      });
      setPendingRequest(null);
      setConnectionStatus("approved");
    } catch (err) {
      console.error("Failed to approve request:", err);
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!pendingRequest) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "connection_requests", pendingRequest.id), {
        status: "rejected",
      });
      setPendingRequest(null);
    } catch (err) {
      console.error("Failed to reject request:", err);
    }

    setProcessing(false);
  };

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
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <span className="text-lg font-bold">
            NEX<span className="text-blue-400">US</span>
          </span>
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
                {profileData.role === "startup" ? "Startup" : "Mentor"} ·{" "}
                {profileData.industry}
              </p>
            </div>
          </div>

          {profileData.description && (
            <p className="text-gray-300">{profileData.description}</p>
          )}

          {profileData.role === "mentor" && profileData.expertise_areas && (
            <div>
              <h3 className="text-sm text-gray-500 mb-2">Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.expertise_areas.map((area) => (
                  <span
                    key={area}
                    className="bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full text-sm"
                  >
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
                    <span
                      key={tech}
                      className="bg-green-900/40 text-green-300 px-3 py-1 rounded-full text-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              {profileData.tags.key_problem && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-1">Problem</h3>
                  <p className="text-sm text-gray-300">
                    {profileData.tags.key_problem}
                  </p>
                </div>
              )}
              {profileData.quality_score && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    AI Quality Score:
                  </span>
                  <span className="text-blue-400 font-bold">
                    {profileData.quality_score}/100
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {user && user.uid !== uid && (
          <div className="mt-6">
            {pendingRequest ? (
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {processing ? "..." : "Reject"}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {processing ? "..." : "Approve"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting || connectionStatus === "pending" || connectionStatus === "approved"}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  connectionStatus === "pending" || connectionStatus === "approved"
                    ? "bg-gray-700 text-gray-500 cursor-default"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                }`}
              >
                {connectionStatus === "approved"
                  ? "Connected"
                  : connectionStatus === "pending"
                  ? "Connection Requested"
                  : connecting
                  ? "Sending..."
                  : "Connect"}
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-8">
          Powered by NEXUS — AI Relationship Operating System
        </p>
      </div>
    </div>
  );
}
