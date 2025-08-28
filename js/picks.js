// =========================
// State
// =========================
let currentWeek = 1;
let picks = [];
let bonusPick = null;
let gameData = [];
let gameTimes = [];

// =========================
// Elements
// =========================
const matchupsDiv = document.getElementById("matchups");
const picksList = document.getElementById("picks-list");
const weekTitle = document.getElementById("week-title");
const nextBtn = document.getElementById("next-btn");

// =========================
// Logos
// =========================
const teamLogoMap = {
  "49ers": "49ers.png",
  "Bears": "bears.png",
  "Bengals": "bengals.png",
  "Bills": "bills.png",
  "Broncos": "broncos.png",
  "Browns": "browns.png",
  "Buccaneers": "buccaneers.png",
  "Cardinals": "cardinals.png",
  "Chargers": "chargers.png",
  "Chiefs": "chiefs.png",
  "Colts": "colts.png",
  "Commanders": "commanders.png",
  "Cowboys": "cowboys.png",
  "Dolphins": "dolphins.png",
  "Eagles": "eagles.png",
  "Falcons": "falcons.png",
  "Giants": "giants.png",
  "Jaguars": "jaguars.png",
  "Jets": "jets.png",
  "Lions": "lions.png",
  "Packers": "packers.png",
  "Panthers": "panthers.png",
  "Patriots": "patriots.png",
  "Raiders": "raiders.png",
  "Rams": "rams.png",
  "Ravens": "ravens.png",
  "Saints": "saints.png",
  "Seahawks": "seahawks.png",
  "Steelers": "steelers.png",
  "Texans": "texans.png",
  "Titans": "titans.png",
  "Vikings": "vikings.png",
};

function getLogoPath(teamName) {
  const key = teamName.split(" ").pop();
  return `src/logos/${teamLogoMap[key] || ""}`;
}

// =========================
// Load Data
// =========================
async function loadGameData() {
  try {
    const [dataRes, timesRes] = await Promise.all([
      fetch("data/game_data/game_data.json"),
      fetch("data/game_data/game_times.json"),
    ]);

    gameData = await dataRes.json();
    gameTimes = await timesRes.json();

    renderWeek(currentWeek);
  } catch (err) {
    console.error("Error loading game data:", err);
    matchupsDiv.innerHTML = "<p>⚠️ Could not load game data.</p>";
  }
}

// =========================
// Render Week
// =========================
function renderWeek(weekNumber) {
  weekTitle.textContent = `Week ${weekNumber}`;
  picks = [];
  bonusPick = null;
  renderPicks();

  const weekObj = gameData.find((w) => w.week === weekNumber);
  if (!weekObj) {
    matchupsDiv.innerHTML = "<p>No games found for this week.</p>";
    return;
  }

  matchupsDiv.innerHTML = "";

  // Group by weekday
  const gamesByDay = {};
  weekObj.games.forEach((game, idx) => {
    if (!gamesByDay[game.weekday]) gamesByDay[game.weekday] = [];
    gamesByDay[game.weekday].push({ game, idx });
  });

  for (const [day, games] of Object.entries(gamesByDay)) {
    const dayContainer = document.createElement("div");
    dayContainer.className = "weekday-container";

    // ✅ Header row: day (center) + "Time (CST)" (right)
    const headerRow = document.createElement("div");
    headerRow.className = "weekday-header-row";

    const dayHeader = document.createElement("div");
    dayHeader.className = "weekday-header";
    dayHeader.textContent = day;

    const timeHeader = document.createElement("div");
    timeHeader.className = "game-time-header";
    timeHeader.textContent = "Time (CST)";

    headerRow.appendChild(dayHeader);
    headerRow.appendChild(timeHeader);
    dayContainer.appendChild(headerRow);

    // Render each matchup
    games.forEach(({ game, idx }) => {
      const row = document.createElement("div");
      row.className = "matchup-row";
      const matchupKey = `week${weekNumber}_game${idx}`;

      // Lookup time + note
      const weekTimes = gameTimes.find((w) => w.week === weekNumber);
      let gameTime = "";
      let note = "";
      if (weekTimes) {
        const match = weekTimes.games.find(
          (g) => g.homeTeam === game.homeTeam && g.awayTeam === game.awayTeam
        );
        if (match) {
          gameTime = match.gameTime || "";
          note = match.note || "";
        }
      }

      // Left column (time)
      const timeDiv = document.createElement("div");
      timeDiv.className = "game-time";
      timeDiv.textContent = gameTime;
      row.appendChild(timeDiv);

      // Center column (matchup)
      const centerCol = document.createElement("div");
      centerCol.className = "center-col";

      const away = createTeamBox(game.awayTeam, game.homeTeam, matchupKey);

      const at = document.createElement("div");
      at.className = "at-label";
      at.textContent = "at";

      const homeContainer = document.createElement("div");
      homeContainer.className = "home-container";
      const home = createTeamBox(game.homeTeam, game.awayTeam, matchupKey);
      homeContainer.appendChild(home);

      if (note && note.toLowerCase() !== "none") {
        const noteDiv = document.createElement("div");
        noteDiv.className = "game-note";
        noteDiv.textContent = note;
        homeContainer.appendChild(noteDiv);
      }

      centerCol.appendChild(away);
      centerCol.appendChild(at);
      centerCol.appendChild(homeContainer);

      row.appendChild(centerCol);
      dayContainer.appendChild(row);
    });

    matchupsDiv.appendChild(dayContainer);
  }
}

// =========================
// Create Team Box
// =========================
function createTeamBox(team, opponent, matchupKey) {
  const box = document.createElement("div");
  box.className = "team-box";
  box.dataset.team = team;
  box.dataset.matchup = matchupKey;

  const logo = document.createElement("img");
  logo.src = getLogoPath(team);
  logo.alt = `${team} logo`;
  logo.className = "team-logo";

  const label = document.createElement("span");
  label.textContent = team;

  box.appendChild(logo);
  box.appendChild(label);

  box.addEventListener("click", () =>
    toggleTeam(team, opponent, "Scheduled", box, matchupKey)
  );

  return box;
}

// =========================
// Toggle Team
// =========================
function toggleTeam(team, opponent, status, element, matchupKey) {
  const existingPick = picks.find((p) => p.matchup === matchupKey);

  if (existingPick && existingPick.team === team) {
    picks = picks.filter((p) => p.team !== team);
    element.classList.remove("selected");
    if (bonusPick === team) bonusPick = null;
    renderPicks();
    return;
  }

  if (existingPick && existingPick.team !== team) {
    picks = picks.filter((p) => p.matchup !== matchupKey);
    const oldTeam = existingPick.team;
    const oldEl = document.querySelector(
      `.team-box[data-team="${oldTeam}"][data-matchup="${matchupKey}"]`
    );
    if (oldEl) oldEl.classList.remove("selected");
    if (bonusPick === oldTeam) bonusPick = null;
  }

  if (picks.length >= 5) {
    alert("You already picked 5 teams!");
    return;
  }

  picks.push({ team, matchup: matchupKey });
  element.classList.add("selected");
  renderPicks();
}

// =========================
// Render Picks
// =========================
function renderPicks() {
  picksList.innerHTML = "";

  picks.forEach((p) => {
    const wrapper = document.createElement("div");
    wrapper.className = "pick-box";

    const logo = document.createElement("img");
    logo.src = getLogoPath(p.team);
    logo.alt = `${p.team} logo`;
    logo.className = "pick-logo";

    const label = document.createElement("span");
    label.textContent = p.team;
    label.className = "pick-label";

    if (p.team === bonusPick) wrapper.classList.add("bonus");

    wrapper.addEventListener("click", () => {
      bonusPick = p.team;
      renderPicks();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "pick-remove";
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${p.team}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removePick(p);
    });

    wrapper.appendChild(logo);
    wrapper.appendChild(label);
    wrapper.appendChild(removeBtn);
    picksList.appendChild(wrapper);
  });

  document.querySelector("#picks-box h2").textContent = `Your Picks (${picks.length}/5)`;
  checkReady();
}

// =========================
// Remove Pick
// =========================
function removePick(pick) {
  if (bonusPick === pick.team) bonusPick = null;
  picks = picks.filter((x) => !(x.team === pick.team && x.matchup === pick.matchup));
  const teamBox = document.querySelector(
    `.team-box[data-team="${pick.team}"][data-matchup="${pick.matchup}"]`
  );
  if (teamBox) teamBox.classList.remove("selected");
  renderPicks();
}

function checkReady() {
  nextBtn.disabled = !(picks.length === 5 && bonusPick);
}

// =========================
// Navigation
// =========================
nextBtn.addEventListener("click", () => {
  if (currentWeek < 18) {
    currentWeek++;
    renderWeek(currentWeek);
    if (currentWeek === 18) {
      nextBtn.textContent = "Submit";
    }
  } else {
    alert("✅ All weeks submitted!");
    // TODO: push to Firebase
  }
});

// Init
loadGameData();
