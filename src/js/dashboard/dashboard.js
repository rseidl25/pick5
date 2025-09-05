// ============================
// Firebase Auth Handling
// ============================
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from "../auth/firebase_init.js";

const auth = getAuth(app);
const db = getFirestore(app);

// ============================
// Fetch scores, avatars & last updated
// ============================
async function fetchScores() {
  const res = await fetch("../src/data/player/scores.json");
  return res.json();
}
async function fetchAvatars() {
  const res = await fetch("../src/data/player/avatars.json");
  return res.json();
}
async function fetchLastUpdated() {
  const res = await fetch("../src/data/player/last_updated.json");
  return res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  // --- UI Elements
  const tabButtons = document.querySelectorAll(".dashboard-tabs button");
  const sections = document.querySelectorAll(".tab-section");
  const weekButtonsContainer = document.getElementById("week-buttons");
  const leaderboardTitle = document.getElementById("leaderboard-title");
  const picksTitle = document.getElementById("picks-title");
  const weekStatsTitle = document.getElementById("week-stats-title");
  const lastUpdatedTime = document.getElementById("last-updated-time");
  const playerSelect = document.getElementById("select-player");
  const teamSelect = document.getElementById("select-team");
  const weeklyGrid = document.getElementById("weekly-picks-grid");
  const counterEl = document.getElementById("team-pick-counter");
  const toggleScoresBtn = document.getElementById("toggle-scores-btn");
  const matchupsContainer = document.getElementById("matchups-container");
  const matchupsList = document.getElementById("matchups-list");

  // --- Auth UI
  const userName = document.getElementById("user-name");
  const loginBtn = document.getElementById("login-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // --- State
  let currentTab = "leaderboard";
  let currentWeek = null;
  let scoresData = {};
  let allPlayers = [];

  // --- Settings Modal Elements
  const settingsModal = document.getElementById("settings-modal");
  const closeSettings = document.getElementById("close-settings");
  const settingsForm = document.getElementById("settings-form");
  const displayNameInput = document.getElementById("display-name");
  const profileUrlInput = document.getElementById("profile-url");
  const resetAvatarBtn = document.getElementById("reset-avatar-btn");

  const DEFAULT_AVATAR = "icons/default_avatar.png";

  // =========================
  // Firebase Auth State
  // =========================
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = user.displayName || user.email || "User";
      userName.textContent = name;

      loginBtn.style.display = "none";
      settingsBtn.style.display = "inline-block";
      logoutBtn.style.display = "inline-block";

      logoutBtn.onclick = async () => {
        await signOut(auth);
        window.location.reload();
      };
    } else {
      userName.textContent = "Guest";

      loginBtn.style.display = "inline-block";
      settingsBtn.style.display = "none";
      logoutBtn.style.display = "none";

      loginBtn.onclick = () => (window.location.href = "login.html");
    }
  });

  // =========================
  // Settings Modal Handlers
  // =========================
  settingsBtn.onclick = () => {
    const user = auth.currentUser;
    if (user) {
      displayNameInput.value = user.displayName || "";
      profileUrlInput.value = "";
      profileUrlInput.placeholder = "Paste image URL here";

      if (user.photoURL && user.photoURL !== DEFAULT_AVATAR) {
        resetAvatarBtn.style.display = "block";
      } else {
        resetAvatarBtn.style.display = "none";
      }
    }
    settingsModal.classList.remove("hidden");
  };

  closeSettings.onclick = () => settingsModal.classList.add("hidden");

  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    try {
      const newName = displayNameInput.value || user.displayName;
      const newPhotoURL = profileUrlInput.value || user.photoURL || DEFAULT_AVATAR;

      await updateProfile(user, { displayName: newName, photoURL: newPhotoURL });
      await setDoc(
        doc(db, "users", user.uid),
        { displayName: newName, photoURL: newPhotoURL },
        { merge: true }
      );

      alert("✅ Profile updated!");
      window.location.reload();
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      alert("Error updating profile.");
    }
  });

  if (resetAvatarBtn) {
    resetAvatarBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        await updateProfile(user, { photoURL: DEFAULT_AVATAR });
        await setDoc(
          doc(db, "users", user.uid),
          { photoURL: DEFAULT_AVATAR },
          { merge: true }
        );
        alert("✅ Profile picture reset to default!");
        window.location.reload();
      } catch (err) {
        console.error("❌ Error resetting avatar:", err);
        alert("Error resetting avatar.");
      }
    });
  }

  // =========================
  // Logos
  // =========================
  const teamLogoMap = {
    "49ers": "49ers.png", Bears: "bears.png", Bengals: "bengals.png", Bills: "bills.png",
    Broncos: "broncos.png", Browns: "browns.png", Buccaneers: "buccaneers.png", Cardinals: "cardinals.png",
    Chargers: "chargers.png", Chiefs: "chiefs.png", Colts: "colts.png", Commanders: "commanders.png",
    Cowboys: "cowboys.png", Dolphins: "dolphins.png", Eagles: "eagles.png", Falcons: "falcons.png",
    Giants: "giants.png", Jaguars: "jaguars.png", Jets: "jets.png", Lions: "lions.png",
    Packers: "packers.png", Panthers: "panthers.png", Patriots: "patriots.png", Raiders: "raiders.png",
    Rams: "rams.png", Ravens: "ravens.png", Saints: "saints.png", Seahawks: "seahawks.png",
    Steelers: "steelers.png", Texans: "texans.png", Titans: "titans.png", Vikings: "vikings.png"
  };

  // =========================
  // Tab Switching
  // =========================
  function showSection(tab) {
    currentTab = tab;
    currentWeek = tab === "leaderboard" ? null : 1;

    sections.forEach((section) => {
      section.style.display = section.id === `${tab}-section` ? "block" : "none";
    });
    tabButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.tab === tab)
    );

    renderWeekButtons();
    updateTitles();

    if (tab === "picks") {
      loadPlayers();
      loadTeamsDropdown();
      loadWeeklyPicks(currentWeek);
    }
    if (tab === "leaderboard") {
      loadLeaderboard();
    }
  }

  // =========================
  // Week Buttons
  // =========================
  function renderWeekButtons() {
    weekButtonsContainer.innerHTML = "";
    const isMobile = window.innerWidth <= 700;

    if (currentTab === "leaderboard") {
      const overallBtn = document.createElement("button");
      overallBtn.textContent = isMobile ? "All" : "Overall";
      overallBtn.className = "week-btn status-grey";
      if (isMobile) overallBtn.classList.add("compact-btn");
      overallBtn.addEventListener("click", () => {
        currentWeek = null;
        updateTitles();
        setActiveButton(overallBtn);
        loadLeaderboard();
      });
      weekButtonsContainer.appendChild(overallBtn);
      if (currentWeek === null) setActiveButton(overallBtn);
    }

    for (let i = 1; i <= 18; i++) {
      const btn = document.createElement("button");
      btn.textContent = isMobile ? `${i}` : `Week ${i}`;
      btn.className = "week-btn status-grey";
      if (isMobile) btn.classList.add("compact-btn");
      btn.addEventListener("click", () => {
        currentWeek = i;
        updateTitles();
        setActiveButton(btn);
        if (currentTab === "picks") loadWeeklyPicks(currentWeek);
        if (currentTab === "leaderboard") loadLeaderboard();
      });
      weekButtonsContainer.appendChild(btn);
      if (currentTab !== "leaderboard" && i === 1 && currentWeek === 1) {
        setActiveButton(btn);
      }
    }
  }

  function updateTitles() {
    if (currentTab === "leaderboard") {
      leaderboardTitle.textContent =
        currentWeek === null
          ? "OVERALL LEADERBOARD"
          : `WEEK ${currentWeek} LEADERBOARD`;
    } else if (currentTab === "picks") {
      picksTitle.textContent = `WEEK ${currentWeek} PICKS`;
    } else if (currentTab === "week-stats") {
      weekStatsTitle.textContent = `WEEK ${currentWeek} STATS`;
    }
  }

  function setActiveButton(activeBtn) {
    const allBtns = weekButtonsContainer.querySelectorAll(".week-btn");
    allBtns.forEach((btn) => btn.classList.remove("active"));
    if (activeBtn) activeBtn.classList.add("active");
  }

  // =========================
  // Auto-refresh week buttons on resize
  // =========================
  window.addEventListener("resize", () => {
    renderWeekButtons();
    updateTitles();
  });

  // =========================
  // Leaderboard
  // =========================
  function loadLeaderboard() {
    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";

    const players = Object.entries(scoresData).map(([uid, player]) => ({
      uid,
      name: player.name,
      score:
        currentWeek === null
          ? player.overall_score
          : player.weeks?.[`week${currentWeek}`]?.total || 0,
      photoURL: player.photoURL || DEFAULT_AVATAR
    }));

    players.sort((a, b) => b.score - a.score);

    let currentRank = 0,
      prevScore = null,
      playersSeen = 0;
    players.forEach((player) => {
      playersSeen++;
      if (player.score !== prevScore) currentRank = playersSeen;
      prevScore = player.score;

      const tr = document.createElement("tr");
      tr.classList.add(`position-${currentRank}`);
      tr.innerHTML = `
        <td>${currentRank}</td>
        <td>
          <div class="player-cell">
            <img src="${player.photoURL}" alt="${player.name}" class="profile-pic">
            <span>${player.name}</span>
          </div>
        </td>
        <td>${player.score}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // =========================
  // Players Dropdown
  // =========================
  function loadPlayers() {
    allPlayers = Object.entries(scoresData).map(([uid, player]) => ({
      uid,
      name: player.name,
    }));
    playerSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Players";
    playerSelect.appendChild(allOpt);
    allPlayers.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.uid;
      opt.textContent = p.name;
      playerSelect.appendChild(opt);
    });
    playerSelect.value = "all";
  }

  // =========================
  // Teams Dropdown
  // =========================
  function loadTeamsDropdown() {
    teamSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Teams";
    teamSelect.appendChild(allOpt);
    const teamSet = new Set();
    Object.values(scoresData).forEach((player) => {
      Object.values(player.weeks).forEach((week) => {
        Object.keys(week.teams).forEach((team) => teamSet.add(team));
      });
    });
    Array.from(teamSet)
      .sort()
      .forEach((team) => {
        const opt = document.createElement("option");
        opt.value = team;
        opt.textContent = team;
        teamSelect.appendChild(opt);
      });
    teamSelect.value = "all";
  }

  // =========================
  // Picks Grid
  // =========================
  async function loadWeeklyPicks(weekNumber) {
    weeklyGrid.innerHTML = "";
    const gamesRes = await fetch("../src/data/game/games.json");
    const gamesData = await gamesRes.json();
    const gamesForWeek =
      gamesData.find((g) => g.week === weekNumber)?.games || [];
    const selectedPlayer = playerSelect.value;
    const selectedTeam = teamSelect.value;
    const playersToShow =
      selectedPlayer === "all"
        ? allPlayers
        : allPlayers.filter((p) => p.uid === selectedPlayer);
    let countPicked = 0;

    playersToShow.forEach((player) => {
      const weekData = scoresData[player.uid].weeks[`week${weekNumber}`];
      const card = document.createElement("div");
      card.className = "pick-box";

      const title = document.createElement("div");
      title.className = "player-header";
      title.innerHTML = `
        <img src="${scoresData[player.uid].photoURL || DEFAULT_AVATAR}" 
             alt="${player.name}" class="profile-pic">
        <h3>${player.name}</h3>
      `;
      card.appendChild(title);

      const ul = document.createElement("ul");
      ul.className = "pick-list";

      if (!weekData || Object.keys(weekData.teams).length === 0) {
        const li = document.createElement("li");
        li.textContent = "No picks submitted";
        ul.appendChild(li);
      } else {
        const bonusTeam = Object.entries(weekData.teams).find(
          ([, info]) => info.bonus
        );
        const otherTeams = Object.entries(weekData.teams).filter(
          ([, info]) => !info.bonus
        );
        otherTeams.sort(([a], [b]) => {
          const idxA = gamesForWeek.findIndex(
            (g) => g.homeTeam === a || g.awayTeam === a
          );
          const idxB = gamesForWeek.findIndex(
            (g) => g.homeTeam === b || g.awayTeam === b
          );
          return idxA - idxB;
        });
        const orderedTeams = [];
        if (bonusTeam) orderedTeams.push(bonusTeam);
        orderedTeams.push(...otherTeams);
        let pickedThisTeam = false;

        for (const [team, info] of orderedTeams) {
          const li = document.createElement("li");
          li.className = "pick-row";
          if (info.bonus) li.classList.add("bonus");
          if (selectedTeam !== "all" && team === selectedTeam) {
            li.style.backgroundColor = "lightblue";
            pickedThisTeam = true;
          }

          const game = gamesForWeek.find(
            (g) => g.homeTeam === team || g.awayTeam === team
          );
          let teamColor = "black";
          if (game && game.status === "Completed") {
            const winner =
              game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
            teamColor = winner === team ? "green" : "red";
          }

          const mascot = team.split(" ").pop();
          const logoFile = teamLogoMap[mascot] || "default.png";
          const logo = document.createElement("img");
          logo.src = `logos/${logoFile}`;
          logo.alt = team;
          logo.className = "team-logo";
          li.appendChild(logo);
          const nameSpan = document.createElement("span");
          nameSpan.textContent = team;
          nameSpan.style.color = teamColor;
          li.appendChild(nameSpan);
          const ptsSpan = document.createElement("span");
          ptsSpan.className = "team-points";
          ptsSpan.textContent = info.points;
          li.appendChild(ptsSpan);
          ul.appendChild(li);
        }
        if (pickedThisTeam) countPicked++;
      }
      card.appendChild(ul);
      weeklyGrid.appendChild(card);
    });

    counterEl.style.display = selectedTeam !== "all" ? "inline" : "none";
    if (selectedTeam !== "all")
      counterEl.textContent = `${countPicked}/${allPlayers.length} player(s)`;

    if (!matchupsContainer.classList.contains("hidden")) {
      renderMatchups(gamesForWeek);
    }
  }

  // =========================
  // Matchups Rendering
  // =========================
  function renderMatchups(gamesForWeek) {
    matchupsList.innerHTML = "";
    const gamesByDay = {};
    gamesForWeek.forEach((game) => {
      const day = game.weekday || "Unknown";
      if (!gamesByDay[day]) gamesByDay[day] = [];
      gamesByDay[day].push(game);
    });

    Object.entries(gamesByDay).forEach(([day, games]) => {
      const dayBox = document.createElement("div");
      dayBox.className = "day-box";

      const header = document.createElement("div");
      header.className = "day-header";
      header.textContent = day;
      dayBox.appendChild(header);

      games.forEach((game) => {
        const row = document.createElement("div");
        row.className = "matchup-row";

        const away = document.createElement("div");
        away.className = "team-label away-label";
        const awayLogo = document.createElement("img");
        awayLogo.src = `logos/${
          teamLogoMap[game.awayTeam.split(" ").pop()] || "default.png"
        }`;
        awayLogo.className = "matchup-logo";
        away.appendChild(awayLogo);
        away.append(game.awayTeam);

        const awayScore = document.createElement("div");
        awayScore.className = "team-score";
        awayScore.textContent = game.awayScore;

        const homeScore = document.createElement("div");
        homeScore.className = "team-score";
        homeScore.textContent = game.homeScore;

        const home = document.createElement("div");
        home.className = "team-label home-label";
        const homeLogo = document.createElement("img");
        homeLogo.src = `logos/${
          teamLogoMap[game.homeTeam.split(" ").pop()] || "default.png"
        }`;
        homeLogo.className = "matchup-logo";
        home.appendChild(homeLogo);
        home.append(game.homeTeam);

        if (game.status === "Completed") {
          if (game.homeScore > game.awayScore) {
            home.classList.add("winner");
            homeScore.classList.add("winner");
            away.classList.add("loser");
            awayScore.classList.add("loser");
          } else {
            away.classList.add("winner");
            awayScore.classList.add("winner");
            home.classList.add("loser");
            homeScore.classList.add("loser");
          }
        }

        row.appendChild(away);
        row.appendChild(awayScore);
        row.appendChild(homeScore);
        row.appendChild(home);

        dayBox.appendChild(row);
      });

      matchupsList.appendChild(dayBox);
    });
  }

  // =========================
  // Init
  // =========================
  scoresData = await fetchScores();
  const avatarsData = await fetchAvatars();

  Object.entries(avatarsData).forEach(([uid, info]) => {
    if (scoresData[uid]) {
      scoresData[uid].name = info.displayName || scoresData[uid].name;
      scoresData[uid].photoURL = info.photoURL || DEFAULT_AVATAR;
    }
  });

  try {
    const lastUpdatedData = await fetchLastUpdated();
    lastUpdatedTime.textContent =
      lastUpdatedData.last_updated || "[Unknown]";
  } catch {
    lastUpdatedTime.textContent = "[Error]";
  }

  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => showSection(btn.dataset.tab))
  );

  toggleScoresBtn.addEventListener("click", async () => {
    matchupsContainer.classList.toggle("hidden");
    if (!matchupsContainer.classList.contains("hidden")) {
      const gamesRes = await fetch("../src/data/game/games.json");
      const gamesData = await gamesRes.json();
      const gamesForWeek =
        gamesData.find((g) => g.week === currentWeek)?.games || [];
      renderMatchups(gamesForWeek);
    }
  });

  showSection("leaderboard");
});
