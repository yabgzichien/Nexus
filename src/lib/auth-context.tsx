"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import { UserProfile, UserRole } from "./types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const setUserRole = async (role: UserRole) => {
    if (!user) return;
    const profileData: Omit<UserProfile, "uid"> = {
      role,
      name: user.displayName || "",
      email: user.email || "",
      description: "",
      industry: "",
      created_at: Timestamp.now(),
    };
    await setDoc(doc(db, "users", user.uid), profileData);
    setProfile({ uid: user.uid, ...profileData });
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, logout, setUserRole, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
