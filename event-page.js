// Shared marketing logic for tournament pages. Results are rendered separately.

document.addEventListener("DOMContentLoaded", async function () {
  var slug = document.body.getAttribute("data-event-slug");
  if (!slug) return;

  try {
    var config = await fetchConfig();
    var event = getEventBySlug(config, slug);
    if (!event) throw new Error("Event not found for slug: " + slug);

    populateHero(event);
    populateDetails(event);
    populateEventNav(event, slug);
    populateFieldMap(event);
    window.requestAnimationFrame(function () {
      document.body.classList.add("event-ready");
    });
  } catch (error) {
    console.error("Error loading event page:", error);
  }
});

function populateHero(event) {
  var title = document.querySelector(".hero-simple-title");
  if (title) title.textContent = event.eventName;

  var subtext = document.querySelector(".hero-simple-subtext");
  if (subtext) {
    subtext.textContent = [event.dateText, getFullAddress(event.locationText)]
      .filter(Boolean)
      .join(" • ");
  }

  var buttons = document.querySelector(".event-hero-info .hero-buttons");
  if (!buttons) return;
  buttons.innerHTML = "";

  if (event.registrationUrl && !event.archived) {
    var register = document.createElement("a");
    register.className = "btn btn-primary";
    register.href = event.registrationUrl;
    register.target = "_blank";
    register.rel = "noopener";
    register.textContent = "Register Now";
    buttons.appendChild(register);
  }
}

function populateDetails(event) {
  document.querySelectorAll(".event-info-row").forEach(function (row) {
    var label = row.querySelector(".info-label");
    var value = row.querySelector("span:last-child");
    if (!label || !value || value === label) return;

    var labelText = label.textContent.trim().toLowerCase();
    if (labelText.startsWith("location")) value.textContent = getFullAddress(event.locationText);
    if (labelText.startsWith("date")) value.textContent = event.dateText || "";
    if (labelText.startsWith("age")) value.textContent = "Boys & Girls, U6–U19";
  });
}

function populateEventNav(event, slug) {
  var nav = document.getElementById("event-nav");
  if (!nav) return;

  var links = [
    { label: "Official GotSport", href: event.gotsportUrl, external: true, disabled: !event.gotsportUrl },
    {
      label: "Playmaker Schedule & Standings",
      href: "results.html?slug=" + slug,
      disabled: !event.archived && event.scheduleDisabled
    },
    { label: "Tournament Rules", href: "rules.html?slug=" + slug, disabled: false }
  ];

  nav.innerHTML = "";
  links.forEach(function (link) {
    if (link.disabled) {
      var disabled = document.createElement("span");
      disabled.className = "event-nav-link disabled";
      disabled.textContent = link.label;
      disabled.title = "Coming Soon";
      nav.appendChild(disabled);
      return;
    }

    var anchor = document.createElement("a");
    anchor.className = "event-nav-link";
    anchor.href = link.href;
    anchor.textContent = link.label + (link.external ? " ↗" : "");
    if (link.external) {
      anchor.target = "_blank";
      anchor.rel = "noopener";
    }
    nav.appendChild(anchor);
  });
}

function populateFieldMap(event) {
  var section = document.getElementById("field-map");
  var image = document.querySelector(".fieldmap-img");
  if (!section || !image) return;

  if (event.archived || !event.fieldMapPath || event.fieldMapDisabled) {
    section.style.display = "none";
    return;
  }

  image.src = staticUrl(event.fieldMapPath);
  image.alt = event.eventName + " Field Map";
}
