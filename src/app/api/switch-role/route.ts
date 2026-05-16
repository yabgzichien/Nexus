import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { DEMO_SEEDS } from "@/lib/demo-seeds";

export async function POST(request: Request) {
  const { uid, targetRole } = await request.json();

  if (!uid || !targetRole) {
    return NextResponse.json(
      { error: "uid and targetRole required" },
      { status: 400 }
    );
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentProfile = userSnap.data();
  const currentRole = currentProfile?.role;

  // Save current profile to saved_profiles subcollection
  if (currentRole) {
    await userRef.collection("saved_profiles").doc(currentRole).set(currentProfile);
  }

  // Check for saved profile for target role
  const savedSnap = await userRef.collection("saved_profiles").doc(targetRole).get();

  let newProfile;
  if (savedSnap.exists) {
    newProfile = savedSnap.data();
  } else {
    newProfile = DEMO_SEEDS[targetRole];
  }

  // Write the new profile to the user document
  await userRef.set({ ...newProfile, role: targetRole }, { merge: true });

  return NextResponse.json({
    success: true,
    profile: { ...newProfile, uid, role: targetRole },
  });
}
