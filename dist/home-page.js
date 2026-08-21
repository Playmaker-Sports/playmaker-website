document.addEventListener("DOMContentLoaded", async function () {
  try {
    var config = await fetchConfig();
    renderHomeHero(config);
    renderHomeEventsGrid(config);
    enableHomeMotion();
  } catch (error) {
    console.error("Failed to load config:", error);
  }
});

function renderHomeHero(config) {
  var firstId = config.eventOrder[0];
  var event = config.events[firstId];
  if (!event) return;

  var slug = eventSlug(event.eventName);
  var photos = EVENT_PHOTOS[slug] || [];
  var heroImage = document.getElementById("home-hero-image");
  if (heroImage && photos.length) heroImage.src = photos[0];

  document.getElementById("hero-title").textContent = event.eventName;

  var metaEl = document.getElementById("hero-meta");
  metaEl.innerHTML = "";
  if (event.dateText) {
    var dateSpan = document.createElement("span");
    dateSpan.textContent = event.dateText;
    metaEl.appendChild(dateSpan);
  }
  if (event.locationText) {
    var locationSpan = document.createElement("span");
    locationSpan.textContent = getFullAddress(event.locationText);
    metaEl.appendChild(locationSpan);
  }

  var buttonsEl = document.getElementById("hero-buttons");
  buttonsEl.innerHTML = "";
  if (event.registrationUrl && !event.archived) {
    var registerLink = document.createElement("a");
    registerLink.className = "btn btn-primary";
    registerLink.href = event.registrationUrl;
    registerLink.target = "_blank";
    registerLink.rel = "noopener";
    registerLink.textContent = "Register Now";
    buttonsEl.appendChild(registerLink);
  }
  if (slug) {
    var detailsLink = document.createElement("a");
    detailsLink.className = "btn btn-ghost";
    detailsLink.href = eventPageUrl(slug);
    detailsLink.textContent = "Tournament Details";
    buttonsEl.appendChild(detailsLink);
  }
}

function renderHomeEventsGrid(config) {
  var grid = document.getElementById("events-grid");
  grid.innerHTML = "";

  config.eventOrder.forEach(function (id, index) {
    var event = config.events[id];
    if (!event || !event.eventName) return;

    var slug = eventSlug(event.eventName);
    var photos = EVENT_PHOTOS[slug] || [];
    var bgPhoto = photos[index % Math.max(photos.length, 1)] || photos[0] || "";
    var article = document.createElement("a");
    article.className = "event-card event-story reveal-on-scroll";
    article.href = eventPageUrl(slug);
    article.innerHTML =
      '<div class="event-card-img">' +
        (bgPhoto ? '<img class="event-card-bg" src="' + bgPhoto + '" alt="' + event.eventName + '" />' : "") +
      '</div>' +
      '<div class="event-card-body">' +
        '<div class="event-name">' + event.eventName.replace(/ \d{4}$/, "") + '</div>' +
        '<div class="event-card-text">' +
          '<div class="event-date">' + (event.dateText || "") + '</div>' +
          '<div class="event-row">' + getFullAddress(event.locationText).replace(/\s\u2013\s/, "<br>") + '</div>' +
          '<div class="event-meta">Boys &amp; Girls, U6&ndash;U19</div>' +
        '</div>' +
        '<span class="event-story-arrow" aria-hidden="true">View event &rarr;</span>' +
      '</div>';
    grid.appendChild(article);
  });
}

function enableHomeMotion() {
  window.requestAnimationFrame(function () {
    document.body.classList.add("home-ready");
  });

  var heroImage = document.getElementById("home-hero-image");
  window.addEventListener("scroll", function () {
    if (!heroImage) return;
    var shift = Math.min(window.scrollY * 0.08, 36);
    heroImage.style.transform = "scale(1.035) translateY(" + shift + "px)";
  }, { passive: true });

  if (!("IntersectionObserver" in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal-on-scroll").forEach(function (element) {
    observer.observe(element);
  });
}
