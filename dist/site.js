// site.js — Shared config loader and utilities for Playmaker Sports website.
// Event data shape, standings, match lookup and rules rendering come from the
// shared contract (playmaker-data.js, synced from playmaker-static/contract).

const STATIC_BASE = "https://playmaker-static.onrender.com";
const API_BASE = "https://playmakersportsapp-api.onrender.com";
const FETCH_TIMEOUT_MS = 15000;

let _configCache = null;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Remote first; the local copy (synced into dist/ from ../playmaker-static at
// build time) is used when the static site is unreachable or blocks CORS.
async function fetchStaticJson(path) {
  try {
    const res = await fetchWithTimeout(STATIC_BASE + "/" + path);
    if (res.ok) return await res.json();
  } catch (e) {}
  const local = await fetchWithTimeout(path);
  if (!local.ok) throw new Error("Could not load " + path + " (HTTP " + local.status + ")");
  return local.json();
}

async function fetchConfig() {
  if (!_configCache) _configCache = await fetchStaticJson("event_config.json");
  return _configCache;
}

function staticUrl(path) {
  return PlaymakerData.resolveUrl(STATIC_BASE, path);
}

// Current (first in eventOrder) event of a series slug, e.g. "winter-fest".
function getEventBySlug(config, slug) {
  return PlaymakerData.eventForSeries(config, slug);
}

// Ops selects the featured/current event explicitly; dates must not override it.
function getUpcomingEvent(config) {
  if (Object.prototype.hasOwnProperty.call(config, "defaultEventId")) {
    const id = String(config.defaultEventId || "");
    const event = config.events[id];
    return !PlaymakerData.isPlaceholderEventId(id) && event && !event.archived ? PlaymakerData.withId(event, id) : null;
  }
  // Backward compatibility for legacy configs without a current-event pointer.
  const today = new Date().toISOString().slice(0, 10);
  let closest = null;
  for (const id of config.eventOrder) {
    const ev = config.events[id];
    if (!ev || ev.archived || !ev.startDate || ev.startDate < today) continue;
    if (!closest || ev.startDate < closest.startDate) closest = PlaymakerData.withId(ev, id);
  }
  return closest;
}

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

function eventSlug(event) {
  return PlaymakerData.seriesSlug(event);
}

function eventPageUrl(slug) {
  return slug + ".html";
}

// Fetch event data (archived or live), normalized to the shared contract.
let _eventDataCache = {};

async function fetchEventData(ev) {
  const eventId = String(ev.resultsEventId || ev.eventId);
  if (_eventDataCache[eventId]) return _eventDataCache[eventId];

  let raw;
  if (ev.archived && ev.archivedDataFile) {
    raw = await fetchStaticJson("archived/" + ev.archivedDataFile + ".json");
  } else if (PlaymakerData.isPlaceholderEventId(eventId)) {
    // Ops placeholder: not on GotSport yet, so there is nothing to fetch.
    raw = { teams: [], clubs: [], matches: [] };
  } else {
    const res = await fetchWithTimeout(API_BASE + "/api/events/" + encodeURIComponent(eventId) + "/data");
    if (!res.ok) throw new Error(res.status === 404 ? "Results are not available yet." : "HTTP " + res.status + " fetching live data");
    raw = await res.json();
  }

  const data = PlaymakerData.normalizeEventData(raw, eventId);
  _eventDataCache[eventId] = data;
  return data;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

// Website presentation: which photos show on each page (event data lives in config).
const EVENT_PHOTOS = {
  "playmakers-cup": [
    "banners/playmakers-cup-2.png",
    "banners/playmakers-cup-1.png",
  ],
  "winter-fest": [
    "banners/winter-fest-1.png",
  ],
  "summer-championship": [
    "banners/summer-championship-2.jpg",
    "banners/summer-championship-1.png",
  ],
};

const HOME_HERO_PHOTOS = [
  "assets/gallery/champions-surf-ventura.jpg",
  "assets/gallery/champions-legends-fc.jpg",
  "assets/gallery/champions-malibu-winter-fest.jpg",
];

const HOME_HERO_POSITIONS = ["center 30%", "center 30%", "center 35%"];

const HOME_EVENT_CARD_PHOTOS = {
  "playmakers-cup": "assets/news/first-playmakers-cup-recap.webp",
  "summer-championship": "assets/news/summer-championship-2025-recap.webp",
  "winter-fest": "banners/winter-fest-1.png",
};

function eventLogoUrl(event) {
  return event && event.logoPath ? staticUrl(event.logoPath) : "";
}

// Full venue address from config (`address`), falling back to locationText.
function getFullAddress(event) {
  return (event && (event.address || event.locationText)) || "";
}

function formatMatchWhen(match) {
  return [match.date, match.startTime].filter(Boolean).join(" ") || match.time || "TBD";
}

function formatScore(match) {
  if (match.homeScore === null || match.awayScore === null) return "";
  let text = match.homeScore + " - " + match.awayScore;
  if (match.hasPKs && match.homePK !== null && match.awayPK !== null) {
    text += " (PKs " + match.homePK + "-" + match.awayPK + ")";
  }
  return text;
}
