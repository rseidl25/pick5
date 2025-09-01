// =========================
// State
// =========================
let currentWeek = 1;
let picks = [];
let bonusPick = null;
let gameData = [];
let gameTimes = [];
let gameDates = [];
let weekStatuses = {};

// =========================
// Elements
// =========================
const matchupsDiv = document.getElementById("matchups");
const picksList = document.getElementById("picks-list");
const weekTitle = document.getElementById("week-title");
const weekNav = document.getElementById("week-nav");
const submitBtn = document.getElementById("submit-btn");
const summaryScreen = document.getElementById("summary-screen");
const summaryContent = document.getElementById("summary-content");
const backBtn = document.getElementById("back-btn");
const finalSubmitBtn = document.getElementById("final-submit-btn");
const mainContent = document.getElementById("main-content");
const weekTitleContainer = document.getElementById("week-title-container");
const summaryActions = document.getElementById("summary-actions");

// =========================
// Config / Testing
// =========================
const TESTING_MODE = false;   // ✅ set to true for testing, false for real

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
// Helpers
// =========================
function formatDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  const m = parseInt(yyyymmdd.substring(4, 6), 10);
  const d = parseInt(yyyymmdd.substring(6, 8), 10);
  return `${m}/${d}`;
}

// =========================
// Local + Firestore Autosave
// =========================
function saveProgressLocal(uid) {
  if (!uid) return; 
  const payload = {
    uid,
    weekStatuses
  };
  localStorage.setItem(`pick5_progress`, JSON.stringify(payload));
}

function loadProgressLocal(uid) {
  if (!uid) return;

  const raw = localStorage.getItem(`pick5_progress`);
  if (!raw) {
    weekStatuses = {};
    return;
  }

  try {
    const payload = JSON.parse(raw);
    if (payload.uid === uid) {
      weekStatuses = payload.weekStatuses || {};
      console.log(`📦 Loaded progress for ${uid} from localStorage`);
    } else {
      console.log("⚠️ LocalStorage data does not match current UID. Ignoring.");
      weekStatuses = {}; // reset
    }
  } catch (err) {
    console.error("❌ Error parsing localStorage data:", err);
    weekStatuses = {};
  }
}

// =========================
// Load Progress (Firestore first, fallback local)
// =========================
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { saveAllUserPicks, autosaveUserPicks, loadUserPicksFromFirestore } from "./picks_firebase.js";

const db = getFirestore();
const auth = getAuth();

async function loadProgress(uid) {
  if (!uid) {
    console.log("👤 No user logged in, using guest mode");
    loadProgressLocal("guest");
    return;
  }

  try {
    const cloudPicks = await loadUserPicksFromFirestore();
    if (Object.keys(cloudPicks).length > 0) {
      weekStatuses = cloudPicks;
      console.log("☁️ Loaded picks from Firestore for", uid);
      saveProgressLocal(uid);
    } else {
      console.log("⚠️ No Firestore picks, falling back to localStorage");
      loadProgressLocal(uid);
    }
  } catch (err) {
    console.error("❌ Error loading from Firestore:", err);
    loadProgressLocal(uid);
  }
}

// =========================
// Load Data + Picks
// =========================
async function loadGameData() {
  try {
    const [dataRes, timesRes, datesRes] = await Promise.all([
      fetch("data/game_data/game_data.json"),
      fetch("data/game_data/game_times.json"),
      fetch("data/game_data/game_dates.json"),
    ]);

    gameData = await dataRes.json();
    gameTimes = await timesRes.json();
    gameDates = await datesRes.json();

    // ✅ Always check Firestore first
    if (auth.currentUser) {
      const cloudPicks = await loadUserPicksFromFirestore();
      if (Object.keys(cloudPicks).length > 0) {
        weekStatuses = cloudPicks;
        saveProgressLocal(auth.currentUser.uid); // sync to localStorage
        console.log("📡 Using Firestore picks");
      } else {
        // fallback
        loadProgressLocal(auth.currentUser.uid);
        console.log("📦 No Firestore data, using localStorage");
      }
    } else {
      // guest mode
      loadProgressLocal("guest");
      console.log("👤 Guest mode - using localStorage");
    }

    renderWeek(currentWeek);
    renderWeekNav();
    updateSubmitButton();
  } catch (err) {
    console.error("Error loading game data:", err);
    matchupsDiv.innerHTML = "<p>⚠️ Could not load game data.</p>";
  }
}

// =========================
// Render Week
// =========================
function renderWeek(weekNumber) {
  weekTitle.textContent = `WEEK ${weekNumber}`;

  if (!weekStatuses[weekNumber]) {
    weekStatuses[weekNumber] = { picks: [], bonus: null };
  }
  picks = weekStatuses[weekNumber].picks.map(p => ({
    team: p.team,
    matchup: p.matchup || `week${weekNumber}`  // ensure matchup exists
  }));
  bonusPick = weekStatuses[weekNumber].bonus;

  renderPicks();

  const weekObj = gameData.find((w) => w.week === weekNumber);
  if (!weekObj) {
    matchupsDiv.innerHTML = "<p>No games found for this week.</p>";
    return;
  }

  matchupsDiv.innerHTML = "";

  const gamesByDay = {};
  weekObj.games.forEach((game, idx) => {
    if (!gamesByDay[game.weekday]) gamesByDay[game.weekday] = [];
    gamesByDay[game.weekday].push({ game, idx });
  });

  const weekDateObj = gameDates.find((gd) => gd.week === weekNumber);

  for (const [day, games] of Object.entries(gamesByDay)) {
    const dayContainer = document.createElement("div");
    dayContainer.className = "weekday-container";

    const headerRow = document.createElement("div");
    headerRow.className = "weekday-header-row";

    const dayHeader = document.createElement("div");
    dayHeader.className = "weekday-header";

    let dateText = "";
    if (weekDateObj && weekDateObj[day.toLowerCase()]) {
      dateText = ` (${formatDate(weekDateObj[day.toLowerCase()])})`;
    }
    dayHeader.textContent = day + dateText;

    const timeHeader = document.createElement("div");
    timeHeader.className = "game-time-header";
    timeHeader.textContent = "Time (CST)";

    headerRow.appendChild(dayHeader);
    headerRow.appendChild(timeHeader);
    dayContainer.appendChild(headerRow);

    games.forEach(({ game, idx }) => {
      const row = document.createElement("div");
      row.className = "matchup-row";
      const matchupKey = `week${weekNumber}_game${idx}`;

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

      const timeDiv = document.createElement("div");
      timeDiv.className = "game-time";
      timeDiv.textContent = gameTime;
      row.appendChild(timeDiv);

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
// Week Nav Rendering
// =========================
function renderWeekNav() {
  weekNav.innerHTML = "";

  for (let w = 1; w <= 18; w++) {
    const btn = document.createElement("button");
    btn.className = "week-btn";
    btn.textContent = w;

    const status = getWeekStatus(w);
    btn.classList.add(status);
    if (w === currentWeek) btn.classList.add("active");

    btn.addEventListener("click", () => {
      currentWeek = w;
      renderWeek(currentWeek);
    });

    weekNav.appendChild(btn);
  }
}

// =========================
// Week Status
// =========================
function getWeekStatus(week) {
  const state = weekStatuses[week];
  if (!state || state.picks.length === 0) return "status-grey";

  const allBonus = Object.values(weekStatuses)
    .map((s) => s?.bonus)
    .filter(Boolean);
  const duplicates = allBonus.filter((b, i, arr) => arr.indexOf(b) !== i);

  if (state.bonus && duplicates.includes(state.bonus)) return "status-red";
  if (state.picks.length < 5 || !state.bonus) return "status-yellow";
  return "status-green";
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
  label.style.fontWeight = "bold";

  box.appendChild(logo);
  box.appendChild(label);

  if (picks.find((p) => p.team === team && p.matchup === matchupKey)) {
    box.classList.add("selected");
  }

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
    label.style.fontWeight = "bold";

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

  weekStatuses[currentWeek] = { picks: [...picks], bonus: bonusPick };
  renderWeekNav();
  renderBonusTracker();
  updateSubmitButton();

  // Save progress after rendering
  if (auth.currentUser) {
    saveProgressLocal(auth.currentUser.uid);
    autosaveUserPicks(currentWeek, weekStatuses[currentWeek]); // ✅ new
  } else {
    saveProgressLocal("guest");
  }

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

// =========================
// Bonus Tracker
// =========================
function renderBonusTracker() {
  const tracker = document.getElementById("bonus-tracker");
  tracker.innerHTML = "<h2>Bonus Tracker</h2>";

  const container = document.createElement("div");
  container.className = "bonus-grid";

  const allBonus = {};
  for (let w = 1; w <= 18; w++) {
    const b = weekStatuses[w]?.bonus;
    if (b) {
      if (!allBonus[b]) allBonus[b] = [];
      allBonus[b].push(w);
    }
  }

  for (let col = 0; col < 2; col++) {
    const colDiv = document.createElement("div");
    colDiv.className = "bonus-col";

    const start = col === 0 ? 1 : 10;
    const end = col === 0 ? 9 : 18;

    for (let w = start; w <= end; w++) {
      const row = document.createElement("div");
      row.className = "bonus-row";

      const bonusTeam = weekStatuses[w]?.bonus;

      if (bonusTeam && allBonus[bonusTeam]?.length > 1) {
        const alertImg = document.createElement("img");
        alertImg.src = "src/icons/alert.png";
        alertImg.alt = "Duplicate bonus";
        alertImg.className = "bonus-alert";
        row.appendChild(alertImg);
      }

      if (bonusTeam && bonusTeam !== "") {
        const logo = document.createElement("img");
        logo.src = getLogoPath(bonusTeam);
        logo.alt = `${bonusTeam} logo`;
        logo.className = "bonus-team-logo";
        row.appendChild(logo);
      }

      const label = document.createElement("span");
      label.textContent = `WEEK ${w}: ${bonusTeam || ""}`;
      if (bonusTeam && allBonus[bonusTeam]?.length > 1) {
        label.classList.add("bonus-duplicate");
      }
      row.appendChild(label);

      colDiv.appendChild(row);
    }

    container.appendChild(colDiv);
  }

  tracker.appendChild(container);
}

// =========================
// Submit / Next Button Logic
// =========================
function updateSubmitButton() {
  if (TESTING_MODE) {
    submitBtn.disabled = false;
    submitBtn.classList.add("enabled");
    return;
  }

  let allValid = true;

  for (let w = 1; w <= 18; w++) {
    const state = weekStatuses[w];
    if (!state || state.picks.length < 5 || !state.bonus) {
      allValid = false;
      break;
    }
  }

  const allBonus = Object.values(weekStatuses).map(s => s?.bonus).filter(Boolean);
  const duplicates = allBonus.filter((b, i, arr) => arr.indexOf(b) !== i);
  if (duplicates.length > 0) allValid = false;

  if (allValid) {
    submitBtn.disabled = false;
    submitBtn.classList.add("enabled");
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.remove("enabled");
  }
}

// =========================
// Summary Screen
// =========================
function renderSummary() {
  summaryContent.innerHTML = "";

  for (let w = 1; w <= 18; w++) {
    const state = weekStatuses[w];
    const div = document.createElement("div");
    div.className = "summary-week";

    if (!state || state.picks.length === 0) {
      div.innerHTML = `<h3>Week ${w}</h3><p>No picks made.</p>`;
    } else {
      // ✅ Sort so bonus pick always comes first
      const sortedPicks = [...state.picks].sort((a, b) => {
        if (a.team === state.bonus) return -1;
        if (b.team === state.bonus) return 1;
        return 0;
      });

      let picksHTML = sortedPicks
        .map((p) => {
          // Find game info for opponent
          const weekObj = gameData.find((wk) => wk.week === w);
          const game = weekObj?.games.find(
            (g) => g.homeTeam === p.team || g.awayTeam === p.team
          );

          let opponent = "Opponent";
          let matchup = "";
          if (game) {
            if (game.homeTeam === p.team) {
              opponent = game.awayTeam;
              matchup = `<strong>${p.team}</strong> vs. ${opponent}`;
            } else {
              opponent = game.homeTeam;
              matchup = `<strong>${p.team}</strong> @ ${opponent}`;
            }
          }

          const logo = `<img src="${getLogoPath(p.team)}" class="pick-logo">`;
          const liClass = p.team === state.bonus ? "summary-bonus" : "";

          return `<li class="${liClass}">${logo} ${matchup}</li>`;
        })
        .join("");

      div.innerHTML = `
        <h3>Week ${w}</h3>
        <ul>${picksHTML}</ul>
      `;
    }

    summaryContent.appendChild(div);
  }
}

// =========================
// Button Events
// =========================
submitBtn.addEventListener("click", () => {
  if (!submitBtn.disabled) {
    mainContent.style.display = "none";
    weekTitleContainer.style.display = "none";
    summaryScreen.style.display = "block";
    summaryActions.style.display = "flex";
    renderSummary();
  }
});

backBtn.addEventListener("click", () => {
  summaryScreen.style.display = "none";
  summaryActions.style.display = "none";
  mainContent.style.display = "flex";
  weekTitleContainer.style.display = "block";
});

finalSubmitBtn.addEventListener("click", async () => {
  await saveAllUserPicks(weekStatuses);
  //alert("✅ Your picks have been submitted and synced!");
});

// =========================
// Init with Auth Listener
// =========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("🔑 Logged in as:", user.uid);
  } else {
    console.log("👤 Not logged in (guest mode)");
  }
  await loadGameData();
});