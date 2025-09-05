// src/js/util/calculate_scores.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const picksPath = path.resolve(__dirname, "../../data/player/picks.json");
const gamesPath = path.resolve(__dirname, "../../data/game/games.json");
const scoresPath = path.resolve(__dirname, "../../data/player/scores.json");
const lastUpdatedPath = path.resolve(__dirname, "../../data/player/last_updated.json");

// Load data
const picksData = JSON.parse(fs.readFileSync(picksPath));
const gamesData = JSON.parse(fs.readFileSync(gamesPath));

function formatCSTTime(date) {
  // Format using America/Chicago (CST/CDT)
  let formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);

  // Force replace CDT → CST
  formatted = formatted.replace("CDT", "CST");
  return formatted;
}

function calculateScores() {
  const scores = {};

  for (const [uid, player] of Object.entries(picksData)) {
    scores[uid] = {
      name: player.name || "Unknown",
      weeks: {},
      overall_score: 0,
    };

    for (const [weekId, weekData] of Object.entries(player.weeks)) {
      const weekNum = parseInt(weekId.replace("week", ""), 10);
      const gamesForWeek = gamesData.find((g) => g.week === weekNum)?.games || [];

      scores[uid].weeks[weekId] = { teams: {}, total: 0 };
      let weekTotal = 0;

      for (const pick of weekData.picks) {
        const { team } = pick;
        let teamPoints = 0;
        const isBonus = team === weekData.bonus;

        const game = gamesForWeek.find(
          (g) => g.homeTeam.includes(team) || g.awayTeam.includes(team)
        );

        if (game && game.status === "Completed") {
          const homeWin = game.homeScore > game.awayScore;
          const winner = homeWin ? game.homeTeam : game.awayTeam;

          if (winner.includes(team)) {
            if (isBonus) {
              const actualScore =
                game.homeTeam.includes(team) ? game.homeScore : game.awayScore;
              teamPoints = 10 + actualScore;
            } else {
              teamPoints = 10;
            }
          }
        }

        scores[uid].weeks[weekId].teams[team] = {
          points: teamPoints,
          bonus: isBonus,
        };

        weekTotal += teamPoints;
      }

      scores[uid].weeks[weekId].total = weekTotal;
      scores[uid].overall_score += weekTotal;
    }
  }

  fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));

  // Write last updated (always CST)
  const now = new Date();
  const formattedTime = formatCSTTime(now);
  fs.writeFileSync(
    lastUpdatedPath,
    JSON.stringify({ last_updated: formattedTime }, null, 2)
  );

  console.log("✅ Scores and last updated written (forced CST)");
}

calculateScores();
