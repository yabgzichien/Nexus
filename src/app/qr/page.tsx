"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import NavBar from "@/components/NavBar";

export default function QRPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scannedProfile, setScannedProfile] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false);

    scanner.render(
      (decodedText) => {
        setScannedProfile(decodedText);
        setScanning(false);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanning]);

  if (loading || !profile || !user) return null;

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/view/${user.uid}`
    : "";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">QR Badge</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center space-y-4">
            <h2 className="font-medium text-gray-300">My Badge</h2>
            <div className="inline-block bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={profileUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-gray-500">
              Show this at events for instant profile discovery
            </p>
            <div className="text-xs text-gray-600 break-all">{profileUrl}</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center space-y-4">
            <h2 className="font-medium text-gray-300">Scan a Badge</h2>

            {!scanning && !scannedProfile && (
              <button
                onClick={() => setScanning(true)}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Open Scanner
              </button>
            )}

            {scanning && (
              <div>
                <div id="qr-reader" className="rounded-lg overflow-hidden" />
                <button
                  onClick={() => setScanning(false)}
                  className="mt-4 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}

            {scannedProfile && (
              <div className="space-y-3">
                <p className="text-green-400">Badge scanned!</p>
                <a
                  href={scannedProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  View Profile →
                </a>
                <button
                  onClick={() => {
                    setScannedProfile(null);
                    setScanning(false);
                  }}
                  className="block mx-auto text-sm text-gray-400 hover:text-white"
                >
                  Scan Another
                </button>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Scan another participant&apos;s badge to view their profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
