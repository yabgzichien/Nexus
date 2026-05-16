"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Programme, ProgrammeRegistration } from "@/lib/types";
import NavBar from "@/components/NavBar";

export default function ProgrammesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<ProgrammeRegistration[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role === "admin") router.push("/admin/programme");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "programmes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProgrammes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Programme)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "programme_registrations"),
      where("user_id", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistrations(
        snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ProgrammeRegistration)
        )
      );
    });
    return () => unsubscribe();
  }, [user]);

  const handleRegister = async (programmeId: string) => {
    if (!user || !profile) return;
    setRegistering(programmeId);

    try {
      await addDoc(collection(db, "programme_registrations"), {
        programme_id: programmeId,
        user_id: user.uid,
        role: profile.role,
        status: "pending",
        created_at: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to register:", err);
    }

    setRegistering(null);
  };

  const getRegistration = (
    programmeId: string
  ): ProgrammeRegistration | undefined => {
    return registrations.find((r) => r.programme_id === programmeId);
  };

  const isEligible = (prog: Programme): boolean => {
    if (!profile) return false;
    if (profile.role === "mentor") return true;
    return (profile.quality_score || 0) >= prog.match_threshold;
  };

  const registeredProgrammeIds = new Set(
    registrations.map((r) => r.programme_id)
  );

  const availableProgrammes = programmes.filter(
    (p) => !registeredProgrammeIds.has(p.id) && isEligible(p)
  );
  const notEligibleProgrammes = programmes.filter(
    (p) => !registeredProgrammeIds.has(p.id) && !isEligible(p)
  );
  const registeredProgrammes = programmes.filter((p) =>
    registeredProgrammeIds.has(p.id)
  );

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp?.toDate) return "TBD";
    return timestamp.toDate().toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp?: Timestamp) => {
    if (!timestamp?.toDate) return "TBD";
    return timestamp.toDate().toLocaleString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Programmes</h1>

        {/* Available Programmes */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">
            Available Programmes
          </h2>
          {availableProgrammes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No available programmes at the moment.
            </p>
          ) : (
            <div className="space-y-3">
              {availableProgrammes.map((prog) => (
                <ProgrammeCard
                  key={prog.id}
                  programme={prog}
                  registration={getRegistration(prog.id)}
                  onRegister={handleRegister}
                  registering={registering === prog.id}
                  onViewDetails={setSelectedProgramme}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Not Eligible (Startups only) */}
        {profile.role === "startup" && notEligibleProgrammes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">
              Not Eligible
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              These programmes require a higher quality score than your current
              score ({profile.quality_score || 0}/100).
            </p>
            <div className="space-y-3">
              {notEligibleProgrammes.map((prog) => (
                <div
                  key={prog.id}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 opacity-70"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-400">
                        {prog.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Requires quality score: {prog.match_threshold}/100
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedProgramme(prog)}
                      className="text-xs text-gray-500 hover:text-gray-400"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registered Programmes */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-300">
            Registered Programmes
          </h2>
          {registeredProgrammes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              You haven&apos;t registered for any programmes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {registeredProgrammes.map((prog) => {
                const reg = getRegistration(prog.id);
                return (
                  <ProgrammeCard
                    key={prog.id}
                    programme={prog}
                    registration={reg}
                    onRegister={handleRegister}
                    registering={registering === prog.id}
                    onViewDetails={setSelectedProgramme}
                    formatDate={formatDate}
                    isRegistered
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Programme Detail Modal */}
        {selectedProgramme && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="font-bold text-lg">
                  {selectedProgramme.name}
                </h2>
                <button
                  onClick={() => setSelectedProgramme(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-gray-300">
                  {selectedProgramme.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Start Date</p>
                    <p>{formatDateTime(selectedProgramme.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Date</p>
                    <p>{formatDateTime(selectedProgramme.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Venue</p>
                    <p>{selectedProgramme.venue || "TBD"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Registration Deadline</p>
                    <p>
                      {formatDateTime(
                        selectedProgramme.registration_deadline
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Capacity</p>
                    <p>{selectedProgramme.capacity || "Unlimited"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quality Threshold</p>
                    <p>{selectedProgramme.match_threshold}/100</p>
                  </div>
                </div>

                {selectedProgramme.prerequisites && (
                  <div>
                    <p className="text-gray-500 text-sm">Prerequisites</p>
                    <p className="text-gray-300 text-sm">
                      {selectedProgramme.prerequisites}
                    </p>
                  </div>
                )}

                {selectedProgramme.contact_email && (
                  <div>
                    <p className="text-gray-500 text-sm">Contact</p>
                    <p className="text-blue-400 text-sm">
                      {selectedProgramme.contact_email}
                    </p>
                  </div>
                )}

                {profile.role === "startup" &&
                  !isEligible(selectedProgramme) && (
                    <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 text-sm text-red-300">
                      Your quality score ({profile.quality_score || 0}/100)
                      does not meet the requirement (
                      {selectedProgramme.match_threshold}/100).
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgrammeCard({
  programme,
  registration,
  onRegister,
  registering,
  onViewDetails,
  formatDate,
  isRegistered,
}: {
  programme: Programme;
  registration?: ProgrammeRegistration;
  onRegister: (id: string) => void;
  registering: boolean;
  onViewDetails: (prog: Programme) => void;
  formatDate: (ts?: Timestamp) => string;
  isRegistered?: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-900/50 text-yellow-300",
    approved: "bg-green-900/50 text-green-300",
    rejected: "bg-red-900/50 text-red-300",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium">{programme.name}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {programme.description}
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span>Start: {formatDate(programme.start_date)}</span>
            {programme.venue && <span>📍 {programme.venue}</span>}
          </div>
        </div>
        {isRegistered && registration && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              statusColors[registration.status] || "bg-gray-800 text-gray-400"
            }`}
          >
            {registration.status}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => onViewDetails(programme)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          View Details
        </button>
        {!isRegistered && (
          <button
            onClick={() => onRegister(programme.id)}
            disabled={registering}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded text-xs font-medium transition-colors"
          >
            {registering ? "..." : "Register"}
          </button>
        )}
      </div>
    </div>
  );
}
