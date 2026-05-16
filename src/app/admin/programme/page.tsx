"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Programme, ProgrammeRegistration, UserProfile } from "@/lib/types";
import NavBar from "@/components/NavBar";

interface RegistrationWithUser extends ProgrammeRegistration {
  user?: UserProfile;
}

export default function ProgrammePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState(60);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [capacity, setCapacity] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
  const [startups, setStartups] = useState<UserProfile[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [processingReg, setProcessingReg] = useState<string | null>(null);

  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThreshold, setEditThreshold] = useState(60);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editRegistrationDeadline, setEditRegistrationDeadline] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editPrerequisites, setEditPrerequisites] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role !== "admin") router.push("/dashboard");
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
    if (!selectedProgramme) {
      setRegistrations([]);
      setStartups([]);
      return;
    }

    setLoadingRegistrations(true);

    const loadData = async () => {
      // Load registrations
      const regQuery = query(
        collection(db, "programme_registrations"),
        where("programme_id", "==", selectedProgramme.id)
      );
      const regSnapshot = await getDocs(regQuery);
      const regs: RegistrationWithUser[] = [];

      for (const d of regSnapshot.docs) {
        const regData = d.data();
        let user: UserProfile | undefined;

        const userDoc = await getDocs(
          query(collection(db, "users"), where("__name__", "==", regData.user_id))
        );
        if (!userDoc.empty) {
          user = {
            uid: regData.user_id,
            ...userDoc.docs[0].data(),
          } as UserProfile;
        }

        regs.push({
          id: d.id,
          programme_id: regData.programme_id,
          user_id: regData.user_id,
          role: regData.role,
          status: regData.status,
          created_at: regData.created_at,
          user,
        });
      }

      // Load startups
      const startupQuery = query(collection(db, "users"), where("role", "==", "startup"));
      const startupSnapshot = await getDocs(startupQuery);
      const allStartups = startupSnapshot.docs.map(
        (d) => ({ uid: d.id, ...d.data() } as UserProfile)
      );
      const qualifiedStartups = allStartups.filter(
        (s) => (s.quality_score || 0) >= selectedProgramme.match_threshold
      );

      // Update both states together
      setRegistrations(regs);
      setStartups(qualifiedStartups);
      setLoadingRegistrations(false);
    };

    loadData();
  }, [selectedProgramme]);

  const handleCreate = async () => {
    if (!user || !name) return;
    setCreating(true);
    await addDoc(collection(db, "programmes"), {
      name,
      description,
      status: "active",
      match_threshold: threshold,
      created_by: user.uid,
      created_at: Timestamp.now(),
      start_date: startDate ? Timestamp.fromDate(new Date(startDate)) : null,
      end_date: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
      venue: venue || null,
      registration_deadline: registrationDeadline
        ? Timestamp.fromDate(new Date(registrationDeadline))
        : null,
      capacity: capacity ? parseInt(capacity) : null,
      prerequisites: prerequisites || null,
      contact_email: contactEmail || null,
    });
    setName("");
    setDescription("");
    setThreshold(60);
    setStartDate("");
    setEndDate("");
    setVenue("");
    setRegistrationDeadline("");
    setCapacity("");
    setPrerequisites("");
    setContactEmail("");
    setShowCreate(false);
    setCreating(false);
  };

  const handleEdit = (prog: Programme) => {
    setEditingProgramme(prog);
    setEditName(prog.name);
    setEditDescription(prog.description);
    setEditThreshold(prog.match_threshold);
    setEditStartDate(prog.start_date?.toDate?.()?.toISOString().split("T")[0] || "");
    setEditEndDate(prog.end_date?.toDate?.()?.toISOString().split("T")[0] || "");
    setEditVenue(prog.venue || "");
    setEditRegistrationDeadline(
      prog.registration_deadline?.toDate?.()?.toISOString().split("T")[0] || ""
    );
    setEditCapacity(prog.capacity?.toString() || "");
    setEditPrerequisites(prog.prerequisites || "");
    setEditContactEmail(prog.contact_email || "");
  };

  const handleSaveEdit = async () => {
    if (!editingProgramme) return;
    setSaving(true);
    await updateDoc(doc(db, "programmes", editingProgramme.id), {
      name: editName,
      description: editDescription,
      match_threshold: editThreshold,
      start_date: editStartDate
        ? Timestamp.fromDate(new Date(editStartDate))
        : null,
      end_date: editEndDate
        ? Timestamp.fromDate(new Date(editEndDate))
        : null,
      venue: editVenue || null,
      registration_deadline: editRegistrationDeadline
        ? Timestamp.fromDate(new Date(editRegistrationDeadline))
        : null,
      capacity: editCapacity ? parseInt(editCapacity) : null,
      prerequisites: editPrerequisites || null,
      contact_email: editContactEmail || null,
    });
    setEditingProgramme(null);
    setSaving(false);
  };

  const handleDelete = async (progId: string) => {
    setDeleting(progId);
    try {
      await deleteDoc(doc(db, "programmes", progId));
      if (selectedProgramme?.id === progId) {
        setSelectedProgramme(null);
      }
    } catch (err) {
      console.error("Failed to delete programme:", err);
    }
    setDeleting(null);
  };

  const handleApproveRegistration = async (regId: string) => {
    setProcessingReg(regId);
    try {
      await updateDoc(doc(db, "programme_registrations", regId), {
        status: "approved",
      });
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === regId ? { ...r, status: "approved" } : r
        )
      );
    } catch (err) {
      console.error("Failed to approve:", err);
    }
    setProcessingReg(null);
  };

  const handleRejectRegistration = async (regId: string) => {
    setProcessingReg(regId);
    try {
      await updateDoc(doc(db, "programme_registrations", regId), {
        status: "rejected",
      });
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === regId ? { ...r, status: "rejected" } : r
        )
      );
    } catch (err) {
      console.error("Failed to reject:", err);
    }
    setProcessingReg(null);
  };

  const handleGenerateMatches = async () => {
    if (!selectedProgramme) return;
    setMatching(true);
    setMatchResult(null);

    try {
      const response = await fetch("/api/generate-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId: selectedProgramme.id }),
      });
      const data = await response.json();
      setMatchResult(`Generated ${data.matchCount} matches successfully!`);
    } catch {
      setMatchResult("Match generation triggered. Check the dashboard for results.");
    }
    setMatching(false);
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp?.toDate) return "TBD";
    return timestamp.toDate().toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Programmes</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Programme
          </button>
        </div>

        {showCreate && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 space-y-4">
            <h2 className="font-medium">Create Programme</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Programme name *"
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue"
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Registration Deadline
                </label>
                <input
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Max participants"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Quality Threshold: {threshold}/100
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Prerequisites
              </label>
              <textarea
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                placeholder="Any prerequisites or requirements..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !name}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? "Creating..." : "Create Programme"}
            </button>
          </div>
        )}

        {editingProgramme && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto p-6 space-y-4">
              <h2 className="font-bold text-lg">Edit Programme</h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Programme name"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  placeholder="Venue"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    value={editRegistrationDeadline}
                    onChange={(e) =>
                      setEditRegistrationDeadline(e.target.value)
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    placeholder="Max participants"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Quality Threshold: {editThreshold}/100
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Prerequisites
                </label>
                <textarea
                  value={editPrerequisites}
                  onChange={(e) => setEditPrerequisites(e.target.value)}
                  placeholder="Any prerequisites or requirements..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingProgramme(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editName}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {programmes.map((prog) => (
            <div key={prog.id} className="space-y-3">
              <div
                className={`bg-gray-900 border rounded-lg p-5 cursor-pointer transition-colors ${
                  selectedProgramme?.id === prog.id
                    ? "border-blue-500"
                    : "border-gray-800 hover:border-gray-600"
                }`}
                onClick={() =>
                  setSelectedProgramme(
                    selectedProgramme?.id === prog.id ? null : prog
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{prog.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {prog.description}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span>Start: {formatDate(prog.start_date)}</span>
                      {prog.venue && <span>📍 {prog.venue}</span>}
                      <span>Threshold: {prog.match_threshold}/100</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        prog.status === "active"
                          ? "bg-green-900/50 text-green-300"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {prog.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-500">
                    Deadline: {formatDate(prog.registration_deadline)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(prog);
                      }}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(prog.id);
                      }}
                      disabled={deleting === prog.id}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {deleting === prog.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>

              {selectedProgramme?.id === prog.id && (
                <div className="ml-4 pl-4 border-l-2 border-blue-500/30 space-y-6">
                  {/* Registered Users */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-300">
                        Registered Users ({registrations.length})
                      </h3>
                      <button
                        onClick={handleGenerateMatches}
                        disabled={matching}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        {matching ? "Generating..." : "🤖 Generate Matches"}
                      </button>
                    </div>

                    {matchResult && (
                      <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-3 text-sm text-purple-300 mb-3">
                        {matchResult}
                      </div>
                    )}

                    {loadingRegistrations ? (
                      <p className="text-gray-500 text-sm py-4 animate-pulse">
                        Loading registrations...
                      </p>
                    ) : registrations.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4">
                        No registrations yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                          >
                            <button
                              onClick={() =>
                                router.push(`/view/${reg.user_id}`)
                              }
                              className="text-left hover:opacity-80 transition-opacity"
                            >
                              <p className="text-sm font-medium">
                                {reg.user?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {reg.role === "startup"
                                  ? "Startup"
                                  : "Mentor"}{" "}
                                · {reg.user?.industry}
                                {reg.user?.quality_score !== undefined &&
                                  ` · Score: ${reg.user.quality_score}`}
                              </p>
                            </button>
                            <div className="flex items-center gap-2">
                              {reg.status === "pending" ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleRejectRegistration(reg.id)
                                    }
                                    disabled={processingReg === reg.id}
                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleApproveRegistration(reg.id)
                                    }
                                    disabled={processingReg === reg.id}
                                    className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                  >
                                    {processingReg === reg.id
                                      ? "..."
                                      : "Approve"}
                                  </button>
                                </>
                              ) : (
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    reg.status === "approved"
                                      ? "bg-green-900/50 text-green-300"
                                      : "bg-red-900/50 text-red-300"
                                  }`}
                                >
                                  {reg.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Qualified Startups (for reference) */}
                  <div>
                    <h3 className="font-medium text-gray-300 mb-3">
                      Qualified Startups ({startups.length})
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Startups meeting quality threshold (for reference)
                    </p>
                    <div className="grid gap-2">
                      {loadingRegistrations ? (
                        <p className="text-gray-500 text-sm py-4 animate-pulse">
                          Loading startups...
                        </p>
                      ) : startups.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4">
                          No qualified startups above threshold.
                        </p>
                      ) : (
                        startups.map((startup) => (
                          <div
                            key={startup.uid}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                          >
                            <button
                              onClick={() =>
                                router.push(`/view/${startup.uid}`)
                              }
                              className="text-left hover:opacity-80 transition-opacity"
                            >
                              <p className="text-sm font-medium">
                                {startup.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {startup.industry} ·{" "}
                                {startup.tags?.stage || "Unknown stage"}
                              </p>
                            </button>
                            <div className="text-right">
                              <p className="text-sm font-bold text-blue-400">
                                {startup.quality_score || 0}
                              </p>
                              <p className="text-xs text-gray-500">score</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
