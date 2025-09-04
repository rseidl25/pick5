// src/js/util/grab_picks.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import { app } from "../auth/firebase_init_node.js";

// Fix dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path to write JSON
const outputPath = path.resolve(__dirname, "../../data/player/picks.json");

async function grabPicks() {
  const db = getFirestore(app);
  const usersSnap = await getDocs(collection(db, "users"));

  const allPicks = {};

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (!data.picks_submitted) continue;

    const uid = userDoc.id;
    const displayName = data.displayName || "Unknown";

    allPicks[uid] = {
      name: displayName,
      weeks: {}
    };

    for (let i = 1; i <= 18; i++) {
      const weekRef = doc(db, "picks", uid, "weeks", `week${i}`);
      const weekSnap = await getDoc(weekRef);

      if (weekSnap.exists()) {
        const weekData = weekSnap.data();
        allPicks[uid].weeks[`week${i}`] = {
          picks: weekData.teamsPicked || [],
          bonus: weekData.bonusPick || null,
        };
      } else {
        // Pre-fill empty week
        allPicks[uid].weeks[`week${i}`] = {
          picks: [],
          bonus: null,
        };
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(allPicks, null, 2));
  console.log("✅ Picks written to", outputPath);
}

grabPicks().catch((err) => {
  console.error("❌ Error grabbing picks:", err);
});
