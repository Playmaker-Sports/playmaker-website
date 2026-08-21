// site.js — Shared config loader and utilities for Playmaker Sports website

const STATIC_BASE = "https://playmaker-static.onrender.com";
const API_BASE = "https://playmakersportsapp-api.onrender.com";

let _configCache = null;

async function fetchConfig() {
  if (_configCache) return _configCache;
  // Try remote first, fall back to local copy (needed when CORS blocks cross-origin fetch)
  try {
    var res = await fetch(STATIC_BASE + "/event_config.json");
    if (res.ok) {
      _configCache = await res.json();
      return _configCache;
    }
  } catch (e) {}
  // Local fallback — synced into dist/ from ../playmaker-static at build time
  var res2 = await fetch("event_config.json");
  if (!res2.ok) throw new Error("Failed to load event config from both remote and local: HTTP " + res2.status);
  _configCache = await res2.json();
  return _configCache;
}

function staticUrl(path) {
  return STATIC_BASE + path;
}

// Slug mapping: URL slug → event name prefix matching
const SLUG_MAP = {
  "playmakers-cup": "Playmakers Cup",
  "winter-fest": "Winter Fest",
  "summer-championship": "Summer Championship",
};

// Get the current (non-archived) event for a given slug
function getEventBySlug(config, slug) {
  const prefix = SLUG_MAP[slug];
  if (!prefix) return null;

  // First try events in eventOrder (these are the current/active ones)
  for (const id of config.eventOrder) {
    const ev = config.events[id];
    if (ev && ev.eventName && ev.eventName.startsWith(prefix)) {
      return { ...ev, eventId: id };
    }
  }

  // Fallback: search all events
  for (const [id, ev] of Object.entries(config.events)) {
    if (ev.eventName && ev.eventName.startsWith(prefix)) {
      return { ...ev, eventId: id };
    }
  }
  return null;
}

// Find the next upcoming event (startDate in the future, not archived)
function getUpcomingEvent(config) {
  const today = new Date().toISOString().slice(0, 10);
  let closest = null;
  let closestDate = null;

  for (const id of config.eventOrder) {
    const ev = config.events[id];
    if (!ev || ev.archived || !ev.startDate) continue;
    if (ev.startDate >= today) {
      if (!closestDate || ev.startDate < closestDate) {
        closest = { ...ev, eventId: id };
        closestDate = ev.startDate;
      }
    }
  }
  return closest;
}

// Get the theme colors for an event
function getTheme(config, themeName) {
  return config.themes[themeName] || config.themes.playmakers;
}

// Calculate days until a date string (YYYY-MM-DD)
function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// Get slug from event name
function eventSlug(eventName) {
  if (eventName.startsWith("Playmakers Cup")) return "playmakers-cup";
  if (eventName.startsWith("Winter Fest")) return "winter-fest";
  if (eventName.startsWith("Summer Championship")) return "summer-championship";
  return "";
}

// Get the page URL for an event slug
function eventPageUrl(slug) {
  return slug + ".html";
}

// Fetch event data (archived or live) — shared by all sub-pages
let _eventDataCache = {};

async function fetchEventData(ev) {
  const cacheKey = ev.eventId;
  if (_eventDataCache[cacheKey]) return _eventDataCache[cacheKey];

  let data;
  if (ev.archived && ev.archivedDataFile) {
    const remoteUrl = staticUrl("/archived/" + ev.archivedDataFile + ".json");
    let res;
    try { res = await fetch(remoteUrl); } catch (e) {}
    if (!res || !res.ok) {
      res = await fetch("archived/" + ev.archivedDataFile + ".json");
    }
    if (!res.ok) throw new Error("HTTP " + res.status + " fetching archived data");
    data = await res.json();
  } else {
    const eventId = ev.resultsEventId || ev.eventId;
    const url = API_BASE + "/api/events/" + eventId + "/data";
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status + " fetching live data");
    data = await res.json();
  }

  _eventDataCache[cacheKey] = data;
  return data;
}

// Extract all teams from event data (handles both formats)
function extractTeams(data) {
  var teams = [];
  if (data.clubs && Array.isArray(data.clubs)) {
    data.clubs.forEach(function (club) {
      if (club.teams) {
        club.teams.forEach(function (t) {
          teams.push({
            id: t.id, name: t.name, club: t.club || club.name,
            logoUrl: t.logoUrl || club.logoUrl,
            age: t.age, gender: t.gender, bracket: t.bracket, group: t.group,
            mp: t.mp, w: t.w, l: t.l, d: t.d, gf: t.gf, ga: t.ga, gd: t.gd, pts: t.pts,
          });
        });
      }
    });
  } else if (data.teams && Array.isArray(data.teams)) {
    data.teams.forEach(function (t) {
      teams.push({
        id: t.id, name: t.name || t.team_name, club: t.club || "",
        logoUrl: t.logoUrl || "",
        age: t.age || "", gender: t.gender || "", bracket: t.bracket || "", group: t.group || "",
        mp: t.mp, w: t.w, l: t.l, d: t.d, gf: t.gf, ga: t.ga, gd: t.gd, pts: t.pts,
      });
    });
  }
  return teams;
}

// Extract clubs from event data
function extractClubs(data) {
  if (data.clubs && Array.isArray(data.clubs)) return data.clubs;
  // Build clubs from flat teams list
  var clubMap = {};
  var teams = extractTeams(data);
  teams.forEach(function (t) {
    var cname = t.club || "Unknown";
    if (!clubMap[cname]) {
      clubMap[cname] = { name: cname, logoUrl: t.logoUrl, teams: [], totalPoints: 0, totalMatches: 0 };
    }
    clubMap[cname].teams.push(t);
    clubMap[cname].totalPoints += (t.pts || 0);
    clubMap[cname].totalMatches += (t.mp || 0);
  });
  return Object.values(clubMap).map(function (c) {
    c.ppg = c.totalMatches > 0 ? (c.totalPoints / c.totalMatches).toFixed(2) : "0";
    c.winPercentage = c.totalMatches > 0
      ? (c.teams.reduce(function (s, t) { return s + (t.w || 0); }, 0) / c.totalMatches * 100).toFixed(1)
      : "0";
    return c;
  });
}

// Get URL query param
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

// Event banner images (themed logos/banners for each event).
// Served from playmaker-static (/banners/*) — do not hotlink external hosts.
const EVENT_PHOTOS = {
  "playmakers-cup": [
    "banners/playmakers-cup-1.png",
    "banners/playmakers-cup-2.png",
  ],
  "winter-fest": [
    "banners/winter-fest-1.png",
  ],
  "summer-championship": [
    "banners/summer-championship-1.png",
    "banners/summer-championship-2.jpg",
  ],
};

// Full addresses for venues
const VENUE_ADDRESSES = {
  "Arroyo Vista Park": "Arroyo Vista Park \u2013 4550 Tierra Rejada Rd, Moorpark, CA 93021",
  "Central Park": "Central Park \u2013 27150 Bouquet Canyon Rd, Santa Clarita, CA 91350",
};

function getFullAddress(locationText) {
  if (!locationText) return "";
  var parkName = locationText.split(",")[0].trim();
  return VENUE_ADDRESSES[parkName] || locationText;
}
