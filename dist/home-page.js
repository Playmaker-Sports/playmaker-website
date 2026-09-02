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
  setupHomeHeroSlideshow(event);
  document.getElementById("upcoming-title").textContent = event.eventName.replace(/ \d{4}$/, "");

  var metaEl = document.getElementById("upcoming-meta");
  metaEl.innerHTML =
    '<span>' + (event.dateText || "Dates coming soon") + '</span>' +
    '<span>' + getFullAddress(event.locationText) + '</span>';

  var summaryEl = document.getElementById("upcoming-summary");
  summaryEl.textContent = "Boys and girls U6–U19. A competitive tournament weekend designed for players, clubs, and families.";

  var buttonsEl = document.getElementById("upcoming-actions");
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
    detailsLink.className = "text-link";
    detailsLink.href = eventPageUrl(slug);
    detailsLink.innerHTML = 'Tournament details <span aria-hidden="true">&rarr;</span>';
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
    var bgPhoto = HOME_EVENT_CARD_PHOTOS[slug] || photos[0] || "";
    var article = document.createElement("a");
    article.className = "event-card event-story event-story-" + slug + " reveal-on-scroll";
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

  var heroImages = document.querySelectorAll(".home-hero-media");
  window.addEventListener("scroll", function () {
    var shift = Math.min(window.scrollY * 0.08, 36);
    heroImages.forEach(function (heroImage) {
      heroImage.style.transform = "scale(1.035) translateY(" + shift + "px)";
    });
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

function setupHomeHeroSlideshow(event) {
  var layers = Array.prototype.slice.call(document.querySelectorAll(".home-hero-media"));
  var pagination = document.getElementById("home-hero-pagination");
  var photos = HOME_HERO_PHOTOS.slice();
  if (!layers.length || !photos.length) return;

  var currentIndex = 0;
  var activeLayer = 0;
  var timer = null;

  layers[0].src = photos[0];
  layers[0].alt = event.eventName + " tournament photo 1";
  layers[0].style.objectPosition = HOME_HERO_POSITIONS[0] || "center";
  if (photos[1]) {
    layers[1].src = photos[1];
    layers[1].alt = event.eventName + " tournament photo 2";
    layers[1].style.objectPosition = HOME_HERO_POSITIONS[1] || "center";
  }

  function updateDots() {
    if (!pagination) return;
    pagination.querySelectorAll("button").forEach(function (button, index) {
      button.classList.toggle("is-active", index === currentIndex);
      button.setAttribute("aria-current", index === currentIndex ? "true" : "false");
    });
  }

  function showPhoto(index) {
    if (index === currentIndex) return;
    var nextLayer = activeLayer === 0 ? 1 : 0;
    layers[nextLayer].src = photos[index];
    layers[nextLayer].alt = event.eventName + " tournament photo " + (index + 1);
    layers[nextLayer].style.objectPosition = HOME_HERO_POSITIONS[index] || "center";
    layers[nextLayer].classList.add("is-active");
    layers[activeLayer].classList.remove("is-active");
    activeLayer = nextLayer;
    currentIndex = index;
    updateDots();
  }

  if (pagination) {
    photos.forEach(function (_, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Show homepage photo " + (index + 1));
      button.addEventListener("click", function () {
        showPhoto(index);
        restartTimer();
      });
      pagination.appendChild(button);
    });
    updateDots();
  }

  function restartTimer() {
    if (timer) window.clearInterval(timer);
    if (photos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = window.setInterval(function () {
      showPhoto((currentIndex + 1) % photos.length);
    }, 6000);
  }

  restartTimer();
}
