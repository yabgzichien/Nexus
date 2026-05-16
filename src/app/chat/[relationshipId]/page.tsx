"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, Milestone, Message, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

export default function ChatDetailPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const relationshipId = params.relationshipId as string;

  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!relationshipId) return;

    const unsubscribe = onSnapshot(
      doc(db, "relationships", relationshipId),
      (docSnap) => {
        if (docSnap.exists()) {
          setRelationship({
            id: docSnap.id,
            ...docSnap.data(),
          } as Relationship);
        }
      }
    );

    return () => unsubscribe();
  }, [relationshipId]);

  useEffect(() => {
    if (!relationship || !profile) return;

    const otherId =
      profile.role === "startup"
        ? relationship.mentor_id
        : relationship.startup_id;
    getDoc(doc(db, "users", otherId)).then((docSnap) => {
      if (docSnap.exists()) {
        setOtherProfile({ uid: otherId, ...docSnap.data() } as UserProfile);
      }
    });

    const milestonesQuery = query(
      collection(db, "milestones"),
      where("relationship_id", "==", relationshipId)
    );
    const unsubMilestones = onSnapshot(milestonesQuery, (snapshot) => {
      const m = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Milestone)
      );
      setMilestones(m);
    });

    return () => unsubMilestones();
  }, [relationship, profile, relationshipId]);

  useEffect(() => {
    if (!relationshipId) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where("relationship_id", "==", relationshipId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const msgs = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Message)
      );
      setMessages(msgs);

      const unreadBatch = snapshot.docs.filter(
        (d) => !d.data().read && d.data().sender_id !== user?.uid
      );
      for (const d of unreadBatch) {
        await updateDoc(doc(db, "messages", d.id), { read: true });
      }
    });

    return () => unsubscribe();
  }, [relationshipId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !relationshipId) return;
    setSending(true);

    try {
      await addDoc(collection(db, "messages"), {
        relationship_id: relationshipId,
        sender_id: user.uid,
        text: newMessage.trim(),
        timestamp: Timestamp.now(),
        read: false,
      });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }

    setSending(false);
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    if (!user || !relationship || !relationshipId) return;
    setToggling(milestone.id);

    const isCompleting = milestone.status === "pending";

    try {
      await updateDoc(doc(db, "milestones", milestone.id), {
        status: isCompleting ? "completed" : "pending",
        completed_at: isCompleting ? Timestamp.now() : null,
      });

      await addDoc(collection(db, "signals"), {
        relationship_id: relationshipId,
        signal_type: "milestone_complete",
        actor_id: user.uid,
        timestamp: Timestamp.now(),
        metadata: {
          milestone_id: milestone.id,
          action: isCompleting ? "complete" : "revert",
        },
      });

      const newCompleted = isCompleting
        ? completedCount + 1
        : completedCount - 1;
      await updateDoc(doc(db, "relationships", relationshipId), {
        milestones_completed: newCompleted,
        last_active_at: Timestamp.now(),
      });

      if (isCompleting) {
        fetch("/api/health-narration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipId }),
        });
      }
    } catch (err) {
      console.error("Failed to toggle milestone:", err);
    }

    setToggling(null);
  };

  const formatMessageTime = (timestamp: Message["timestamp"]) => {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (timestamp: Message["timestamp"]) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const shouldShowDateSeparator = (
    current: Message,
    previous: Message | undefined
  ) => {
    if (!previous) return true;
    const currentDate = current.timestamp?.toDate?.()?.toDateString();
    const previousDate = previous.timestamp?.toDate?.()?.toDateString();
    return currentDate !== previousDate;
  };

  if (loading || !relationship || !profile) return null;

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Panel - Chat */}
        <div className="flex-1 flex flex-col border-r border-gray-800">
          {/* Chat Header */}
          <div className="h-16 border-b border-gray-800 flex items-center px-4 gap-4 flex-shrink-0">
            <button
              onClick={() => router.push("/chat")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-lg">
                {otherProfile?.name || "Loading..."}
              </h1>
              <p className="text-xs text-gray-400">
                {otherProfile?.role === "mentor" ? "Mentor" : "Startup"}
                {otherProfile?.industry && ` · ${otherProfile.industry}`}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isSent = msg.sender_id === user?.uid;
                const showDate = shouldShowDateSeparator(
                  msg,
                  messages[index - 1]
                );

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full">
                          {formatDateSeparator(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${
                        isSent ? "justify-end" : "justify-start"
                      } mb-1`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isSent
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-gray-800 text-gray-100 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isSent ? "text-blue-200" : "text-gray-500"
                          }`}
                        >
                          {formatMessageTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="h-20 border-t border-gray-800 flex items-center px-4 gap-3 flex-shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
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
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Panel - Milestones */}
        <div className="w-2/5 flex flex-col bg-gray-900/50">
          {/* Milestones Header */}
          <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
            <h2 className="font-bold">Milestones</h2>
            <span className="text-sm font-medium text-gray-400">
              {completedCount}/{totalCount} completed
            </span>
          </div>

          {/* Milestones List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {milestones.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No milestones set yet.
              </p>
            ) : (
              milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-4 rounded-lg border ${
                    milestone.status === "completed"
                      ? "border-green-800/30 bg-green-900/10"
                      : "border-gray-700 bg-gray-800/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            milestone.status === "completed"
                              ? "bg-green-600 text-white"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {milestone.status === "completed" ? "✓" : "○"}
                        </span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {milestone.blueprint_type}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{milestone.title}</p>
                      {milestone.due_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due:{" "}
                          {milestone.due_at.toDate?.()?.toLocaleDateString() ||
                            ""}
                        </p>
                      )}
                    </div>
                    {profile?.role === "startup" && (
                      <button
                        onClick={() => handleToggleMilestone(milestone)}
                        disabled={toggling === milestone.id}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                          milestone.status === "completed"
                            ? "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        } disabled:opacity-50`}
                      >
                        {toggling === milestone.id
                          ? "..."
                          : milestone.status === "completed"
                          ? "Revert"
                          : "Complete"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
