import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
  try {
    console.log("🚀 Starting update_all...");

    // ✅ Run scripts with absolute paths
    await runScript("fetch_game_data.js");
    await runScript("calculate_scores.js");

    console.log("🎉 All scripts completed!");
  } catch (err) {
    console.error("❌ update_all failed:", err);
    process.exit(1);
  }
}

main();
