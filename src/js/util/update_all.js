import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath}`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error running ${scriptPath}:`, error);
        reject(error);
      } else {
        console.log(`✅ Finished ${scriptPath}`);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      }
    });
  });
}

async function main() {
  try {
    console.log("🚀 Starting update_all...");
    await runScript("./fetch_game_data.js");
    await runScript("./calculate_scores.js");
    console.log("🎉 All scripts completed!");
  } catch (err) {
    console.error("❌ update_all failed:", err);
    process.exit(1);
  }
}

main();
