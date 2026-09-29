document.addEventListener("DOMContentLoaded", async function () {
  var slug = getParam("slug");
  var eventId = getParam("event");
  var container = document.getElementById("data-container");

  if (!slug && !eventId) {
    document.getElementById("results-title").textContent = "No event specified";
    container.innerHTML = pageUtils.renderStateMessage("Please select an event from one of the event pages.");
    return;
  }

  try {
    var config = await fetchConfig();
    var event;

    if (slug) {
      event = getEventBySlug(config, slug);
      if (!event) throw new Error("Could not find event for slug: " + slug);

      pageUtils.setBackLink("back-link", slug + ".html");
      document.getElementById("page-kicker").textContent = "Schedule & Standings";
      document.title = event.eventName + " — Schedule & Standings | Playmaker Sports";
    } else {
      event = config.events[eventId];
      if (!event) throw new Error("Could not find event with ID: " + eventId);
      event = PlaymakerData.withId(event, eventId);
      document.getElementById("page-kicker").textContent = "Previous Results";
      document.title = event.eventName + " — Results | Playmaker Sports";
    }

    renderResultsHeader(event);
    await loadResultsData(event);
  } catch (error) {
    container.innerHTML = pageUtils.renderStateMessage("Failed to load data: " + error.message, "error");
  }
});

function renderResultsHeader(event) {
  if (event.logoPath) {
    document.getElementById("results-logo").src = staticUrl(event.logoPath);
    document.getElementById("results-header-row").style.display = "";
    document.getElementById("results-title-plain").style.display = "none";
    document.getElementById("results-title").textContent = event.eventName || "Results";
  } else {
    document.getElementById("results-title-plain").textContent = event.eventName || "Results";
  }

  var parts = [];
  if (event.dateText) parts.push(event.dateText);
  if (event.locationText) parts.push(event.locationText);
  document.getElementById("results-subtitle").textContent = parts.join(" • ");
}

async function loadResultsData(event) {
  var container = document.getElementById("data-container");

  if (event.scheduleDisabled && !event.archived) {
    container.innerHTML =
      '<div class="data-empty">' +
        "<p>Schedule and standings will be available closer to the event.</p>" +
        '<p style="margin-top:8px;color:var(--accent);">Check back soon!</p>' +
      "</div>";
    return;
  }

  container.innerHTML = '<div class="data-loading">Loading event data...</div>';

  try {
    var data = await fetchEventData(event);
    container.innerHTML = "";
    renderScheduleStandingsSection(container, data, !event.archived);
  } catch (error) {
    container.innerHTML = pageUtils.renderStateMessage("Could not load event data: " + error.message, "error");
  }
}

function renderScheduleStandingsSection(container, data, isLive) {
  var esc = pageUtils.esc;
  var divisions = PlaymakerData.divisions(data.teams);

  if (!divisions.length && !data.matches.length) {
    container.innerHTML = pageUtils.renderStateMessage("Results are not available for this event yet.");
    return;
  }

  var genders = Array.from(new Set(divisions.map(function (d) { return d.gender; }).filter(Boolean)));
  var updated = isLive && data.dataAsOf ? PlaymakerData.formatUpdated(data.dataAsOf) : "";

  var section = document.createElement("div");
  section.className = "data-section";
  section.innerHTML =
    '<div class="data-section-header">' +
      '<span class="data-section-title">Schedule &amp; Standings</span>' +
      '<div class="view-toggle">' +
        '<button type="button" class="btn btn-primary btn-sm" id="ep-view-standings">Standings</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="ep-view-schedule">Schedule</button>' +
      "</div>" +
    "</div>" +
    (updated ? '<p class="page-lead" id="ep-updated">Updated ' + esc(updated) + "</p>" : "") +
    (genders.length > 1 ?
      '<div class="gender-toggle" id="ep-gender-toggle">' +
        '<button type="button" class="gender-toggle-btn active" data-gender="all">All</button>' +
        genders.map(function (g) { return '<button type="button" class="gender-toggle-btn" data-gender="' + esc(g) + '">' + esc(g) + "</button>"; }).join("") +
      "</div>" : "") +
    '<div class="filter-bar">' +
      '<label for="ep-division-select">Division:</label>' +
      '<select id="ep-division-select"></select>' +
      '<input type="text" id="ep-team-filter" placeholder="Filter by team name..." style="display:none;" />' +
    "</div>" +
    '<div id="ep-standings-container"></div>' +
    '<div id="ep-schedule-container" style="display:none;"></div>';
  container.appendChild(section);

  var state = { view: "standings", gender: "all", divisionKey: "" };
  var divSelect = document.getElementById("ep-division-select");
  var teamFilter = document.getElementById("ep-team-filter");
  var standingsEl = document.getElementById("ep-standings-container");
  var scheduleEl = document.getElementById("ep-schedule-container");

  function visibleDivisions() {
    return divisions.filter(function (d) { return state.gender === "all" || d.gender === state.gender; });
  }

  function fillDivisionSelect() {
    var options = visibleDivisions();
    divSelect.innerHTML = options.map(function (d) {
      return '<option value="' + esc(d.key) + '">' + esc(d.label) + " (" + d.teamCount + ")</option>";
    }).join("");
    if (!options.some(function (d) { return d.key === state.divisionKey; })) {
      state.divisionKey = options.length ? options[0].key : "";
    }
    divSelect.value = state.divisionKey;
  }

  function currentDivision() {
    return divisions.find(function (d) { return d.key === state.divisionKey; });
  }

  function renderStandings() {
    var division = currentDivision();
    if (!division) {
      standingsEl.innerHTML = pageUtils.renderStateMessage("No standings available.");
      return;
    }
    var multiple = division.tables.length > 1;
    standingsEl.innerHTML = division.tables.map(function (table) {
      return (multiple ? '<h3 class="standings-group-title">' + esc(table.group || "Standings") + "</h3>" : "") +
        teamDirectory.renderStandingsTable(table.teams);
    }).join("");
  }

  function renderSchedule() {
    var division = currentDivision();
    var matches = division ? PlaymakerData.divisionMatches(division, data.teams, data.matches) : data.matches.slice();
    var query = teamFilter.value.trim().toLowerCase();
    if (query) {
      matches = matches.filter(function (m) {
        return m.homeTeam.toLowerCase().indexOf(query) !== -1 || m.awayTeam.toLowerCase().indexOf(query) !== -1;
      });
    }
    scheduleEl.innerHTML = matches.length
      ? teamDirectory.renderMatchCards(matches)
      : pageUtils.renderStateMessage("No matches match the current filters.");
  }

  function render() {
    var standings = state.view === "standings";
    standingsEl.style.display = standings ? "" : "none";
    scheduleEl.style.display = standings ? "none" : "";
    teamFilter.style.display = standings ? "none" : "";
    document.getElementById("ep-view-standings").className = "btn btn-" + (standings ? "primary" : "ghost") + " btn-sm";
    document.getElementById("ep-view-schedule").className = "btn btn-" + (standings ? "ghost" : "primary") + " btn-sm";
    if (standings) renderStandings(); else renderSchedule();
  }

  document.getElementById("ep-view-standings").addEventListener("click", function () { state.view = "standings"; render(); });
  document.getElementById("ep-view-schedule").addEventListener("click", function () { state.view = "schedule"; render(); });
  divSelect.addEventListener("change", function () { state.divisionKey = divSelect.value; render(); });
  teamFilter.addEventListener("input", renderSchedule);

  var genderToggle = document.getElementById("ep-gender-toggle");
  if (genderToggle) {
    genderToggle.addEventListener("click", function (e) {
      var btn = e.target.closest(".gender-toggle-btn");
      if (!btn) return;
      state.gender = btn.getAttribute("data-gender");
      genderToggle.querySelectorAll(".gender-toggle-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      fillDivisionSelect();
      render();
    });
  }

  fillDivisionSelect();
  if (!divisions.length) state.view = "schedule";
  render();
}
