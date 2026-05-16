"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/dashboard");
    if (!loading && profile && profile.role !== "admin") router.push("/chat");
  }, [user, profile, loading, router]);

  return null;
}
