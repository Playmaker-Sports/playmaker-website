(function () {
  var esc = pageUtils.esc;
  var safeUrl = pageUtils.safeUrl;

  function buildTeamMeta(team, includeClub) {
    var parts = [];
    if (includeClub && team.club) parts.push(team.club);
    if (team.gender) parts.push(team.gender);
    if (team.age) parts.push(team.age);
    if (team.bracket) parts.push(team.bracket);
    return parts;
  }

  function logoImg(url, lazy) {
    var src = safeUrl(url);
    return src ? '<img src="' + src + '" alt=""' + (lazy ? ' loading="lazy"' : "") + " />" : "";
  }

  function renderTeamCards(teams, options) {
    return teams.map(function (team) {
      var secondaryLine = options.secondaryLine ? options.secondaryLine(team) : (team.club || "");
      var metaLine = buildTeamMeta(team, !options.hideClubInMeta).join(" • ");

      return '<div class="team-card">' +
        '<a href="' + esc(options.hrefBuilder(team)) + '">' +
          '<div class="team-logo">' + logoImg(team.logoUrl, true) + "</div>" +
          '<div class="team-info">' +
            '<div class="team-name">' + esc(team.name) + "</div>" +
            '<div class="team-club">' + esc(secondaryLine) + "</div>" +
            '<div class="team-age">' + esc(metaLine) + "</div>" +
            '<div class="team-stats">' + team.mp + "MP • " + team.w + "W-" + team.l + "L-" + team.d + "D • " + team.pts + " pts</div>" +
          "</div>" +
        "</a>" +
      "</div>";
    }).join("");
  }

  function renderTeamHeader(targetId, team) {
    var el = document.getElementById(targetId);
    if (!el) return;

    el.innerHTML =
      '<div class="team-detail-logo">' + logoImg(team.logoUrl, false) + "</div>" +
      "<div>" +
        '<div class="team-detail-name">' + esc(team.name) + "</div>" +
        '<div class="team-detail-meta">' + esc(buildTeamMeta(team, true).join(" • ")) + "</div>" +
      "</div>";
  }

  function renderTeamRecord(targetId, team) {
    var el = document.getElementById(targetId);
    if (!el) return;

    function stat(value, label) {
      return '<div class="record-stat"><div class="record-stat-value">' + esc(value) + '</div><div class="record-stat-label">' + label + "</div></div>";
    }
    el.innerHTML = '<div class="record-box">' +
      stat(team.w, "Wins") + stat(team.l, "Losses") + stat(team.d, "Draws") + stat(team.pts, "Points") +
      stat(team.gf + "-" + team.ga, "GF-GA") +
      "</div>";
  }

  // One standings table (teams already in official rank order).
  function renderStandingsTable(teams, highlightTeamId) {
    var rows = teams.map(function (row, index) {
      var style = row.id === highlightTeamId ? ' style="background:var(--accent-soft);"' : "";
      return "<tr" + style + ">" +
        "<td>" + (row.rank || index + 1) + "</td>" +
        "<td>" + esc(row.name) + "</td>" +
        "<td>" + row.mp + "</td><td>" + row.w + "</td><td>" + row.d + "</td><td>" + row.l + "</td>" +
        "<td>" + row.gf + "</td><td>" + row.ga + "</td><td>" + row.gd + "</td><td>" + row.pts + "</td>" +
      "</tr>";
    }).join("");
    return '<table class="standings-table"><thead><tr>' +
      "<th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function renderTeamStandings(targetId, team, allTeams) {
    var el = document.getElementById(targetId);
    if (!el) return;

    var table = PlaymakerData.standingsTables(allTeams).find(function (t) { return t.key === team.standingsKey; });
    if (!table || !team.bracket) {
      el.innerHTML = pageUtils.renderStateMessage("No bracket standings available.");
      return;
    }
    el.innerHTML = renderStandingsTable(table.teams, team.id);
  }

  // Match rows for any list of matches (used by team pages and the schedule).
  function renderMatchCards(matches) {
    return matches.map(function (match) {
      var score = formatScore(match);
      var stage = match.type === "Playoffs" ? (match.stage || "Playoffs") : "";
      var status = match.status ? " • " + match.status : "";
      return '<div class="match-card">' +
        '<div class="match-team"><div class="match-team-name">' + esc(match.homeTeam || "TBD") + "</div></div>" +
        '<div class="match-center">' +
          '<div class="match-score' + (score ? " score-final" : "") + '">' + esc(score || "vs") + "</div>" +
          (stage ? '<div class="match-time">' + esc(stage) + "</div>" : "") +
        "</div>" +
        '<div class="match-team match-team-away"><div class="match-team-name">' + esc(match.awayTeam || "TBD") + "</div></div>" +
        '<div style="grid-column:1/-1;" class="match-meta">' +
          esc(formatMatchWhen(match) + (match.location ? " • " + match.location : "") + status) +
        "</div>" +
      "</div>";
    }).join("");
  }

  function renderTeamMatches(targetId, team, allMatches) {
    var el = document.getElementById(targetId);
    if (!el) return;

    var matches = PlaymakerData.teamMatches(team, allMatches);
    el.innerHTML = matches.length ? renderMatchCards(matches) : pageUtils.renderStateMessage("No matches found for this team.");
  }

  window.teamDirectory = {
    renderMatchCards: renderMatchCards,
    renderStandingsTable: renderStandingsTable,
    renderTeamCards: renderTeamCards,
    renderTeamHeader: renderTeamHeader,
    renderTeamMatches: renderTeamMatches,
    renderTeamRecord: renderTeamRecord,
    renderTeamStandings: renderTeamStandings
  };
})();
