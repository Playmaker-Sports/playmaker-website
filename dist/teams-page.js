var teamPageState = {
  allMatches: [],
  allStandings: {},
  allTeams: [],
  slug: ""
};

document.addEventListener("DOMContentLoaded", async function () {
  teamPageState.slug = getParam("slug");
  var teamId = getParam("team");

  if (!teamPageState.slug) {
    document.getElementById("page-title").textContent = "No event specified";
    return;
  }

  pageUtils.setBackLink("back-link", teamPageState.slug + ".html");

  try {
    var loaded = await pageUtils.loadEventBySlug(teamPageState.slug);
    var event = loaded.event;

    document.getElementById("page-title").textContent = event.eventName + " — Teams";
    document.title = "Teams — " + event.eventName + " | Playmaker Sports";

    if (event.scheduleDisabled && !event.archived) {
      document.getElementById("teams-grid").innerHTML = pageUtils.renderStateMessage("Team data will be available closer to the event.");
      return;
    }

    var data = await fetchEventData(event);
    teamPageState.allTeams = extractTeams(data).sort(function (a, b) { return a.name.localeCompare(b.name); });
    teamPageState.allMatches = data.matches || data.games || [];
    teamPageState.allStandings = data.standings || {};

    pageUtils.populateAgeFilter("teams-age-filter", teamPageState.allTeams, "All Age Groups");

    if (teamId) {
      showTeamPageDetail(teamId);
    } else {
      renderTeamsPageList(teamPageState.allTeams);
    }
  } catch (error) {
    document.getElementById("teams-grid").innerHTML = pageUtils.renderStateMessage("Failed to load teams: " + error.message, "error");
  }
});

document.getElementById("teams-search").addEventListener("input", applyTeamPageFilters);
document.getElementById("teams-age-filter").addEventListener("change", applyTeamPageFilters);

function applyTeamPageFilters() {
  var query = document.getElementById("teams-search").value.toLowerCase();
  var age = document.getElementById("teams-age-filter").value;
  var filtered = teamPageState.allTeams.filter(function (team) {
    if (age && team.age !== age) return false;
    if (query && !team.name.toLowerCase().includes(query) && !(team.club || "").toLowerCase().includes(query)) return false;
    return true;
  });
  renderTeamsPageList(filtered);
}

function renderTeamsPageList(teams) {
  var grid = document.getElementById("teams-grid");
  document.getElementById("page-lead").textContent = teams.length + " teams";

  if (!teams.length) {
    grid.innerHTML = pageUtils.renderStateMessage("No teams found.");
    return;
  }

  grid.innerHTML = teamDirectory.renderTeamCards(teams, {
    hrefBuilder: function (team) {
      return "teams.html?slug=" + teamPageState.slug + "&team=" + team.id;
    },
    hideClubInMeta: true
  });
}

function showTeamPageDetail(teamId) {
  var team = teamPageState.allTeams.find(function (entry) { return entry.id === teamId; });
  if (!team) {
    document.getElementById("page-title").textContent = "Team not found";
    return;
  }

  document.getElementById("teams-list-view").style.display = "none";
  document.getElementById("team-detail-view").style.display = "";
  document.getElementById("page-title").textContent = team.name;
  document.getElementById("page-kicker").textContent = "Team Details";
  document.getElementById("page-lead").textContent = "";
  pageUtils.setBackLink("back-link", "teams.html?slug=" + teamPageState.slug, "&larr; Back to teams");

  teamDirectory.renderTeamHeader("team-header", team);
  teamDirectory.renderTeamRecord("team-record", team);
  teamDirectory.renderTeamStandings("team-standings-container", team, teamPageState.allTeams, teamPageState.allStandings);
  teamDirectory.renderTeamMatches("team-matches-container", team, teamPageState.allMatches);
}
