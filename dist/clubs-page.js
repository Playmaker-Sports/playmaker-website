var clubsPageState = {
  allMatches: [],
  allStandings: {},
  allTeams: [],
  clubs: [],
  slug: ""
};

document.addEventListener("DOMContentLoaded", async function () {
  clubsPageState.slug = getParam("slug");
  var clubId = getParam("club");
  var teamId = getParam("team");
  var view = getParam("view");

  if (!clubsPageState.slug) {
    document.getElementById("page-title").textContent = "No event specified";
    return;
  }

  pageUtils.setBackLink("back-link", clubsPageState.slug + ".html");

  try {
    var loaded = await pageUtils.loadEventBySlug(clubsPageState.slug);
    var event = loaded.event;

    document.getElementById("page-title").textContent = event.eventName + " — Clubs & Teams";
    document.title = "Clubs & Teams — " + event.eventName + " | Playmaker Sports";

    if (event.scheduleDisabled && !event.archived) {
      document.getElementById("clubs-grid").innerHTML = pageUtils.renderStateMessage("Data will be available closer to the event.");
      return;
    }

    var data = await fetchEventData(event);
    clubsPageState.clubs = extractClubs(data).sort(function (a, b) { return a.name.localeCompare(b.name); });
    clubsPageState.allTeams = extractTeams(data).sort(function (a, b) { return a.name.localeCompare(b.name); });
    clubsPageState.allMatches = data.matches || data.games || [];
    clubsPageState.allStandings = data.standings || {};

    pageUtils.populateAgeFilter("teams-age-filter", clubsPageState.allTeams, "All Age Groups");
    document.getElementById("ct-toggle").style.display = "";

    if (clubId) {
      showClubDetail(clubId);
    } else if (teamId) {
      showClubTeamDetail(teamId);
    } else {
      renderClubsList(clubsPageState.clubs);
      renderClubTeamsList(clubsPageState.allTeams);
      if (view === "teams") switchClubView("teams");
    }
  } catch (error) {
    document.getElementById("clubs-grid").innerHTML = pageUtils.renderStateMessage("Failed to load data: " + error.message, "error");
  }
});

document.getElementById("ct-view-clubs").addEventListener("click", function () { switchClubView("clubs"); });
document.getElementById("ct-view-teams").addEventListener("click", function () { switchClubView("teams"); });
document.getElementById("clubs-search").addEventListener("input", function () {
  var query = this.value.toLowerCase();
  var filtered = query
    ? clubsPageState.clubs.filter(function (club) { return club.name.toLowerCase().includes(query); })
    : clubsPageState.clubs;
  renderClubsList(filtered);
});
document.getElementById("teams-search").addEventListener("input", applyClubTeamFilters);
document.getElementById("teams-age-filter").addEventListener("change", applyClubTeamFilters);

function switchClubView(view) {
  document.getElementById("club-detail-view").style.display = "none";
  document.getElementById("team-detail-view").style.display = "none";

  if (view === "clubs") {
    document.getElementById("clubs-list-view").style.display = "";
    document.getElementById("teams-list-view").style.display = "none";
    document.getElementById("ct-view-clubs").className = "btn btn-primary btn-sm";
    document.getElementById("ct-view-teams").className = "btn btn-ghost btn-sm";
  } else {
    document.getElementById("clubs-list-view").style.display = "none";
    document.getElementById("teams-list-view").style.display = "";
    document.getElementById("ct-view-teams").className = "btn btn-primary btn-sm";
    document.getElementById("ct-view-clubs").className = "btn btn-ghost btn-sm";
  }
}

function applyClubTeamFilters() {
  var query = document.getElementById("teams-search").value.toLowerCase();
  var age = document.getElementById("teams-age-filter").value;
  var filtered = clubsPageState.allTeams.filter(function (team) {
    if (age && team.age !== age) return false;
    if (query && !team.name.toLowerCase().includes(query) && !(team.club || "").toLowerCase().includes(query)) return false;
    return true;
  });
  renderClubTeamsList(filtered);
}

function renderClubsList(clubs) {
  var grid = document.getElementById("clubs-grid");
  document.getElementById("page-lead").textContent = clubs.length + " clubs \u2022 " + clubsPageState.allTeams.length + " teams";

  if (!clubs.length) {
    grid.innerHTML = pageUtils.renderStateMessage("No clubs found.");
    return;
  }

  grid.innerHTML = clubs.map(function (club) {
    var teamAges = club.teams
      ? Array.from(new Set(club.teams.map(function (team) { return team.age; }).filter(Boolean))).sort().slice(0, 4).join(", ")
      : "";
    var teamCount = club.teams ? club.teams.length : 0;
    var resolvedClubId = club.id || encodeURIComponent(club.name);

    return '<a class="club-card" href="clubs.html?slug=' + clubsPageState.slug + "&club=" + resolvedClubId + '">' +
      '<div class="club-logo">' +
        (club.logoUrl ? '<img src="' + club.logoUrl + '" alt="" loading="lazy" />' : "") +
      "</div>" +
      '<div class="club-info">' +
        '<div class="club-name">' + club.name + "</div>" +
        '<div class="club-meta">' + teamCount + " team" + (teamCount !== 1 ? "s" : "") + (teamAges ? ": " + teamAges : "") + "</div>" +
        '<div class="club-stats">' + (club.totalPoints || 0) + " pts \u2022 " + (club.ppg || 0) + " PPG \u2022 " + (club.winPercentage || 0) + "% win rate</div>" +
      "</div>" +
    "</a>";
  }).join("");
}

function renderClubTeamsList(teams) {
  var grid = document.getElementById("teams-grid");
  if (!teams.length) {
    grid.innerHTML = pageUtils.renderStateMessage("No teams found.");
    return;
  }

  grid.innerHTML = teamDirectory.renderTeamCards(teams, {
    hrefBuilder: function (team) {
      return "clubs.html?slug=" + clubsPageState.slug + "&team=" + team.id;
    },
    hideClubInMeta: true
  });
}

function showClubDetail(clubId) {
  var club = clubsPageState.clubs.find(function (entry) {
    return (entry.id || entry.name) === clubId || encodeURIComponent(entry.name) === clubId;
  });
  if (!club) {
    document.getElementById("page-title").textContent = "Club not found";
    return;
  }

  document.getElementById("ct-toggle").style.display = "none";
  document.getElementById("clubs-list-view").style.display = "none";
  document.getElementById("teams-list-view").style.display = "none";
  document.getElementById("club-detail-view").style.display = "";
  document.getElementById("page-title").textContent = club.name;
  document.getElementById("page-lead").textContent = "";
  pageUtils.setBackLink("back-link", "clubs.html?slug=" + clubsPageState.slug, "&larr; Back to clubs & teams");

  document.getElementById("club-detail-header").innerHTML =
    '<div class="team-detail-logo">' +
      (club.logoUrl ? '<img src="' + club.logoUrl + '" alt="" />' : "") +
    "</div>" +
    "<div>" +
      '<div class="team-detail-name">' + club.name + "</div>" +
      '<div class="team-detail-meta">' +
        (club.teams ? club.teams.length : 0) + " teams \u2022 " +
        (club.totalPoints || 0) + " total pts \u2022 " +
        (club.ppg || 0) + " PPG \u2022 " +
        (club.winPercentage || 0) + "% win rate" +
      "</div>" +
    "</div>";

  var teams = (club.teams || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  document.getElementById("club-teams-title").textContent = "Teams (" + teams.length + ")";
  document.getElementById("club-teams-grid").innerHTML = teamDirectory.renderTeamCards(teams, {
    hrefBuilder: function (team) {
      return "clubs.html?slug=" + clubsPageState.slug + "&team=" + team.id;
    },
    secondaryLine: function (team) {
      return [team.gender, team.age, team.bracket].filter(Boolean).join(" \u2022 ");
    },
    hideClubInMeta: true
  });
}

function showClubTeamDetail(teamId) {
  var team = clubsPageState.allTeams.find(function (entry) { return entry.id === teamId; });
  if (!team) {
    document.getElementById("page-title").textContent = "Team not found";
    return;
  }

  document.getElementById("ct-toggle").style.display = "none";
  document.getElementById("clubs-list-view").style.display = "none";
  document.getElementById("teams-list-view").style.display = "none";
  document.getElementById("team-detail-view").style.display = "";
  document.getElementById("page-title").textContent = team.name;
  document.getElementById("page-lead").textContent = "";
  pageUtils.setBackLink("back-link", "clubs.html?slug=" + clubsPageState.slug + "&view=teams", "&larr; Back to clubs & teams");

  teamDirectory.renderTeamHeader("team-header", team);
  teamDirectory.renderTeamRecord("team-record", team);
  teamDirectory.renderTeamStandings("team-standings-container", team, clubsPageState.allTeams, clubsPageState.allStandings);
  teamDirectory.renderTeamMatches("team-matches-container", team, clubsPageState.allMatches);
}
