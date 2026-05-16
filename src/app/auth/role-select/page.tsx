"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/lib/types";

const roles: { role: UserRole; title: string; description: string; icon: string }[] = [
  {
    role: "startup",
    title: "Startup",
    description: "Upload your pitch deck, get matched with mentors, and track your growth milestones.",
    icon: "🚀",
  },
  {
    role: "mentor",
    title: "Mentor",
    description: "Share your expertise, get matched with high-potential startups, and guide their journey.",
    icon: "🎯",
  },
  {
    role: "admin",
    title: "Programme Manager",
    description: "Create programmes, trigger AI matching, and monitor ecosystem health.",
    icon: "📊",
  },
];

export default function RoleSelectPage() {
  const { user, profile, loading, setUserRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (!loading && profile) {
      router.push("/dashboard");
    }
  }, [user, profile, loading, router]);

  const handleRoleSelect = async (role: UserRole) => {
    await setUserRole(role);
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/profile");
    }
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to NEXUS</h1>
          <p className="text-gray-400">Select your role to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map(({ role, title, description, icon }) => (
            <button
              key={role}
              onClick={() => handleRoleSelect(role)}
              className="flex flex-col items-center text-center p-6 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-gray-900 transition-all space-y-3"
            >
              <span className="text-4xl">{icon}</span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-400">{description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
