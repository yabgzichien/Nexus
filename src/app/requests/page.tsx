"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ConnectionRequest, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

interface RequestWithUser extends ConnectionRequest {
  sender: UserProfile;
}

export default function RequestsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestWithUser[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "connection_requests"),
      where("receiver_id", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requestsWithUsers: RequestWithUser[] = [];

      for (const d of snapshot.docs) {
        const data = d.data() as ConnectionRequest;
        const senderDoc = await getDoc(doc(db, "users", data.sender_id));
        if (senderDoc.exists()) {
          requestsWithUsers.push({
            ...data,
            id: d.id,
            sender: {
              uid: data.sender_id,
              ...senderDoc.data(),
            } as UserProfile,
          });
        }
      }

      setRequests(requestsWithUsers);
    });

    return () => unsubscribe();
  }, [user]);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await updateDoc(doc(db, "connection_requests", requestId), {
        status: "approved",
      });
    } catch (err) {
      console.error("Failed to approve request:", err);
    }
    setProcessing(null);
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await updateDoc(doc(db, "connection_requests", requestId), {
        status: "rejected",
      });
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
    setProcessing(null);
  };

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/matches")}
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
          <h1 className="text-2xl font-bold">Connection Requests</h1>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No pending requests.</p>
            <p className="text-sm mt-2">
              When someone sends you a connection request, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() =>
                      router.push(`/view/${request.sender_id}`)
                    }
                    className="flex items-center gap-3 text-left flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {request.sender.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{request.sender.name}</p>
                      <p className="text-sm text-gray-400">
                        {request.sender.role === "mentor"
                          ? "Mentor"
                          : "Startup"}{" "}
                        · {request.sender.industry}
                      </p>
                      {request.sender.role === "startup" &&
                        request.sender.quality_score !== undefined && (
                          <p className="text-xs text-blue-400 mt-1">
                            Quality Score: {request.sender.quality_score}/100
                          </p>
                        )}
                      {request.sender.role === "mentor" &&
                        request.sender.expertise_areas && (
                          <p className="text-xs text-gray-500 mt-1">
                            {request.sender.expertise_areas.join(", ")}
                          </p>
                        )}
                    </div>
                  </button>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processing === request.id}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                    >
                      {processing === request.id ? "..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
