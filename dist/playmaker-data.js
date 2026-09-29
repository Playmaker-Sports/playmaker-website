/*
 * playmaker-data.js — the shared Playmaker event-data contract (schemaVersion 2).
 *
 * Source of truth: playmaker-static/contract/. Copied (never edited) into
 *   - playmaker-website/dist/ by scripts/build-pages.js
 *   - playmaker-mobile-app/src/shared/ by scripts/sync-static.js
 * The API emits the same shape (playmaker-api/playmaker/contract.py); this
 * module normalizes anything older so clients only ever see one shape.
 *
 * Plain ES2015, no dependencies: runs in browsers, Hermes and Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PlaymakerData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_VERSION = 2;

  // Published point system (rules_template.json "POINT SYSTEM").
  var SCORING = { win: 6, tie: 3, loss: 0, goalPoint: 1, goalCap: 3, shutout: 1 };

  var PRIVATE_MATCH_FIELDS = [
    'editUrl', 'cloneUrl', 'changeLogUrl', 'gameSheetUrl', 'homeTeamUrl', 'awayTeamUrl',
    'homeRegistrationUrl', 'awayRegistrationUrl', 'homeRegistrationId', 'awayRegistrationId',
    'updatedSince', 'commentCount', 'scheduleBracket', 'playoff', 'round', 'score',
    'homePkScore', 'awayPkScore'
  ];

  var EVENT_ID_PATTERN = /^(\d{1,20}|[a-z0-9][a-z0-9-]{0,63})$/;
  var LEGACY_TIME = /^([A-Z][a-z]{2} \d{1,2}, \d{4})(?:\s+(\d{1,2}:\d{2}\s*[AaPp][Mm]))?(?:\s+([A-Z]{2,4})\b)?\s*(.*)$/;
  var CLOCK = /^\d{1,2}:\d{2}\s*[AaPp][Mm]$/;
  var MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

  // ── small helpers ─────────────────────────────────────────────────────────

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function toInt(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = Number(value);
    return isFinite(n) ? Math.trunc(n) : null;
  }

  function nameKey(value) {
    return clean(value).toLowerCase();
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function isPlaceholderEventId(id) {
    return !/^\d+$/.test(String(id || ''));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveUrl(baseUrl, path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return String(baseUrl || '').replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
  }

  // Timestamps from the API are UTC ISO with an offset. Older payloads used
  // offset-less server time, which was UTC on Render.
  function parseTimestamp(value) {
    if (!value) return null;
    var text = String(value);
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) text += 'Z';
    var date = new Date(text);
    return isNaN(date.getTime()) ? null : date;
  }

  // ── match time ────────────────────────────────────────────────────────────

  function splitMatchTime(value) {
    var text = clean(value);
    if (!text) return { date: '', startTime: '', status: '' };
    var m = LEGACY_TIME.exec(text);
    if (m) return { date: m[1], startTime: clean(m[2]).toUpperCase(), status: clean(m[4]) };
    if (CLOCK.test(text)) return { date: '', startTime: text.toUpperCase(), status: '' };
    return { date: '', startTime: '', status: text };
  }

  function kickoffOf(dateText, startTime) {
    var d = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(clean(dateText));
    if (!d || !MONTHS[d[1]]) return '';
    var day = d[3] + '-' + pad(MONTHS[d[1]]) + '-' + pad(Number(d[2]));
    var t = /^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]$/.exec(clean(startTime));
    if (!t) return day;
    var hour = Number(t[1]) % 12 + (t[3].toUpperCase() === 'P' ? 12 : 0);
    return day + 'T' + pad(hour) + ':' + t[2];
  }

  // ── normalization ─────────────────────────────────────────────────────────

  function standingsKey(gender, age, bracket, group) {
    return [gender, age, bracket, group].map(clean).join('|');
  }

  function normalizeMatch(raw, eventId) {
    var m = {};
    Object.keys(raw || {}).forEach(function (key) {
      if (PRIVATE_MATCH_FIELDS.indexOf(key) === -1) m[key] = raw[key];
    });
    var homePK = toInt(raw.homePK != null ? raw.homePK : raw.homePkScore);
    var awayPK = toInt(raw.awayPK != null ? raw.awayPK : raw.awayPkScore);
    m.homePK = homePK;
    m.awayPK = awayPK;
    m.hasPKs = raw.hasPKs === true || (homePK !== null && awayPK !== null);
    m.homeScore = toInt(raw.homeScore);
    m.awayScore = toInt(raw.awayScore);

    var status = clean(raw.status);
    var date, startTime, time;
    if (raw.date) {
      date = clean(raw.date);
      startTime = clean(raw.startTime || raw.time);
      if (!CLOCK.test(startTime)) startTime = splitMatchTime(startTime).startTime;
      time = [date, startTime, status].filter(Boolean).join(' ');
    } else {
      var parts = splitMatchTime(raw.time);
      date = parts.date;
      startTime = parts.startTime;
      status = status || parts.status;
      time = clean(raw.time);
    }
    m.date = date;
    m.startTime = startTime;
    m.kickoff = raw.kickoff || kickoffOf(date, startTime);
    m.time = time;
    m.status = status;
    m.type = String(raw.type || '').toLowerCase() === 'playoffs' ? 'Playoffs' : 'Group';
    m.stage = clean(raw.stage);
    m.matchId = String(raw.matchId || '');
    m.matchNum = String(raw.matchNum || '');
    m.homeTeam = clean(raw.homeTeam);
    m.awayTeam = clean(raw.awayTeam);
    m.homeTeamId = String(raw.homeTeamId || '');
    m.awayTeamId = String(raw.awayTeamId || '');
    m.location = clean(raw.location);
    m.age = clean(raw.age);
    m.gender = clean(raw.gender);
    m.bracket = clean(raw.bracket);
    m.group = clean(raw.group);
    if (eventId) m.eventId = String(eventId);
    return m;
  }

  function normalizeTeam(raw, eventId) {
    var t = {};
    Object.keys(raw || {}).forEach(function (key) { t[key] = raw[key]; });
    ['mp', 'w', 'l', 'd', 'gf', 'ga', 'gd', 'pts', 'shutouts', 'redCards'].forEach(function (key) {
      t[key] = toInt(raw[key]) || 0;
    });
    t.id = String(raw.id || '');
    t.name = clean(raw.name || raw.team_name);
    t.club = clean(raw.club);
    t.logoUrl = clean(raw.logoUrl);
    t.age = clean(raw.age);
    t.gender = clean(raw.gender);
    t.bracket = clean(raw.bracket || raw.division);
    t.group = clean(raw.group);
    t.standingsKey = raw.standingsKey || standingsKey(t.gender, t.age, t.bracket, t.group);
    t.rank = toInt(raw.rank);
    if (eventId) t.eventId = String(eventId);
    return t;
  }

  function buildClubs(teams, eventId) {
    var byName = {};
    teams.forEach(function (team) {
      if (!team.club) return;
      var club = byName[team.club];
      if (!club) {
        club = byName[team.club] = {
          id: 'club-' + team.club.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: team.club, logoUrl: team.logoUrl, eventId: eventId, teams: [],
          totalPoints: 0, totalMatches: 0, totalWins: 0
        };
      }
      club.teams.push(team);
      club.totalPoints += team.pts;
      club.totalMatches += team.mp;
      club.totalWins += team.w;
      if (!club.logoUrl && team.logoUrl) club.logoUrl = team.logoUrl;
    });
    return Object.keys(byName).map(function (name) {
      var c = byName[name];
      c.ppg = c.totalMatches ? Math.round(c.totalPoints / c.totalMatches * 100) / 100 : 0;
      c.winPercentage = c.totalMatches ? Math.round(c.totalWins / c.totalMatches * 1000) / 10 : 0;
      delete c.totalWins;
      return c;
    });
  }

  /**
   * Normalize any event payload (API response or archive, any schema
   * generation) into the canonical shape. Never mutates its input.
   */
  function normalizeEventData(raw, eventId) {
    raw = raw || {};
    var id = String(eventId || raw.eventId || '');
    var teams = (Array.isArray(raw.teams) ? raw.teams : []).map(function (t) { return normalizeTeam(t, id); });
    var teamsById = {};
    teams.forEach(function (t) { if (t.id) teamsById[t.id] = t; });
    var matches = (Array.isArray(raw.matches) ? raw.matches : raw.games || []).map(function (m) { return normalizeMatch(m, id); });

    var clubs;
    if (Array.isArray(raw.clubs) && raw.clubs.length) {
      clubs = raw.clubs.map(function (c) {
        var club = {};
        Object.keys(c).forEach(function (key) { club[key] = c[key]; });
        club.id = String(c.id || '');
        club.eventId = id;
        club.teams = (c.teams || []).map(function (t) { return teamsById[String(t.id)] || normalizeTeam(t, id); });
        return club;
      });
    } else {
      clubs = buildClubs(teams, id);
    }

    ensureRanks(teams, matches);

    return {
      schemaVersion: SCHEMA_VERSION,
      eventId: id,
      eventName: raw.eventName || '',
      dataAsOf: raw.dataAsOf || raw.lastUpdated || null,
      source: raw.source || '',
      teams: teams,
      clubs: clubs,
      matches: matches
    };
  }

  // ── standings ─────────────────────────────────────────────────────────────

  function applyResult(stats, goalsFor, goalsAgainst) {
    if (goalsFor > goalsAgainst) { stats.w += 1; stats.pts += SCORING.win; }
    else if (goalsFor < goalsAgainst) { stats.pts += SCORING.loss; }
    else { stats.pts += SCORING.tie; }
    stats.pts += Math.min(goalsFor, SCORING.goalCap) * SCORING.goalPoint;
    if (goalsAgainst === 0) stats.pts += SCORING.shutout;
    stats.gf += goalsFor;
    stats.gd += goalsFor - goalsAgainst;
  }

  function teamKey(team) {
    return team.id || nameKey(team.name);
  }

  function matchSideKey(match, side) {
    return match[side + 'TeamId'] || nameKey(match[side + 'Team']);
  }

  function isScoredGroupMatch(match) {
    return match.type !== 'Playoffs' && match.homeScore !== null && match.awayScore !== null &&
      match.homeScore !== undefined && match.awayScore !== undefined;
  }

  function compareNames(a, b) {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  }

  // Tiebreakers: head-to-head, goal differential, goals for, wins, shutouts,
  // fewest red cards (rules_template.json). Three-way ties restart on the
  // remaining teams, mirroring playmaker-api/playmaker/standings_engine.py.
  function resolveTie(rows, matches) {
    if (rows.length <= 1) return rows;
    var participants = {};
    var h2h = {};
    rows.forEach(function (row) {
      participants[teamKey(row)] = true;
      h2h[teamKey(row)] = { pts: 0, gf: 0, gd: 0, w: 0 };
    });
    matches.forEach(function (match) {
      if (!isScoredGroupMatch(match)) return;
      var home = matchSideKey(match, 'home');
      var away = matchSideKey(match, 'away');
      if (!participants[home] || !participants[away]) return;
      applyResult(h2h[home], match.homeScore, match.awayScore);
      applyResult(h2h[away], match.awayScore, match.homeScore);
    });
    var ordered = rows.slice().sort(function (a, b) {
      return (h2h[teamKey(b)].pts - h2h[teamKey(a)].pts) || (b.gd - a.gd) || (b.gf - a.gf) ||
        (b.w - a.w) || ((b.shutouts || 0) - (a.shutouts || 0)) || ((a.redCards || 0) - (b.redCards || 0)) ||
        compareNames(a, b);
    });
    var partitions = [];
    ordered.forEach(function (row) {
      var last = partitions[partitions.length - 1];
      if (last && h2h[teamKey(last[0])].pts === h2h[teamKey(row)].pts) last.push(row);
      else partitions.push([row]);
    });
    if (partitions.length <= 1) return ordered;
    var resolved = [];
    partitions.forEach(function (part) {
      resolved = resolved.concat(part.length > 1 && part.length < rows.length ? resolveTie(part, matches) : part);
    });
    return resolved;
  }

  function orderTable(rows, matches) {
    var byPoints = rows.slice().sort(function (a, b) { return (b.pts - a.pts) || compareNames(a, b); });
    var ordered = [];
    var i = 0;
    while (i < byPoints.length) {
      var j = i;
      while (j < byPoints.length && byPoints[j].pts === byPoints[i].pts) j++;
      ordered = ordered.concat(resolveTie(byPoints.slice(i, j), matches));
      i = j;
    }
    return ordered;
  }

  /** Fill in rank for any standings table where the data did not supply one. */
  function ensureRanks(teams, matches) {
    var tables = {};
    teams.forEach(function (t) { (tables[t.standingsKey] = tables[t.standingsKey] || []).push(t); });
    Object.keys(tables).forEach(function (key) {
      var rows = tables[key];
      if (rows.every(function (t) { return t.rank !== null; })) return;
      orderTable(rows, matches).forEach(function (t, index) { t.rank = index + 1; });
    });
  }

  function ageNumber(age) {
    var digits = String(age || '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }

  function bracketPriority(bracket) {
    var b = String(bracket || '').toLowerCase();
    if (b.indexOf('premier') !== -1) return 0;
    if (b.indexOf('championship') !== -1) return 1;
    if (b.indexOf('gold') !== -1) return 2;
    return 3;
  }

  /** Youngest age first, Boys before Girls, Premier > Championship > Gold. */
  function compareDivisions(a, b) {
    return (ageNumber(a.age) - ageNumber(b.age)) ||
      (a.gender === b.gender ? 0 : a.gender === 'Boys' ? -1 : 1) ||
      (bracketPriority(a.bracket) - bracketPriority(b.bracket)) ||
      String(a.bracket).localeCompare(String(b.bracket)) ||
      String(a.group).localeCompare(String(b.group));
  }

  function sortByRank(teams) {
    return teams.slice().sort(function (a, b) {
      var ra = a.rank === null || a.rank === undefined ? Infinity : a.rank;
      var rb = b.rank === null || b.rank === undefined ? Infinity : b.rank;
      return (ra - rb) || (b.pts - a.pts) || compareNames(a, b);
    });
  }

  /**
   * Standings tables in display order. Teams that were never placed in a
   * bracket (withdrawn or unplaced registrations) are left out.
   */
  function standingsTables(teams) {
    var tables = {};
    teams.forEach(function (t) {
      if (!t.bracket) return;
      var table = tables[t.standingsKey];
      if (!table) {
        table = tables[t.standingsKey] = {
          key: t.standingsKey, gender: t.gender, age: t.age, bracket: t.bracket,
          group: t.standingsKey.split('|')[3] || '', teams: []
        };
        table.label = [table.gender, table.age, table.bracket, table.group].filter(Boolean).join(' ');
      }
      table.teams.push(t);
    });
    return Object.keys(tables).map(function (key) {
      tables[key].teams = sortByRank(tables[key].teams);
      return tables[key];
    }).sort(compareDivisions);
  }

  /** Divisions (gender + age + bracket), each possibly split into pools. */
  function divisions(teams) {
    var byKey = {};
    standingsTables(teams).forEach(function (table) {
      var key = standingsKey(table.gender, table.age, table.bracket, '');
      var division = byKey[key];
      if (!division) {
        division = byKey[key] = { key: key, gender: table.gender, age: table.age, bracket: table.bracket, tables: [], teamCount: 0 };
        division.label = [division.gender, division.age, division.bracket].filter(Boolean).join(' ');
      }
      division.tables.push(table);
      division.teamCount += table.teams.length;
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; }).sort(compareDivisions);
  }

  // ── matches ───────────────────────────────────────────────────────────────

  function compareMatches(a, b) {
    return String(a.kickoff).localeCompare(String(b.kickoff)) ||
      (Number(a.matchNum) || 0) - (Number(b.matchNum) || 0);
  }

  function involves(match, team) {
    if (team.id && (match.homeTeamId || match.awayTeamId)) {
      return match.homeTeamId === team.id || match.awayTeamId === team.id;
    }
    var name = nameKey(team.name);
    return !!name && (nameKey(match.homeTeam) === name || nameKey(match.awayTeam) === name);
  }

  /** A team's matches, by team ID when the data has IDs, else exact name. */
  function teamMatches(team, matches) {
    return matches.filter(function (m) { return involves(m, team); }).sort(compareMatches);
  }

  /** Matches for a division: any match with a team from it, plus its playoffs. */
  function divisionMatches(division, teams, matches) {
    var members = teams.filter(function (t) {
      return t.gender === division.gender && t.age === division.age && t.bracket === division.bracket;
    });
    return matches.filter(function (m) {
      return members.some(function (t) { return involves(m, t); }) ||
        (m.type === 'Playoffs' && m.gender === division.gender && m.age === division.age && m.bracket === division.bracket);
    }).sort(compareMatches);
  }

  function isUpcoming(match) {
    return match.homeScore === null || match.awayScore === null;
  }

  // ── rules ─────────────────────────────────────────────────────────────────

  /**
   * Turn rules_template.json + one event into renderable blocks:
   * {type: header|sectionHeader|subHeader|text|italic|listItem|table, text, headers, rows, columnStyles}.
   * General rules always render; per-event refund sections are skipped when
   * the event has no `rules` object. List items starting with "*" are notes.
   */
  function rulesBlocks(template, event) {
    var rules = (event && event.rules) || {};
    var values = { eventName: (event && event.eventName) || '' };
    Object.keys(rules).forEach(function (key) { if (typeof rules[key] === 'string') values[key] = rules[key]; });
    var blocks = [];

    function fill(text) {
      var missing = false;
      var out = String(text || '').replace(/\{(\w+)\}/g, function (_, key) {
        if (values[key] === undefined) { missing = true; return ''; }
        return values[key];
      });
      return missing ? null : out;
    }

    ((template && template.sections) || []).forEach(function (section) {
      if (section.type === 'list' || section.type === 'styledList') {
        var items = section.key ? rules[section.key] : null;
        (Array.isArray(items) ? items : []).forEach(function (item) {
          var note = String(item).charAt(0) === '*';
          blocks.push({ type: note ? 'italic' : 'text', text: String(item) });
        });
        return;
      }
      if (section.type === 'table') {
        blocks.push({
          type: 'table',
          headers: (section.headers || []).slice(),
          columnStyles: (section.columnStyles || []).slice(),
          rows: (section.rows || []).map(function (row) { return row.map(function (cell) { return fill(cell) || cell; }); })
        });
        return;
      }
      var text = section.key ? (typeof rules[section.key] === 'string' ? rules[section.key] : null) : fill(section.text);
      if (text) blocks.push({ type: section.type, text: text });
    });
    return blocks;
  }

  // ── config helpers ────────────────────────────────────────────────────────

  var SERIES_PREFIXES = [
    ['Playmakers Cup', 'playmakers-cup'],
    ['Winter Fest', 'winter-fest'],
    ['Summer Championship', 'summer-championship']
  ];

  /** Series slug ("winter-fest"); config `slug` wins, name prefix is a fallback for old stubs. */
  function seriesSlug(event) {
    if (event && event.slug) return event.slug;
    var name = String((event && event.eventName) || '');
    for (var i = 0; i < SERIES_PREFIXES.length; i++) {
      if (name.indexOf(SERIES_PREFIXES[i][0]) === 0) return SERIES_PREFIXES[i][1];
    }
    return '';
  }

  /** Current (first in eventOrder) event of a series, with its eventId. */
  function eventForSeries(config, slug) {
    var ids = (config.eventOrder || []).concat(Object.keys(config.events || {}));
    for (var i = 0; i < ids.length; i++) {
      var ev = config.events[ids[i]];
      if (ev && seriesSlug(ev) === slug) return withId(ev, ids[i]);
    }
    return null;
  }

  function withId(event, id) {
    var copy = { eventId: String(id) };
    Object.keys(event || {}).forEach(function (key) { copy[key] = event[key]; });
    return copy;
  }

  function compareVersions(a, b) {
    var pa = String(a || '0').split('.').map(Number);
    var pb = String(b || '0').split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d < 0 ? -1 : 1;
    }
    return 0;
  }

  // ── validation (used by playmaker-static CI) ──────────────────────────────

  function validateEventConfig(config, options) {
    options = options || {};
    var assetExists = options.assetExists;
    var errors = [];
    var warnings = [];
    if (!config || typeof config !== 'object') return { errors: ['config is not an object'], warnings: warnings };
    var events = config.events || {};
    var themes = config.themes || {};
    if (!Array.isArray(config.eventOrder)) errors.push('eventOrder must be an array');
    (config.eventOrder || []).forEach(function (id) {
      if (!events[id]) errors.push('eventOrder references missing event ' + id);
    });
    if (config.defaultEventId) {
      var current = events[config.defaultEventId];
      if (!current) errors.push('defaultEventId ' + config.defaultEventId + ' is not an event');
      else if (current.archived) errors.push('defaultEventId ' + config.defaultEventId + ' is archived');
      else if (isPlaceholderEventId(config.defaultEventId)) errors.push('defaultEventId must be a GotSport (numeric) event');
    }
    if (config.appVersion) {
      ['minimum', 'latest'].forEach(function (key) {
        if (!/^\d+\.\d+\.\d+$/.test(String(config.appVersion[key] || ''))) errors.push('appVersion.' + key + ' must look like 1.2.3');
      });
      if (compareVersions(config.appVersion.minimum, config.appVersion.latest) > 0) errors.push('appVersion.minimum is above appVersion.latest');
    }

    function checkAsset(id, field, path, enabled) {
      if (!path || /^https?:\/\//i.test(path) || !assetExists) return;
      if (!assetExists(path)) (enabled ? errors : warnings).push(id + ': ' + field + ' ' + path + ' does not exist');
    }

    Object.keys(events).forEach(function (id) {
      var ev = events[id];
      var listed = (config.eventOrder || []).indexOf(id) !== -1;
      if (!EVENT_ID_PATTERN.test(id)) errors.push('event id "' + id + '" must be numeric or a lowercase slug');
      if (!ev.eventName) errors.push(id + ': eventName is required');
      if (ev.theme && !themes[ev.theme]) errors.push(id + ': theme "' + ev.theme + '" is not defined');
      if (ev.archived) {
        if (!ev.archivedDataFile) errors.push(id + ': archived events need archivedDataFile');
        else if (assetExists && !assetExists('/archived/' + ev.archivedDataFile + '.json')) {
          errors.push(id + ': archived/' + ev.archivedDataFile + '.json does not exist');
        }
      }
      if (listed) {
        ['dateText', 'locationText', 'startDate', 'endDate', 'logoPath', 'slug', 'resultsButtonText'].forEach(function (key) {
          if (!ev[key]) errors.push(id + ': ' + key + ' is required for events in eventOrder');
        });
        ['startDate', 'endDate'].forEach(function (key) {
          if (ev[key] && !/^\d{4}-\d{2}-\d{2}$/.test(ev[key])) errors.push(id + ': ' + key + ' must be YYYY-MM-DD');
        });
        if (ev.startDate && ev.endDate && ev.endDate < ev.startDate) errors.push(id + ': endDate is before startDate');
      }
      if (ev.scraperEnabled && !ev.gotsportUrl) errors.push(id + ': scraperEnabled needs gotsportUrl');
      if (ev.scraperEnabled && isPlaceholderEventId(id)) errors.push(id + ': placeholder events cannot be scraped');
      (ev.previousEvents || []).forEach(function (prev) {
        var target = events[prev.eventId];
        if (prev.eventId === id) errors.push(id + ': previousEvents lists the event itself');
        else if (!target) errors.push(id + ': previousEvents references missing event ' + prev.eventId);
        else if (!target.archived) errors.push(id + ': previousEvents entry ' + prev.eventId + ' is not archived');
        if (!prev.label) errors.push(id + ': previousEvents entry ' + prev.eventId + ' needs a label');
      });
      if (ev.rules) {
        if (!Array.isArray(ev.rules.refundLines)) errors.push(id + ': rules.refundLines must be an array');
        if (!ev.rules.refundHeader) errors.push(id + ': rules.refundHeader is required');
      }
      checkAsset(id, 'logoPath', ev.logoPath, true);
      checkAsset(id, 'fieldMapPath', ev.fieldMapPath, !ev.fieldMapDisabled && !ev.archived);
      if (ev.fieldMapPath && /drive\.google\.com/.test(ev.fieldMapPath)) {
        warnings.push(id + ': fieldMapPath is a Google Drive link; host it under /field-maps/ instead');
      }
    });
    return { errors: errors, warnings: warnings };
  }

  function validateEventData(data) {
    var errors = [];
    var warnings = [];
    if (!data || typeof data !== 'object') return { errors: ['data is not an object'], warnings: warnings };
    if (data.schemaVersion !== SCHEMA_VERSION) warnings.push('schemaVersion is ' + data.schemaVersion + ', expected ' + SCHEMA_VERSION);
    if (!Array.isArray(data.teams) || !data.teams.length) errors.push('teams must be a non-empty array');
    if (!Array.isArray(data.matches)) errors.push('matches must be an array');
    if (!Array.isArray(data.clubs)) errors.push('clubs must be an array');
    var ids = {};
    var ranks = {};
    (data.teams || []).forEach(function (t, i) {
      if (!t.id || !t.name) errors.push('team #' + i + ' needs id and name');
      if (ids[t.id]) errors.push('duplicate team id ' + t.id);
      ids[t.id] = true;
      if (t.rank !== null && t.rank !== undefined) {
        var slot = t.standingsKey + '#' + t.rank;
        if (ranks[slot]) errors.push('two teams share rank ' + t.rank + ' in ' + t.standingsKey);
        ranks[slot] = true;
      }
    });
    (data.matches || []).forEach(function (m, i) {
      PRIVATE_MATCH_FIELDS.forEach(function (field) {
        if (m[field] !== undefined) errors.push('match #' + i + ' contains private field ' + field);
      });
      ['home', 'away'].forEach(function (side) {
        var id = m[side + 'TeamId'];
        if (id && !ids[id]) warnings.push('match #' + i + ' ' + side + 'TeamId ' + id + ' is not a team');
      });
    });
    return { errors: errors, warnings: warnings };
  }

  // ── display ───────────────────────────────────────────────────────────────

  function formatUpdated(value, now) {
    var date = parseTimestamp(value);
    if (!date) return '';
    now = now || new Date();
    var time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (date.toDateString() === now.toDateString()) return time;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time;
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    SCORING: SCORING,
    PRIVATE_MATCH_FIELDS: PRIVATE_MATCH_FIELDS,
    escapeHtml: escapeHtml,
    resolveUrl: resolveUrl,
    parseTimestamp: parseTimestamp,
    formatUpdated: formatUpdated,
    isPlaceholderEventId: isPlaceholderEventId,
    splitMatchTime: splitMatchTime,
    kickoffOf: kickoffOf,
    standingsKey: standingsKey,
    normalizeMatch: normalizeMatch,
    normalizeTeam: normalizeTeam,
    normalizeEventData: normalizeEventData,
    orderTable: orderTable,
    sortByRank: sortByRank,
    standingsTables: standingsTables,
    divisions: divisions,
    compareDivisions: compareDivisions,
    ageNumber: ageNumber,
    teamMatches: teamMatches,
    divisionMatches: divisionMatches,
    compareMatches: compareMatches,
    isUpcoming: isUpcoming,
    rulesBlocks: rulesBlocks,
    seriesSlug: seriesSlug,
    eventForSeries: eventForSeries,
    withId: withId,
    compareVersions: compareVersions,
    validateEventConfig: validateEventConfig,
    validateEventData: validateEventData
  };
});
