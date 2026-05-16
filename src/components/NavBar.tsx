"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { profile, logout } = useAuth();
  const pathname = usePathname();

  if (!profile) return null;

  const isAdmin = profile.role === "admin";

  const links = isAdmin
    ? [
        { href: "/admin/dashboard", label: "Ecosystem" },
        { href: "/admin/programme", label: "Programmes" },
      ]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/matches", label: "Matches" },
        { href: "/profile", label: "Profile" },
        { href: "/qr", label: "QR Badge" },
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

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:block">
            {profile.role === "startup" ? "🚀" : profile.role === "mentor" ? "🎯" : "📊"}{" "}
            {profile.name}
          </span>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
