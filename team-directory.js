(function () {
  function buildTeamMeta(team, includeClub) {
    var parts = [];
    if (includeClub && team.club) parts.push(team.club);
    if (team.gender) parts.push(team.gender);
    if (team.age) parts.push(team.age);
    if (team.bracket) parts.push(team.bracket);
    return parts;
  }

  function renderTeamCards(teams, options) {
    return teams.map(function (team) {
      var secondaryLine = options.secondaryLine
        ? options.secondaryLine(team)
        : (team.club || "");
      var metaLine = buildTeamMeta(team, !options.hideClubInMeta).join(" \u2022 ");

      return '<div class="team-card">' +
        '<a href="' + options.hrefBuilder(team) + '">' +
          '<div class="team-logo">' +
            (team.logoUrl ? '<img src="' + team.logoUrl + '" alt="" loading="lazy" />' : "") +
          "</div>" +
          '<div class="team-info">' +
            '<div class="team-name">' + team.name + "</div>" +
            '<div class="team-club">' + secondaryLine + "</div>" +
            '<div class="team-age">' + metaLine + "</div>" +
            '<div class="team-stats">' + (team.mp || 0) + "MP \u2022 " + (team.w || 0) + "W-" + (team.l || 0) + "L-" + (team.d || 0) + "D \u2022 " + (team.pts || 0) + " pts</div>" +
          "</div>" +
        "</a>" +
      "</div>";
    }).join("");
  }

  function renderTeamHeader(targetId, team) {
    var el = document.getElementById(targetId);
    if (!el) return;

    el.innerHTML =
      '<div class="team-detail-logo">' +
        (team.logoUrl ? '<img src="' + team.logoUrl + '" alt="" />' : "") +
      "</div>" +
      "<div>" +
        '<div class="team-detail-name">' + team.name + "</div>" +
        '<div class="team-detail-meta">' + buildTeamMeta(team, true).join(" \u2022 ") + "</div>" +
      "</div>";
  }

  function renderTeamRecord(targetId, team) {
    var el = document.getElementById(targetId);
    if (!el) return;

    el.innerHTML =
      '<div class="record-box">' +
        '<div class="record-stat"><div class="record-stat-value">' + (team.w || 0) + '</div><div class="record-stat-label">Wins</div></div>' +
        '<div class="record-stat"><div class="record-stat-value">' + (team.l || 0) + '</div><div class="record-stat-label">Losses</div></div>' +
        '<div class="record-stat"><div class="record-stat-value">' + (team.d || 0) + '</div><div class="record-stat-label">Draws</div></div>' +
        '<div class="record-stat"><div class="record-stat-value">' + (team.pts || 0) + '</div><div class="record-stat-label">Points</div></div>' +
        '<div class="record-stat"><div class="record-stat-value">' + (team.gf || 0) + "-" + (team.ga || 0) + '</div><div class="record-stat-label">GF-GA</div></div>' +
      "</div>";
  }

  function findBracketTeams(team, allTeams, allStandings) {
    var bracketTeams = [];

    if (typeof allStandings === "object" && !Array.isArray(allStandings)) {
      for (var key in allStandings) {
        var rows = allStandings[key];
        if (!Array.isArray(rows)) continue;
        var found = rows.find(function (row) {
          return row.id === team.id || row.name === team.name;
        });
        if (found) {
          bracketTeams = rows.slice();
          break;
        }
      }
    }

    if (!bracketTeams.length) {
      bracketTeams = allTeams.filter(function (candidate) {
        return candidate.bracket === team.bracket && candidate.age === team.age && candidate.gender === team.gender;
      });
      bracketTeams.sort(function (a, b) { return (b.pts || 0) - (a.pts || 0); });
    }

    return bracketTeams;
  }

  function renderTeamStandings(targetId, team, allTeams, allStandings) {
    var el = document.getElementById(targetId);
    if (!el) return;

    var bracketTeams = findBracketTeams(team, allTeams, allStandings);
    if (!bracketTeams.length) {
      el.innerHTML = pageUtils.renderStateMessage("No bracket standings available.");
      return;
    }

    var table = '<table class="standings-table"><thead><tr>' +
      "<th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>" +
      "</tr></thead><tbody>";

    bracketTeams.forEach(function (row, index) {
      var isCurrent = row.id === team.id || row.name === team.name;
      var style = isCurrent ? ' style="background:var(--accent-soft);"' : "";
      table += '<tr' + style + ">" +
        "<td>" + (index + 1) + "</td>" +
        "<td>" + (row.name || "") + "</td>" +
        "<td>" + (row.mp != null ? row.mp : "") + "</td>" +
        "<td>" + (row.w != null ? row.w : "") + "</td>" +
        "<td>" + (row.d != null ? row.d : "") + "</td>" +
        "<td>" + (row.l != null ? row.l : "") + "</td>" +
        "<td>" + (row.gf != null ? row.gf : "") + "</td>" +
        "<td>" + (row.ga != null ? row.ga : "") + "</td>" +
        "<td>" + (row.gd != null ? row.gd : "") + "</td>" +
        "<td>" + (row.pts != null ? row.pts : "") + "</td>" +
      "</tr>";
    });

    table += "</tbody></table>";
    el.innerHTML = table;
  }

  function renderTeamMatches(targetId, team, allMatches) {
    var el = document.getElementById(targetId);
    if (!el) return;

    var teamName = team.name.toLowerCase();
    var matches = allMatches.filter(function (match) {
      var home = (match.homeTeam || match.home_team_name || match.home_team || match.home || "").toLowerCase();
      var away = (match.awayTeam || match.away_team_name || match.away_team || match.away || "").toLowerCase();
      return home.includes(teamName) || away.includes(teamName) || teamName.includes(home) || teamName.includes(away);
    });

    if (!matches.length) {
      el.innerHTML = pageUtils.renderStateMessage("No matches found for this team.");
      return;
    }

    el.innerHTML = matches.map(function (match) {
      var home = match.homeTeam || match.home_team_name || match.home_team || match.home || "";
      var away = match.awayTeam || match.away_team_name || match.away_team || match.away || "";
      var hasScore = match.homeScore != null && match.awayScore != null;
      var scoreText = hasScore ? match.homeScore + " - " + match.awayScore : "vs";
      var time = match.time || match.match_time || "";
      var field = match.location || match.field || "";
      var stage = match.stage || match.type || "";

      return '<div class="match-card">' +
        '<div class="match-team"><div class="match-team-name">' + home + "</div></div>" +
        '<div class="match-center">' +
          '<div class="match-score' + (hasScore ? " score-final" : "") + '">' + scoreText + "</div>" +
          (stage ? '<div class="match-time">' + stage + "</div>" : "") +
        "</div>" +
        '<div class="match-team match-team-away"><div class="match-team-name">' + away + "</div></div>" +
        '<div style="grid-column:1/-1;" class="match-meta">' + time + (field ? " \u2022 " + field : "") + "</div>" +
      "</div>";
    }).join("");
  }

  window.teamDirectory = {
    renderTeamCards: renderTeamCards,
    renderTeamHeader: renderTeamHeader,
    renderTeamMatches: renderTeamMatches,
    renderTeamRecord: renderTeamRecord,
    renderTeamStandings: renderTeamStandings
  };
})();
