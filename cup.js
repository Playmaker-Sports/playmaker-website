// ------------ BASIC CONFIG -------------
const API_BASE_URL = "https://playmakersportsapp-api.onrender.com";
const EVENT_ID = "47962"; 
// ^ Replace with the same event id your app uses for Playmakers Cup,
// e.g. "47962" — check your app config or Python file if you’re not sure.

// Endpoint will be: /api/events/<EVENT_ID>/data
const EVENT_URL = `${API_BASE_URL}/api/events/${EVENT_ID}/data`;

// Cached data
let eventData = null;
let currentDivisionKey = null;
let currentView = "standings"; // "standings" | "schedule"

// Utility: safe get
const safe = (obj, path, fallback = "") => {
  try {
    return path.split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), obj) ?? fallback;
  } catch {
    return fallback;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const standingsSection = document.getElementById("standings-section");
  const scheduleSection = document.getElementById("schedule-section");
  const divisionSelect = document.getElementById("division-select");
  const viewStandingsBtn = document.getElementById("view-standings-btn");
  const viewScheduleBtn = document.getElementById("view-schedule-btn");
  const statusEl = document.getElementById("data-status");
  const teamFilterInput = document.getElementById("schedule-team-filter");

  // Switch view buttons
  viewStandingsBtn.addEventListener("click", () => {
    currentView = "standings";
    standingsSection.style.display = "";
    scheduleSection.style.display = "none";
    viewStandingsBtn.classList.add("btn-primary");
    viewStandingsBtn.classList.remove("btn-ghost");
    viewScheduleBtn.classList.remove("btn-primary");
    viewScheduleBtn.classList.add("btn-ghost");
    if (eventData && currentDivisionKey) {
      renderStandings(eventData, currentDivisionKey);
    }
  });

  viewScheduleBtn.addEventListener("click", () => {
    currentView = "schedule";
    standingsSection.style.display = "none";
    scheduleSection.style.display = "";
    viewScheduleBtn.classList.add("btn-primary");
    viewScheduleBtn.classList.remove("btn-ghost");
    viewStandingsBtn.classList.remove("btn-primary");
    viewStandingsBtn.classList.add("btn-ghost");
    if (eventData && currentDivisionKey) {
      renderSchedule(eventData, currentDivisionKey);
    }
  });

  divisionSelect.addEventListener("change", () => {
    currentDivisionKey = divisionSelect.value;
    if (!eventData || !currentDivisionKey) return;
    if (currentView === "standings") {
      renderStandings(eventData, currentDivisionKey);
    } else {
      renderSchedule(eventData, currentDivisionKey);
    }
  });

  teamFilterInput.addEventListener("input", () => {
    if (!eventData || !currentDivisionKey || currentView !== "schedule") return;
    renderSchedule(eventData, currentDivisionKey, teamFilterInput.value.trim());
  });

  // Fetch data
  statusEl.style.display = "block";
  statusEl.textContent = "Loading live event data...";

  fetch(EVENT_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      eventData = data;
      statusEl.textContent = "Live data loaded from PlaymakerSportsApp API.";
      initDivisionSelect(data);
    })
    .catch((err) => {
      console.error("Error loading event data:", err);
      statusEl.textContent = "Error loading data. Check API URL or event id.";
    });
});

// Initialize divisions dropdown from standings or matches
function initDivisionSelect(data) {
  const divisionSelect = document.getElementById("division-select");
  divisionSelect.innerHTML = "";

  const options = [];

  // Try standings first
  const standings = data.standings;
  if (standings) {
    if (Array.isArray(standings)) {
      standings.forEach((divObj, idx) => {
        const key = divObj.key || divObj.id || `div_${idx}`;
        const name =
          divObj.division_name ||
          divObj.name ||
          divObj.label ||
          divObj.division ||
          `Division ${idx + 1}`;
        options.push({ key, name, _rawKey: null, _rawObj: divObj });
      });
    } else if (typeof standings === "object") {
      Object.entries(standings).forEach(([rawKey, divObj]) => {
        const name =
          divObj.division_name ||
          divObj.name ||
          divObj.label ||
          divObj.division ||
          rawKey;
        options.push({ key: rawKey, name, _rawKey: rawKey, _rawObj: divObj });
      });
    }
  }

  // Fall back to matches if no standings found
  if (!options.length && Array.isArray(data.matches)) {
    const divSet = new Set();
    data.matches.forEach((m) => {
      const divName =
        m.division ||
        m.age_group ||
        m.division_name ||
        m.bracket ||
        "Division";
      divSet.add(divName);
    });
    Array.from(divSet).forEach((name, idx) => {
      options.push({ key: `div_${idx}`, name, _rawKey: null, _rawObj: null });
    });
  }

  if (!options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No divisions found";
    divisionSelect.appendChild(opt);
    return;
  }

  options.forEach((optData, idx) => {
    const opt = document.createElement("option");
    opt.value = optData.key;
    opt.textContent = optData.name;
    divisionSelect.appendChild(opt);
    if (idx === 0) {
      currentDivisionKey = optData.key;
    }
  });

  // Trigger initial render
  if (currentDivisionKey) {
    renderStandings(eventData, currentDivisionKey);
  }
}

// Render standings table for one division
function renderStandings(data, divisionKey) {
  const container = document.getElementById("standings-container");
  container.innerHTML = "";

  let divisionObj = null;

  if (Array.isArray(data.standings)) {
    // If standings is array, try to match by key or name
    divisionObj =
      data.standings.find(
        (div) =>
          div.key === divisionKey ||
          div.id === divisionKey ||
          div.division === divisionKey ||
          div.division_name === divisionKey
      ) || data.standings[0];
  } else if (data.standings && typeof data.standings === "object") {
    divisionObj = data.standings[divisionKey] || Object.values(data.standings)[0];
  }

  if (!divisionObj) {
    container.textContent = "No standings available for this division.";
    return;
  }

  const teams = divisionObj.teams || divisionObj.rows || divisionObj.standings || [];
  if (!teams.length) {
    container.textContent = "No standings rows available.";
    return;
  }

  const table = document.createElement("table");
  table.className = "standings-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Team</th>
      <th>GP</th>
      <th>W</th>
      <th>D</th>
      <th>L</th>
      <th>GF</th>
      <th>GA</th>
      <th>GD</th>
      <th>Pts</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  teams.forEach((team, index) => {
    const tr = document.createElement("tr");

    const name =
      team.team_name ||
      team.name ||
      team.team ||
      team.club_team_name ||
      "Team";

    const gp = team.played ?? team.GP ?? team.games_played ?? "";
    const w = team.wins ?? team.W ?? "";
    const d = team.draws ?? team.D ?? team.ties ?? "";
    const l = team.losses ?? team.L ?? "";
    const gf = team.goals_for ?? team.GF ?? "";
    const ga = team.goals_against ?? team.GA ?? "";
    const gd =
      team.goal_difference ??
      team.GD ??
      (typeof gf === "number" && typeof ga === "number" ? gf - ga : "");
    const pts = team.points ?? team.PTS ?? team.points_total ?? "";

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${name}</td>
      <td>${gp}</td>
      <td>${w}</td>
      <td>${d}</td>
      <td>${l}</td>
      <td>${gf}</td>
      <td>${ga}</td>
      <td>${gd}</td>
      <td>${pts}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Render schedule table for one division
function renderSchedule(data, divisionKey, teamFilter = "") {
  const container = document.getElementById("schedule-container");
  container.innerHTML = "";

  const matches = Array.isArray(data.matches) ? data.matches : data.games || [];
  if (!matches.length) {
    container.textContent = "No matches found for this event.";
    return;
  }

  // Filter by division
  let filtered = matches.filter((m) => {
    const divName =
      m.division ||
      m.age_group ||
      m.division_name ||
      m.bracket ||
      "";
    // if we have object-based standings with names, we might align by substring
    return !divisionKey || divName.includes(divisionKey) || divisionKey.includes(divName);
  });

  // Filter by team name if user typed
  if (teamFilter) {
    const q = teamFilter.toLowerCase();
    filtered = filtered.filter((m) => {
      const home =
        m.home_team_name ||
        m.home_team ||
        m.home ||
        "";
      const away =
        m.away_team_name ||
        m.away_team ||
        m.away ||
        "";
      return home.toLowerCase().includes(q) || away.toLowerCase().includes(q);
    });
  }

  if (!filtered.length) {
    container.textContent = "No matches match the current filters.";
    return;
  }

  const table = document.createElement("table");
  table.className = "standings-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Date</th>
      <th>Time</th>
      <th>Field</th>
      <th>Home</th>
      <th></th>
      <th>Away</th>
      <th>Status / Score</th>
      <th>Stage</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  filtered.forEach((m) => {
    const date = m.date || m.match_date || "";
    const time = m.time || m.match_time || "";
    const field = m.field || m.field_name || "";
    const home =
      m.home_team_name ||
      m.home_team ||
      m.home ||
      "";
    const away =
      m.away_team_name ||
      m.away_team ||
      m.away ||
      "";
    const status =
      m.status ||
      m.result ||
      "";
    const score =
      m.score ||
      m.full_time_score ||
      "";
    const stage =
      m.stage ||
      m.round ||
      "";

    const displayStatus = [status, score].filter(Boolean).join(" • ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${time}</td>
      <td>${field}</td>
      <td>${home}</td>
      <td>vs</td>
      <td>${away}</td>
      <td>${displayStatus}</td>
      <td>${stage}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}
