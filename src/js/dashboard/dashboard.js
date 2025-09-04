// ============================
// Dashboard Tab Switching + Week Nav + Player Picks
// ============================
async function fetchScores() {
  const res = await fetch("../src/data/player/scores.json");
  return res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  const tabButtons = document.querySelectorAll(".dashboard-tabs button");
  const sections = document.querySelectorAll(".tab-section");
  const weekButtonsContainer = document.getElementById("week-buttons");

  // Titles
  const leaderboardTitle = document.getElementById("leaderboard-title");
  const picksTitle = document.getElementById("picks-title");
  const weekStatsTitle = document.getElementById("week-stats-title");

  // Picks elements
  const playerSelect = document.getElementById("select-player");
  const weeklyGrid = document.getElementById("weekly-picks-grid");

  let currentTab = "leaderboard";
  let currentWeek = null;
  let scoresData = {};
  let allPlayers = [];

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

    if (currentTab === "leaderboard") {
      const overallBtn = document.createElement("button");
      overallBtn.textContent = "Overall";
      overallBtn.className = "week-btn status-grey";
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
      btn.textContent = `Week ${i}`;
      btn.className = "week-btn status-grey";
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
  // Leaderboard
  // =========================
  function loadLeaderboard() {
    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";

    const players = Object.entries(scoresData).map(([uid, player]) => {
      return {
        uid,
        name: player.name,
        score:
          currentWeek === null
            ? player.overall_score
            : player.weeks[`week${currentWeek}`]?.total || 0,
      };
    });

    players
      .sort((a, b) => b.score - a.score)
      .forEach((player, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${player.name}</td>
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
// Picks Grid
// =========================
async function loadWeeklyPicks(weekNumber) {
  weeklyGrid.innerHTML = "";

  // Load games.json so we can order picks by game schedule
  const gamesRes = await fetch("../src/data/game/games.json");
  const gamesData = await gamesRes.json();
  const gamesForWeek = gamesData.find((g) => g.week === weekNumber)?.games || [];

  const selected = playerSelect.value;
  const playersToShow =
    selected === "all" ? allPlayers : allPlayers.filter((p) => p.uid === selected);

  playersToShow.forEach((player) => {
    const weekData = scoresData[player.uid].weeks[`week${weekNumber}`];
    const card = document.createElement("div");
    card.className = "pick-box";

    const title = document.createElement("h3");
    title.textContent = player.name;
    card.appendChild(title);

    const ul = document.createElement("ul");
    ul.className = "pick-list";

    if (!weekData || Object.keys(weekData.teams).length === 0) {
      const li = document.createElement("li");
      li.textContent = "No picks submitted";
      ul.appendChild(li);
    } else {
      // Split picks into bonus + others
      const bonusTeam = Object.entries(weekData.teams).find(
        ([, info]) => info.bonus
      );
      const otherTeams = Object.entries(weekData.teams).filter(
        ([, info]) => !info.bonus
      );

      // Sort non-bonus teams by order in games.json
      otherTeams.sort(([teamA], [teamB]) => {
        const idxA = gamesForWeek.findIndex(
          (g) => g.homeTeam === teamA || g.awayTeam === teamA
        );
        const idxB = gamesForWeek.findIndex(
          (g) => g.homeTeam === teamB || g.awayTeam === teamB
        );
        return idxA - idxB;
      });

      // Put bonus first (if any), then ordered others
      const orderedTeams = [];
      if (bonusTeam) orderedTeams.push(bonusTeam);
      orderedTeams.push(...otherTeams);

      for (const [team, info] of orderedTeams) {
        const li = document.createElement("li");
        li.className = "pick-row";
        if (info.bonus) li.classList.add("bonus");

        const mascot = team.split(" ").pop();
        const logoFile = teamLogoMap[mascot] || "default.png";

        const logo = document.createElement("img");
        logo.src = `logos/${logoFile}`;
        logo.alt = team;
        logo.className = "team-logo";
        li.appendChild(logo);

        const nameSpan = document.createElement("span");
        nameSpan.textContent = team;
        li.appendChild(nameSpan);

        const ptsSpan = document.createElement("span");
        ptsSpan.className = "team-points";
        ptsSpan.textContent = info.points;
        li.appendChild(ptsSpan);

        ul.appendChild(li);
      }
    }

    card.appendChild(ul);
    weeklyGrid.appendChild(card);
  });
}

  // =========================
  // Listeners
  // =========================
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => showSection(btn.dataset.tab));
  });

  playerSelect.addEventListener("change", () => {
    if (currentTab === "picks") loadWeeklyPicks(currentWeek);
  });

  // =========================
  // Init
  // =========================
  scoresData = await fetchScores();
  showSection("leaderboard");
});
