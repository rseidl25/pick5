// src/js/util/update_all.js
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

// ✅ Prefer GitHub Actions secret if available
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("🔐 Using FIREBASE_SERVICE_ACCOUNT from environment");
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // ✅ Fallback: read from local file just outside repo root
  const localKeyPath = path.resolve(__dirname, "../../../../serviceAccountKey.json");
  console.log(`📂 Using local service account: ${localKeyPath}`);
  serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, "utf8"));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, scriptName);

    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error running ${scriptName}:`, error);
        reject(error);
      } else {
        console.log(`✅ Finished ${scriptName}`);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      }
    });
  });
}

// ✅ regenerate avatars.json
async function regenerateAvatars() {
  console.log("🖼️ Regenerating avatars.json from Firestore...");

  const snapshot = await db.collection("users").get();
  const avatars = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    avatars[doc.id] = {
      displayName: data.displayName || "Unknown",
      photoURL: data.photoURL || "icons/default_avatar.png",
    };
  });

  const outputPath = path.resolve(__dirname, "../../data/player/avatars.json");
  fs.writeFileSync(outputPath, JSON.stringify(avatars, null, 2));

  console.log(`✅ Wrote ${Object.keys(avatars).length} avatars → ${outputPath}`);
}

async function main() {
  try {
    console.log("🚀 Starting update_all...");

    await runScript("fetch_game_data.js");
    await runScript("calculate_scores.js");

    await regenerateAvatars();

    console.log("🎉 All scripts completed!");
  } catch (err) {
    console.error("❌ update_all failed:", err);
    process.exit(1);
  }
}

main();
