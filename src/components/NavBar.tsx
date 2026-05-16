"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { profile } = useAuth();
  const pathname = usePathname();

  if (!profile) return null;

  const isAdmin = profile.role === "admin";

  const links = isAdmin
    ? [
        { href: "/admin/dashboard", label: "Ecosystem" },
        { href: "/admin/programme", label: "Programmes" },
      ]
    : [
        { href: "/chat", label: "Chat" },
        { href: "/matches", label: "Explore" },
        { href: "/programmes", label: "Programmes" },
      ];

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            NEX<span className="text-blue-400">US</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === href
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <Link
            href="/account"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {profile.role === "startup"
              ? "🚀"
              : profile.role === "mentor"
              ? "🎯"
              : "📊"}{" "}
            {profile.name}
          </Link>
        </div>
      </div>
    </nav>
  );
}
