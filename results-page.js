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
      event = Object.assign({ eventId: eventId }, event);
      document.getElementById("page-kicker").textContent = "Previous Results";
      document.title = event.eventName + " — Results | Playmaker Sports";
    }

    renderResultsHeader(event);
    await loadResultsData(event, getTheme(config, event.theme));
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
  document.getElementById("results-subtitle").textContent = parts.join(" \u2022 ");
}

async function loadResultsData(event, theme) {
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
    renderScheduleStandingsSection(container, data, theme);
  } catch (error) {
    container.innerHTML = pageUtils.renderStateMessage("Could not load event data: " + error.message, "error");
  }
}
