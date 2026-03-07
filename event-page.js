// event-page.js — Shared logic for event pages (teams, schedule, standings)
// Requires site.js to be loaded first.

document.addEventListener("DOMContentLoaded", async () => {
  const slug = document.body.getAttribute("data-event-slug");
  if (!slug) return;

  try {
    const config = await fetchConfig();
    const ev = getEventBySlug(config, slug);
    if (!ev) {
      console.error("Event not found for slug:", slug);
      return;
    }

    const theme = getTheme(config, ev.theme);

    populateHero(ev, config);
    populateDetails(ev);
    populateEventNav(ev, slug);
    populateFieldMap(ev);
    populatePreviousResults(ev, config);
    await loadEventData(ev, config, theme);
  } catch (err) {
    console.error("Error loading event page:", err);
    showError("data-container", "Failed to load event data. Please try again later. Error: " + err.message);
  }
});

function populateHero(ev, config) {
  const titleEl = document.querySelector(".hero-simple-title");
  if (titleEl) titleEl.textContent = ev.eventName;

  const subtextEl = document.querySelector(".hero-simple-subtext");
  if (subtextEl) {
    const parts = [];
    if (ev.dateText) parts.push(ev.dateText);
    if (ev.locationText) parts.push(getFullAddress(ev.locationText));
    subtextEl.textContent = parts.join(" \u2022 ");
  }

  // Insert event logo
  const logoEl = document.getElementById("event-hero-logo");
  if (logoEl && ev.logoPath) {
    logoEl.innerHTML = '<img src="' + staticUrl(ev.logoPath) + '" alt="' + ev.eventName + '" />';
  }

  // Update hero buttons
  const btnsContainer = document.querySelector(".event-hero-info .hero-buttons");
  if (btnsContainer) {
    btnsContainer.innerHTML = "";

    if (ev.registrationUrl && !ev.archived) {
      const a = document.createElement("a");
      a.className = "btn btn-primary";
      a.href = ev.registrationUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Register Now";
      btnsContainer.appendChild(a);
    }

    // Schedule & Standings is already in event-nav, so no duplicate button here
  }
}

function populatePreviousResults(ev, config) {
  if (!ev.previousEvents || !ev.previousEvents.length) return;

  const section = document.getElementById("previous-results-section");
  const container = document.getElementById("previous-results");
  if (!section || !container) return;

  section.style.display = "";
  container.innerHTML = "";

  ev.previousEvents.forEach(function (prev) {
    const a = document.createElement("a");
    a.className = "prev-result-btn";
    a.href = "results.html?event=" + prev.eventId;
    a.textContent = prev.label;
    container.appendChild(a);
  });
}

function populateDetails(ev) {
  const rows = document.querySelectorAll(".event-info-row");
  rows.forEach((row) => {
    const label = row.querySelector(".info-label");
    if (!label) return;
    const valueEl = row.querySelector("span:last-child");
    if (!valueEl || valueEl === label) return;

    const labelText = label.textContent.trim().toLowerCase();
    if (labelText.startsWith("location")) {
      valueEl.textContent = getFullAddress(ev.locationText);
    } else if (labelText.startsWith("date")) {
      valueEl.textContent = ev.dateText || "";
    } else if (labelText.startsWith("age")) {
      valueEl.textContent = "Boys & Girls, U6\u2013U19";
    }
  });
}

function populateEventNav(ev, slug) {
  const navEl = document.getElementById("event-nav");
  if (!navEl) return;

  const hasData = ev.archived || !ev.scheduleDisabled;

  const links = [
    { label: "Schedule & Standings", href: "results.html?slug=" + slug, needsData: true },
    { label: "Clubs & Teams", href: "clubs.html?slug=" + slug, needsData: true },
    { label: "Rules", href: "rules.html?slug=" + slug, needsData: false },
  ];

  navEl.innerHTML = "";
  links.forEach(function (link) {
    if (link.needsData && !hasData) {
      // Show as disabled button with "Coming Soon" tooltip
      var span = document.createElement("span");
      span.className = "event-nav-link disabled";
      span.textContent = link.label;
      span.title = "Coming Soon";
      navEl.appendChild(span);
    } else {
      var a = document.createElement("a");
      a.className = "event-nav-link";
      a.href = link.href;
      a.textContent = link.label;
      navEl.appendChild(a);
    }
  });
}

function populateFieldMap(ev) {
  const fieldmapImg = document.querySelector(".fieldmap-img");
  if (fieldmapImg && ev.fieldMapPath && !ev.fieldMapDisabled) {
    fieldmapImg.src = staticUrl(ev.fieldMapPath);
    fieldmapImg.alt = ev.eventName + " Field Map";
  }

  // Hide field map section if disabled
  const fieldmapCard = document.querySelector(".fieldmap-card");
  if (fieldmapCard && ev.fieldMapDisabled) {
    fieldmapCard.style.display = "none";
  }
}

async function loadEventData(ev, config, theme) {
  const container = document.getElementById("data-container");
  if (!container) return;

  // If schedule is disabled and event isn't archived, show coming soon
  if (ev.scheduleDisabled && !ev.archived) {
    container.innerHTML =
      '<div class="data-empty">' +
        '<p>Schedule, teams, and standings will be available closer to the event.</p>' +
        '<p style="margin-top:8px;color:var(--accent);">Check back soon!</p>' +
      '</div>';
    return;
  }

  container.innerHTML = '<div class="data-loading">Loading event data...</div>';

  let data;
  try {
    if (ev.archived && ev.archivedDataFile) {
      const remoteUrl = staticUrl("/archived/" + ev.archivedDataFile + ".json");
      let res;
      try {
        res = await fetch(remoteUrl);
      } catch (e) {
        console.warn("Remote archived fetch failed, trying local:", e.message);
      }
      if (!res || !res.ok) {
        res = await fetch("archived/" + ev.archivedDataFile + ".json");
      }
      if (!res.ok) throw new Error("HTTP " + res.status + " fetching archived data");
      data = await res.json();
    } else {
      const eventId = ev.resultsEventId || ev.eventId;
      const url = API_BASE + "/api/events/" + eventId + "/data";
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status + " fetching live data from " + url);
      data = await res.json();
    }
  } catch (err) {
    showError("data-container", "Could not load event data. " + err.message);
    return;
  }

  container.innerHTML = "";
  renderClubsPreview(container, data, document.body.getAttribute("data-event-slug"));
}

// ─── Clubs Logo Wall (shown on event page) ───

function renderClubsPreview(container, data, slug) {
  var clubs = extractClubs(data);
  if (!clubs.length) return;

  // Filter to clubs that have a logo, sort alphabetically
  var clubsWithLogos = clubs.filter(function (c) { return c.logoUrl; });
  clubsWithLogos.sort(function (a, b) { return a.name.localeCompare(b.name); });

  if (!clubsWithLogos.length) return;
  var displayClubs = clubsWithLogos;

  // Get theme for background
  var themeAttr = document.body.getAttribute("data-event-slug");
  var section = document.createElement("div");
  section.className = "clubs-wall-section";
  section.setAttribute("data-theme", themeAttr || "");
  section.innerHTML =
    '<h2 class="clubs-wall-title">Participating Clubs</h2>' +
    '<div class="clubs-wall-grid" id="clubs-wall-grid"></div>';

  container.appendChild(section);

  var grid = document.getElementById("clubs-wall-grid");
  grid.innerHTML = displayClubs.map(function (c) {
    return '<div class="clubs-wall-logo" title="' + c.name + '">' +
      '<img src="' + c.logoUrl + '" alt="' + c.name + '" loading="lazy" />' +
    '</div>';
  }).join("");
}

// ─── Teams Section ───

function renderTeamsSection(container, data, theme) {
  // Collect all teams from data
  let teams = [];

  if (data.clubs && Array.isArray(data.clubs)) {
    // Archived format: clubs array with nested teams
    for (const club of data.clubs) {
      if (club.teams) {
        for (const t of club.teams) {
          teams.push({
            name: t.name,
            club: t.club || club.name,
            logoUrl: t.logoUrl || club.logoUrl,
            age: t.age,
            gender: t.gender,
            bracket: t.bracket,
          });
        }
      }
    }
  } else if (data.teams && Array.isArray(data.teams)) {
    // Flat teams array
    teams = data.teams.map((t) => ({
      name: t.name || t.team_name,
      club: t.club || "",
      logoUrl: t.logoUrl || "",
      age: t.age || "",
      gender: t.gender || "",
      bracket: t.bracket || "",
    }));
  }

  if (!teams.length) return;

  // Get unique age groups for filter
  const ageGroups = [...new Set(teams.map((t) => t.age).filter(Boolean))].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });

  const section = document.createElement("div");
  section.className = "data-section";
  section.innerHTML =
    '<div class="data-section-header">' +
      '<div>' +
        '<span class="data-section-title">Teams</span> ' +
        '<span class="data-section-count" id="teams-count">(' + teams.length + ' teams)</span>' +
      '</div>' +
    '</div>' +
    '<div class="filter-bar">' +
      '<label>Filter by age group:</label>' +
      '<select id="teams-age-filter">' +
        '<option value="">All Age Groups</option>' +
        ageGroups.map((ag) => '<option value="' + ag + '">' + ag + '</option>').join("") +
      '</select>' +
    '</div>' +
    '<div class="teams-grid" id="teams-grid"></div>';

  container.appendChild(section);

  function renderTeams(filter) {
    const grid = document.getElementById("teams-grid");
    const countEl = document.getElementById("teams-count");
    const filtered = filter ? teams.filter((t) => t.age === filter) : teams;
    countEl.textContent = "(" + filtered.length + " teams)";

    grid.innerHTML = filtered.map((t) =>
      '<div class="team-card">' +
        '<div class="team-logo">' +
          (t.logoUrl ? '<img src="' + t.logoUrl + '" alt="" loading="lazy" />' : '') +
        '</div>' +
        '<div class="team-info">' +
          '<div class="team-name">' + (t.name || "") + '</div>' +
          '<div class="team-club">' + (t.club || "") + '</div>' +
          '<div class="team-age">' + [t.age, t.gender, t.bracket].filter(Boolean).join(" \u2022 ") + '</div>' +
        '</div>' +
      '</div>'
    ).join("");
  }

  renderTeams("");
  document.getElementById("teams-age-filter").addEventListener("change", function () {
    renderTeams(this.value);
  });
}

// ─── Schedule & Standings Section ───

function renderScheduleStandingsSection(container, data, theme) {
  // Check if we have standings or matches
  const hasStandings = data.standings && (
    Array.isArray(data.standings) ? data.standings.length > 0 :
    typeof data.standings === "object" ? Object.keys(data.standings).length > 0 : false
  );
  const hasMatches = (Array.isArray(data.matches) && data.matches.length > 0) ||
                     (Array.isArray(data.games) && data.games.length > 0);

  if (!hasStandings && !hasMatches) return;

  const section = document.createElement("div");
  section.className = "data-section";

  // Detect available genders from data
  const genders = detectGenders(data);
  const showGenderToggle = genders.size > 1;

  // Build all division options (unfiltered)
  const allDivisionOptions = buildDivisionOptions(data);

  section.innerHTML =
    '<div class="data-section-header">' +
      '<span class="data-section-title">Schedule & Standings</span>' +
      '<div class="view-toggle">' +
        '<button class="btn btn-primary btn-sm" id="ep-view-standings">Standings</button>' +
        '<button class="btn btn-ghost btn-sm" id="ep-view-schedule">Schedule</button>' +
      '</div>' +
    '</div>' +
    (showGenderToggle ?
      '<div class="gender-toggle" id="ep-gender-toggle">' +
        '<button class="gender-toggle-btn active" data-gender="all">All</button>' +
        '<button class="gender-toggle-btn" data-gender="Boys">Boys</button>' +
        '<button class="gender-toggle-btn" data-gender="Girls">Girls</button>' +
      '</div>' : '') +
    '<div class="filter-bar">' +
      '<label>Division:</label>' +
      '<select id="ep-division-select">' +
        allDivisionOptions.map((d) => '<option value="' + d.key + '">' + d.name + '</option>').join("") +
      '</select>' +
      '<input type="text" id="ep-team-filter" placeholder="Filter by team name..." style="display:none;" />' +
    '</div>' +
    '<div id="ep-standings-section"><div id="ep-standings-container"></div></div>' +
    '<div id="ep-schedule-section" style="display:none;"><div id="ep-schedule-container"></div></div>';

  container.appendChild(section);

  let currentView = "standings";
  let currentGender = "all";
  let currentDiv = allDivisionOptions.length > 0 ? allDivisionOptions[0].key : "";

  const standingsBtn = document.getElementById("ep-view-standings");
  const scheduleBtn = document.getElementById("ep-view-schedule");
  const divSelect = document.getElementById("ep-division-select");
  const teamFilter = document.getElementById("ep-team-filter");
  const standingsSection = document.getElementById("ep-standings-section");
  const scheduleSection = document.getElementById("ep-schedule-section");

  function updateDivisionDropdown() {
    const filtered = currentGender === "all"
      ? allDivisionOptions
      : allDivisionOptions.filter(function (d) { return divisionMatchesGender(data, d.key, currentGender); });

    divSelect.innerHTML = filtered.map(function (d) {
      return '<option value="' + d.key + '">' + d.name + '</option>';
    }).join("");

    // Select first available division
    currentDiv = filtered.length > 0 ? filtered[0].key : "";
  }

  function renderCurrent() {
    if (currentView === "standings") {
      epRenderStandings(data, currentDiv, currentGender);
    } else {
      epRenderSchedule(data, currentDiv, teamFilter.value.trim(), currentGender);
    }
  }

  function switchView(view) {
    currentView = view;
    if (view === "standings") {
      standingsSection.style.display = "";
      scheduleSection.style.display = "none";
      standingsBtn.className = "btn btn-primary btn-sm";
      scheduleBtn.className = "btn btn-ghost btn-sm";
      teamFilter.style.display = "none";
    } else {
      standingsSection.style.display = "none";
      scheduleSection.style.display = "";
      scheduleBtn.className = "btn btn-primary btn-sm";
      standingsBtn.className = "btn btn-ghost btn-sm";
      teamFilter.style.display = "";
    }
    renderCurrent();
  }

  standingsBtn.addEventListener("click", () => switchView("standings"));
  scheduleBtn.addEventListener("click", () => switchView("schedule"));

  divSelect.addEventListener("change", () => {
    currentDiv = divSelect.value;
    renderCurrent();
  });

  teamFilter.addEventListener("input", () => {
    if (currentView === "schedule") {
      epRenderSchedule(data, currentDiv, teamFilter.value.trim(), currentGender);
    }
  });

  // Gender toggle
  if (showGenderToggle) {
    const genderToggle = document.getElementById("ep-gender-toggle");
    genderToggle.addEventListener("click", function (e) {
      const btn = e.target.closest(".gender-toggle-btn");
      if (!btn) return;
      currentGender = btn.getAttribute("data-gender");
      genderToggle.querySelectorAll(".gender-toggle-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      updateDivisionDropdown();
      renderCurrent();
    });
  }

  // Initial render
  if (hasStandings) {
    switchView("standings");
  } else {
    switchView("schedule");
  }
}

function detectGenders(data) {
  const genders = new Set();
  // Primary: use flat teams array (always has gender)
  if (data.teams && Array.isArray(data.teams)) {
    data.teams.forEach(function (t) { if (t.gender) genders.add(t.gender); });
  }
  // Fallback: check matches
  if (genders.size === 0) {
    (data.matches || data.games || []).forEach(function (m) {
      if (m.gender) genders.add(m.gender);
    });
  }
  return genders;
}

function divisionMatchesGender(data, divKey, gender) {
  // divKey format is "age|gender|bracket" — just check the gender part
  var parts = divKey.split("|");
  return parts.length >= 2 && parts[1] === gender;
}

function buildDivisionOptions(data) {
  var options = [];
  var seen = new Set();

  // Build from flat teams array (has age, gender, bracket on every team)
  if (data.teams && Array.isArray(data.teams)) {
    data.teams.forEach(function (t) {
      if (!t.age || !t.gender || !t.bracket) return;
      var key = t.age + "|" + t.gender + "|" + t.bracket;
      if (seen.has(key)) return;
      seen.add(key);
      options.push({
        key: key,
        name: t.age + " " + t.gender + " - " + t.bracket,
        age: t.age,
        gender: t.gender,
        bracket: t.bracket,
      });
    });
  }

  // Fallback: build from matches
  if (!options.length) {
    (data.matches || data.games || []).forEach(function (m) {
      var age = m.age || "";
      var gender = m.gender || "";
      var bracket = m.bracket || m.division || "";
      if (!age && !bracket) return;
      var key = age + "|" + gender + "|" + bracket;
      if (seen.has(key)) return;
      seen.add(key);
      options.push({
        key: key,
        name: [age, gender, bracket].filter(Boolean).join(" - "),
        age: age,
        gender: gender,
        bracket: bracket,
      });
    });
  }

  // Sort by age number, then gender, then bracket
  options.sort(function (a, b) {
    var na = parseInt((a.age || "").replace(/\D/g, ""), 10) || 0;
    var nb = parseInt((b.age || "").replace(/\D/g, ""), 10) || 0;
    if (na !== nb) return na - nb;
    if (a.gender !== b.gender) return (a.gender || "").localeCompare(b.gender || "");
    return (a.bracket || "").localeCompare(b.bracket || "");
  });

  return options;
}

function epRenderStandings(data, divisionKey, currentGender) {
  var container = document.getElementById("ep-standings-container");
  container.innerHTML = "";

  // Parse divisionKey: "age|gender|bracket"
  var parts = divisionKey.split("|");
  var filterAge = parts[0] || "";
  var filterGender = parts[1] || "";
  var filterBracket = parts[2] || "";

  // Filter teams from the flat teams array
  var teams = [];
  if (data.teams && Array.isArray(data.teams)) {
    teams = data.teams.filter(function (t) {
      return t.age === filterAge && t.gender === filterGender && t.bracket === filterBracket;
    });
  }

  // Fallback: try standings object with old key format
  if (!teams.length && data.standings && typeof data.standings === "object" && !Array.isArray(data.standings)) {
    var oldKey = filterAge + "_" + filterBracket;
    // Try exact match first, then partial
    for (var key in data.standings) {
      if (key === oldKey || key.replace(/ /g, "_") === oldKey.replace(/ /g, "_")) {
        teams = data.standings[key].filter(function (t) {
          return !currentGender || currentGender === "all" || t.gender === currentGender;
        });
        break;
      }
    }
  }

  // Sort by points descending
  teams.sort(function (a, b) {
    var ptsA = a.pts || a.points || 0;
    var ptsB = b.pts || b.points || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;
    var gdA = a.gd || 0;
    var gdB = b.gd || 0;
    return gdB - gdA;
  });

  if (!teams.length) {
    container.innerHTML = '<div class="data-empty">No standings available for this division.</div>';
    return;
  }

  // Group by group (e.g. "Bracket A", "Bracket B")
  var groups = {};
  teams.forEach(function (t) {
    var g = t.group || "Standings";
    if (!groups[g]) groups[g] = [];
    groups[g].push(t);
  });

  Object.keys(groups).forEach(function (groupName) {
    var groupTeams = groups[groupName];

    if (Object.keys(groups).length > 1) {
      var h3 = document.createElement("h3");
      h3.className = "standings-group-title";
      h3.textContent = groupName;
      container.appendChild(h3);
    }

    var table = document.createElement("table");
    table.className = "standings-table";
    table.innerHTML =
      '<thead><tr>' +
        '<th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>' +
      '</tr></thead>';

    var tbody = document.createElement("tbody");
    groupTeams.forEach(function (t, i) {
      var name = t.name || t.team_name || t.team || "Team";
      var gp = t.mp != null ? t.mp : (t.played != null ? t.played : "");
      var w = t.w != null ? t.w : "";
      var d = t.d != null ? t.d : "";
      var l = t.l != null ? t.l : "";
      var gf = t.gf != null ? t.gf : "";
      var ga = t.ga != null ? t.ga : "";
      var gd = t.gd != null ? t.gd : (typeof gf === "number" && typeof ga === "number" ? gf - ga : "");
      var pts = t.pts != null ? t.pts : "";

      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' + (i + 1) + '</td>' +
        '<td>' + name + '</td>' +
        '<td>' + gp + '</td><td>' + w + '</td><td>' + d + '</td><td>' + l + '</td>' +
        '<td>' + gf + '</td><td>' + ga + '</td><td>' + gd + '</td><td>' + pts + '</td>';
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  });
}

function epRenderSchedule(data, divisionKey, teamFilter, currentGender) {
  var container = document.getElementById("ep-schedule-container");
  container.innerHTML = "";

  var matches = data.matches || data.games || [];
  if (!matches.length) {
    container.innerHTML = '<div class="data-empty">No matches found for this event.</div>';
    return;
  }

  // Parse divisionKey: "age|gender|bracket"
  var parts = divisionKey.split("|");
  var filterAge = parts[0] || "";
  var filterGender = parts[1] || "";
  var filterBracket = parts[2] || "";

  // Filter by age, gender, bracket
  var filtered = matches.filter(function (m) {
    var matchAge = m.age || "";
    var matchGender = m.gender || "";
    var matchBracket = m.bracket || m.division || "";
    return matchAge === filterAge && matchGender === filterGender && matchBracket === filterBracket;
  });

  // Filter by team name
  if (teamFilter) {
    const q = teamFilter.toLowerCase();
    filtered = filtered.filter((m) => {
      const home = (m.homeTeam || m.home_team_name || m.home_team || m.home || "").toLowerCase();
      const away = (m.awayTeam || m.away_team_name || m.away_team || m.away || "").toLowerCase();
      return home.includes(q) || away.includes(q);
    });
  }

  if (!filtered.length) {
    container.innerHTML = '<div class="data-empty">No matches match the current filters.</div>';
    return;
  }

  const table = document.createElement("table");
  table.className = "standings-table";
  table.innerHTML =
    '<thead><tr>' +
      '<th>Time</th><th>Field</th><th>Home</th><th></th><th>Away</th><th>Score</th><th>Stage</th>' +
    '</tr></thead>';

  const tbody = document.createElement("tbody");
  filtered.forEach((m) => {
    const time = m.time || m.match_time || "";
    const field = m.location || m.field || m.field_name || "";
    const home = m.homeTeam || m.home_team_name || m.home_team || m.home || "";
    const away = m.awayTeam || m.away_team_name || m.away_team || m.away || "";
    const stage = m.stage || m.type || m.round || "";

    let scoreDisplay = "";
    if (m.homeScore != null && m.awayScore != null) {
      scoreDisplay = m.homeScore + " - " + m.awayScore;
    } else if (m.score || m.full_time_score) {
      scoreDisplay = m.score || m.full_time_score;
    } else if (m.status) {
      scoreDisplay = m.status;
    }

    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + time + '</td>' +
      '<td>' + field + '</td>' +
      '<td>' + home + '</td>' +
      '<td style="color:var(--muted)">vs</td>' +
      '<td>' + away + '</td>' +
      '<td' + (scoreDisplay.includes("-") ? ' class="score-final"' : '') + '>' + scoreDisplay + '</td>' +
      '<td>' + stage + '</td>';
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = '<div class="data-empty" style="color:var(--danger);">' + message + '</div>';
  }
}
