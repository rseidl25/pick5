// picks_firebase.js

import { app } from "./firebase_init.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Manual submit — only saves *complete* weeks, shows alert.
 * Saves to nested structure: picks > uid > weekN > picks
 */
export async function saveAllUserPicks(weekStatuses) {
  const user = auth.currentUser;
  if (!user) {
    alert("⚠️ You must be logged in to save picks.");
    return;
  }

  const uid = user.uid;

  try {
    const promises = [];

    for (let week = 1; week <= 18; week++) {
      const state = weekStatuses[week];
      if (!state || state.picks.length < 5 || !state.bonus) {
        console.warn(`Skipping Week ${week} (not complete)`);
        continue;
      }

      const teamsPicked = state.picks.map(p => ({
        team: p.team,
        matchup: p.matchup || `week${week}`  // ✅ ensure matchup is saved properly
      }));

      // ✅ Nested structure: picks/{uid}/weekN/picks
      const weekDocRef = doc(db, "picks", uid, `week${week}`, "picks");
      promises.push(
        setDoc(weekDocRef, {
          userId: uid,
          week,
          teamsPicked,
          bonusPick: state.bonus,
          updatedAt: new Date()
        }, { merge: true })
      );
    }

    await Promise.all(promises);

    console.log("✅ All picks saved successfully (nested structure)!");
    alert("✅ Your picks have been submitted!");
  } catch (err) {
    console.error("❌ Error saving picks:", err);
    alert("Error saving picks: " + err.message);
  }
}

/**
 * Save a single week silently (autosave).
 * Saves to: picks/{uid}/weekN/picks
 */
export async function autosaveUserPicks(week, state) {
  const user = auth.currentUser;
  if (!user) return;

  const uid = user.uid;
  try {
    const teamsPicked = state.picks.map(p => ({
      team: p.team,
      matchup: p.matchup || `week${week}`  // ✅ ensure matchupKey is included
    }));

    const weekDocRef = doc(db, "picks", uid, `week${week}`, "picks");

    await setDoc(weekDocRef, {
      userId: uid,
      week,
      teamsPicked,
      bonusPick: state.bonus || null,
      updatedAt: new Date()
    }, { merge: true });

    console.log(`💾 Autosaved Week ${week} for ${uid}`);
  } catch (err) {
    console.error("❌ Autosave error:", err);
  }
}

/**
 * Load all picks for current user from nested structure.
 * Reads: picks/{uid}/weekN/picks
 */
export async function loadUserPicksFromFirestore() {
  const user = auth.currentUser;
  if (!user) return {};

  const uid = user.uid;

  try {
    const weekStatuses = {};

    // Fetch all weeks in parallel
    const promises = [];
    for (let week = 1; week <= 18; week++) {
      const weekDocRef = doc(db, "picks", uid, `week${week}`, "picks");
      promises.push(getDoc(weekDocRef).then(snap => ({ week, snap })));
    }

    const results = await Promise.all(promises);

    results.forEach(({ week, snap }) => {
      if (snap.exists()) {
        const data = snap.data();
        const { teamsPicked, bonusPick } = data;

        weekStatuses[week] = {
          picks: teamsPicked.map(p => ({
            team: p.team,
            matchup: p.matchup || `week${week}`  // ✅ preserve matchup
          })),
          bonus: bonusPick || null
        };
      }
    });

    console.log("📥 Loaded picks from Firestore for", uid, weekStatuses);
    return weekStatuses;
  } catch (err) {
    console.error("❌ Error loading picks:", err);
    return {};
  }
}
