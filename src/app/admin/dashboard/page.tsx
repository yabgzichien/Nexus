"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Relationship, UserProfile, Programme } from "@/lib/types";
import NavBar from "@/components/NavBar";
import cytoscape from "cytoscape";

interface RelationshipWithProfiles extends Relationship {
  mentorProfile?: UserProfile;
  startupProfile?: UserProfile;
}

export default function AdminDashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [relationships, setRelationships] = useState<RelationshipWithProfiles[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipWithProfiles | null>(null);
  const [selectedNodeProfile, setSelectedNodeProfile] = useState<UserProfile | null>(null);
  const [atRisk, setAtRisk] = useState<RelationshipWithProfiles[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && profile?.role !== "admin") router.push("/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    // Show all programmes for demo — seeded data uses hardcoded created_by IDs
    const q = query(collection(db, "programmes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Programme));
      setProgrammes(progs);
      if (progs.length > 0 && !selectedProgramme) {
        setSelectedProgramme(progs[0].id);
      }
    });
    return () => unsubscribe();
  }, [user, selectedProgramme]);

  useEffect(() => {
    if (!selectedProgramme) return;

    // Clear previous data
    setRelationships([]);
    setAtRisk([]);
    setSelectedRelationship(null);
    setSelectedNodeProfile(null);
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const q = query(collection(db, "relationships"), where("programme_id", "==", selectedProgramme));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rels = await Promise.all(
        snapshot.docs.map(async (relDoc) => {
          const rel = { id: relDoc.id, ...relDoc.data() } as Relationship;
          const [mentorDoc, startupDoc] = await Promise.all([
            getDoc(doc(db, "users", rel.mentor_id)),
            getDoc(doc(db, "users", rel.startup_id)),
          ]);
          return {
            ...rel,
            mentorProfile: mentorDoc.exists() ? { uid: rel.mentor_id, ...mentorDoc.data() } as UserProfile : undefined,
            startupProfile: startupDoc.exists() ? { uid: rel.startup_id, ...startupDoc.data() } as UserProfile : undefined,
          };
        })
      );
      setRelationships(rels);
      setAtRisk(rels.filter((r) => r.health_trend === "decaying"));
    });

    return () => unsubscribe();
  }, [selectedProgramme]);

  const initGraph = useCallback(() => {
    if (!graphRef.current || relationships.length === 0) return;

    if (cyRef.current) cyRef.current.destroy();

    const nodes: cytoscape.ElementDefinition[] = [];
    const edges: cytoscape.ElementDefinition[] = [];
    const addedNodes = new Set<string>();

    relationships.forEach((rel) => {
      if (!addedNodes.has(rel.mentor_id)) {
        nodes.push({
          data: {
            id: rel.mentor_id,
            label: rel.mentorProfile?.name || "Mentor",
            type: "mentor",
          },
        });
        addedNodes.add(rel.mentor_id);
      }
      if (!addedNodes.has(rel.startup_id)) {
        nodes.push({
          data: {
            id: rel.startup_id,
            label: rel.startupProfile?.name || "Startup",
            type: "startup",
          },
        });
        addedNodes.add(rel.startup_id);
      }
      edges.push({
        data: {
          id: rel.id,
          source: rel.mentor_id,
          target: rel.startup_id,
          health: rel.health_score,
          weight: rel.edge_weight,
        },
      });
    });

    const cy = cytoscape({
      container: graphRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node[type='mentor']",
          style: {
            "background-color": "#3B82F6",
            label: "data(label)",
            color: "#fff",
            "font-size": "10px",
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: 40,
            height: 40,
          },
        },
        {
          selector: "node[type='startup']",
          style: {
            "background-color": "#10B981",
            label: "data(label)",
            color: "#fff",
            "font-size": "10px",
            "text-valign": "bottom",
            "text-margin-y": 8,
            width: 35,
            height: 35,
          },
        },
        {
          selector: "edge",
          style: {
            width: 3,
            "line-color": (ele: cytoscape.EdgeSingular) => {
              const health = ele.data("health") as number;
              if (health >= 70) return "#10B981";
              if (health >= 40) return "#F59E0B";
              return "#EF4444";
            },
            "curve-style": "bezier",
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 5,
            "line-color": "#60A5FA",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 150,
      },
    });

    cy.on("tap", "node", (evt) => {
      const nodeId = evt.target.data("id");
      let profile: UserProfile | undefined;
      for (const rel of relationships) {
        if (rel.mentor_id === nodeId) {
          profile = rel.mentorProfile;
          break;
        } else if (rel.startup_id === nodeId) {
          profile = rel.startupProfile;
          break;
        }
      }
      if (profile) {
        setSelectedNodeProfile(profile);
        setSelectedRelationship(null);
      }
    });

    cy.on("tap", "edge", (evt) => {
      const edgeId = evt.target.data("id");
      const rel = relationships.find((r) => r.id === edgeId);
      if (rel) {
        setSelectedRelationship(rel);
        setSelectedNodeProfile(null);
      }
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedRelationship(null);
        setSelectedNodeProfile(null);
      }
    });

    cyRef.current = cy;
  }, [relationships]);

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Ecosystem Dashboard</h1>
          <select
            value={selectedProgramme}
            onChange={(e) => setSelectedProgramme(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Graph */}
          <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden relative">
            <div ref={graphRef} className="w-full h-[500px]" />
            {relationships.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                <div className="text-center space-y-3">
                  <div className="text-4xl">📊</div>
                  <p className="text-gray-400 font-medium">
                    No relationships in this programme yet
                  </p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Run &ldquo;Generate Matches&rdquo; in the Programmes page to create mentor-startup relationships.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Selected Detail */}
            {selectedNodeProfile ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
                    {selectedNodeProfile.role === "startup" ? "🚀" : "🎯"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{selectedNodeProfile.name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{selectedNodeProfile.role} • {selectedNodeProfile.industry}</p>
                  </div>
                </div>

                {selectedNodeProfile.description && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-300">{selectedNodeProfile.description}</p>
                  </div>
                )}

                {selectedNodeProfile.role === "mentor" && selectedNodeProfile.expertise_areas && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Expertise Areas</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedNodeProfile.expertise_areas.map((area) => (
                        <span key={area} className="bg-blue-900/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNodeProfile.role === "startup" && selectedNodeProfile.quality_score !== undefined && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Quality Score</p>
                    <p className="text-lg font-bold text-blue-400">{selectedNodeProfile.quality_score} <span className="text-xs text-gray-500 font-normal">/ 100</span></p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => router.push(`/view/${selectedNodeProfile.uid}`)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded py-2 text-sm font-medium transition-colors"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            ) : selectedRelationship ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-sm text-gray-400">Relationship Detail</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-blue-400">{selectedRelationship.mentorProfile?.name}</span>
                    {" → "}
                    <span className="text-green-400">{selectedRelationship.startupProfile?.name}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${
                      selectedRelationship.health_score >= 70 ? "text-green-400" :
                      selectedRelationship.health_score >= 40 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {selectedRelationship.health_score}
                    </span>
                    <span className="text-xs text-gray-500">/ 100</span>
                    <span className={`text-xs ${
                      selectedRelationship.health_trend === "improving" ? "text-green-400" :
                      selectedRelationship.health_trend === "decaying" ? "text-red-400" : "text-gray-400"
                    }`}>
                      {selectedRelationship.health_trend === "improving" ? "↑" :
                       selectedRelationship.health_trend === "decaying" ? "↓" : "→"}
                      {" "}{selectedRelationship.health_trend}
                    </span>
                  </div>
                </div>

                {selectedRelationship.health_narration && (
                  <div className="bg-gray-800/50 rounded p-3">
                    <p className="text-xs text-gray-300 italic">
                      {selectedRelationship.health_narration}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">— Gemini Health Analysis</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Match score: {selectedRelationship.edge_weight}%</p>
                  <p>Milestones: {selectedRelationship.milestones_completed}/{selectedRelationship.milestones_total}</p>
                  <p>Messages: {selectedRelationship.platform_messages_sent}</p>
                </div>

                {selectedRelationship.match_narrative && (
                  <div className="border-t border-gray-800 pt-3">
                    <p className="text-xs text-gray-400 mb-1">Match Reasoning:</p>
                    <p className="text-xs text-gray-300">{selectedRelationship.match_narrative}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center text-sm text-gray-500">
                Click an edge to view relationship details
              </div>
            )}

            {/* At-Risk Panel */}
            <div className="bg-gray-900 border border-red-900/30 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm text-red-400">
                ⚠ At Risk ({atRisk.length})
              </h3>
              {atRisk.length === 0 ? (
                <p className="text-xs text-gray-500">No decaying relationships.</p>
              ) : (
                <div className="space-y-2">
                  {atRisk.map((rel) => (
                    <button
                      key={rel.id}
                      onClick={() => setSelectedRelationship(rel)}
                      className="w-full text-left bg-gray-800/50 rounded p-2 hover:bg-gray-800 transition-colors"
                    >
                      <p className="text-xs font-medium">
                        {rel.mentorProfile?.name} → {rel.startupProfile?.name}
                      </p>
                      <p className="text-xs text-red-400">
                        Health: {rel.health_score} ↓
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
