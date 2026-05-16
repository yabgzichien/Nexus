"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, Message, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

interface ChatPreview {
  relationship: Relationship;
  otherUser: UserProfile;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function ChatListPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<
    { relationship: Relationship; user: UserProfile }[]
  >([]);
  const userCache = useRef<Map<string, UserProfile>>(new Map());
  const messagesRef = useRef<Map<string, Message[]>>(new Map());

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !profile) return;

    const unsubRelationships = onSnapshot(
      collection(db, "relationships"),
      async (snapshot) => {
        const rels = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Relationship)
        );

        const uncachedUserIds: string[] = [];
        for (const rel of rels) {
          const otherId =
            profile.role === "startup" ? rel.mentor_id : rel.startup_id;
          if (!userCache.current.has(otherId)) {
            uncachedUserIds.push(otherId);
          }
        }

        if (uncachedUserIds.length > 0) {
          const userDocs = await Promise.all(
            uncachedUserIds.map((id) => getDoc(doc(db, "users", id)))
          );
          userDocs.forEach((docSnap, i) => {
            if (docSnap.exists()) {
              userCache.current.set(uncachedUserIds[i], {
                uid: uncachedUserIds[i],
                ...docSnap.data(),
              } as UserProfile);
            }
          });
        }

        const chatPreviews: ChatPreview[] = rels.map((rel) => {
          const otherId =
            profile.role === "startup" ? rel.mentor_id : rel.startup_id;
          const otherUser = userCache.current.get(otherId) || {
            uid: otherId,
            name: "Unknown",
            role: profile.role === "startup" ? "mentor" : "startup",
            email: "",
            bio: "",
            industry: "",
          } as UserProfile;

          const messages = messagesRef.current.get(rel.id) || [];
          const lastMessage =
            messages.length > 0
              ? messages.reduce((latest, m) =>
                  (m.timestamp?.toMillis?.() || 0) > (latest.timestamp?.toMillis?.() || 0)
                    ? m
                    : latest
                )
              : null;
          const unreadCount = messages.filter(
            (m) => !m.read && m.sender_id !== user.uid
          ).length;

          return {
            relationship: rel,
            otherUser,
            lastMessage,
            unreadCount,
          };
        });

        chatPreviews.sort((a, b) => {
          const aTime = a.lastMessage?.timestamp?.toMillis?.() || 0;
          const bTime = b.lastMessage?.timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setChats(chatPreviews);
      }
    );

    const unsubMessages = onSnapshot(
      collection(db, "messages"),
      (snapshot) => {
        const byRelationship = new Map<string, Message[]>();
        snapshot.docs.forEach((d) => {
          const msg = { id: d.id, ...d.data() } as Message;
          const arr = byRelationship.get(msg.relationship_id) || [];
          arr.push(msg);
          byRelationship.set(msg.relationship_id, arr);
        });
        messagesRef.current = byRelationship;

        setChats((prev) => {
          const updated = prev.map((chat) => {
            const messages = byRelationship.get(chat.relationship.id) || [];
            const lastMessage =
              messages.length > 0
                ? messages.reduce((latest, m) =>
                    (m.timestamp?.toMillis?.() || 0) > (latest.timestamp?.toMillis?.() || 0)
                      ? m
                      : latest
                  )
                : null;
            const unreadCount = messages.filter(
              (m) => !m.read && m.sender_id !== user.uid
            ).length;
            return { ...chat, lastMessage, unreadCount };
          });
          updated.sort((a, b) => {
            const aTime = a.lastMessage?.timestamp?.toMillis?.() || 0;
            const bTime = b.lastMessage?.timestamp?.toMillis?.() || 0;
            return bTime - aTime;
          });
          return updated;
        });
      }
    );

    return () => {
      unsubRelationships();
      unsubMessages();
    };
  }, [user, profile]);

  const loadAvailableContacts = async () => {
    if (!user || !profile) return;

    const contacts: { relationship: Relationship; user: UserProfile }[] = [];
    for (const chat of chats) {
      contacts.push({
        relationship: chat.relationship,
        user: chat.otherUser,
      });
    }

    setAvailableContacts(contacts);
    setShowNewChat(true);
  };

  const formatTime = (timestamp: Message["timestamp"]) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Chats</h1>
          <button
            onClick={loadAvailableContacts}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-xl font-bold transition-colors"
          >
            +
          </button>
        </div>

        {showNewChat && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="font-bold">Start New Chat</h2>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                {availableContacts.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm">
                    No relationships found. Ask your programme manager to create
                    matches.
                  </p>
                ) : (
                  availableContacts.map((contact) => (
                    <button
                      key={contact.relationship.id}
                      onClick={() => {
                        setShowNewChat(false);
                        router.push(`/chat/${contact.relationship.id}`);
                      }}
                      className="w-full text-left p-4 hover:bg-gray-800 transition-colors border-b border-gray-800"
                    >
                      <p className="font-medium">{contact.user.name}</p>
                      <p className="text-sm text-gray-400">
                        {contact.user.role === "mentor" ? "Mentor" : "Startup"}{" "}
                        · {contact.user.industry}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {chats.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No conversations yet.</p>
            <p className="text-sm mt-2">
              Tap + to start a chat with your matched mentor or startup.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.relationship.id}
                onClick={() => router.push(`/chat/${chat.relationship.id}`)}
                className="w-full text-left p-4 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {chat.otherUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">
                      {chat.otherUser.name}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {chat.lastMessage
                        ? formatTime(chat.lastMessage.timestamp)
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {chat.lastMessage
                      ? chat.lastMessage.text
                      : "No messages yet"}
                  </p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs flex-shrink-0">
                    {chat.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
