document.addEventListener("DOMContentLoaded", async function () {
  try {
    var config = await fetchConfig();
    renderHomeHero(config);
    renderHomeUpcomingCard(config);
    renderHomeSlideshow();
    renderHomeEventsGrid(config);
  } catch (error) {
    console.error("Failed to load config:", error);
  }
});

function renderHomeHero(config) {
  var firstId = config.eventOrder[0];
  var event = config.events[firstId];
  if (!event) return;

  var slug = eventSlug(event.eventName);
  document.getElementById("hero-title").textContent = event.eventName;

  var metaEl = document.getElementById("hero-meta");
  metaEl.innerHTML = "";
  if (event.dateText) {
    var dateSpan = document.createElement("span");
    dateSpan.innerHTML = "<strong>" + event.dateText + "</strong>";
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
    detailsLink.textContent = "Event Details";
    buttonsEl.appendChild(detailsLink);
  }

  document.getElementById("hero-footnote").textContent =
    "The 2nd Annual Summer Championship returns to Moorpark this August. Over 100 teams will battle it out across two days of elite competition — bring the heat, leave with the crown. U6–U19 boys and girls divisions.";
}

function renderHomeUpcomingCard(config) {
  var event = getUpcomingEvent(config);
  if (!event) {
    document.getElementById("upcoming-card").style.display = "none";
    return;
  }

  var theme = getTheme(config, event.theme);
  var card = document.getElementById("upcoming-card");
  card.style.setProperty("--upcoming-accent", theme.accentColor);

  if (event.logoPath) {
    document.getElementById("upcoming-logo").innerHTML =
      '<img src="' + staticUrl(event.logoPath) + '" alt="' + event.eventName + '" />';
  }

  document.getElementById("upcoming-name").textContent = event.eventName;

  var lines = [];
  if (event.dateText) lines.push(event.dateText);
  if (event.locationText) lines.push(getFullAddress(event.locationText));
  document.getElementById("upcoming-meta").innerHTML = lines.join("<br>");

  var countdown = document.getElementById("upcoming-countdown");
  var days = daysUntil(event.startDate);
  if (days > 0) {
    countdown.innerHTML = '<span class="countdown-number">' + days + '</span><span class="countdown-label">days away</span>';
  } else if (days === 0) {
    countdown.innerHTML = '<span class="countdown-number">Today!</span>';
  } else {
    countdown.innerHTML = '<span class="countdown-label">Event completed</span>';
  }

  if (event.registrationUrl && !event.archived && !card.querySelector(".btn")) {
    var registerLink = document.createElement("a");
    registerLink.className = "btn btn-primary";
    registerLink.href = event.registrationUrl;
    registerLink.target = "_blank";
    registerLink.rel = "noopener";
    registerLink.textContent = "Register Now";
    registerLink.style.boxShadow = "0 14px 30px " + theme.accentColor + "55";
    registerLink.style.background = theme.accentColor;
    registerLink.style.color = theme.buttonTextColor;
    card.appendChild(registerLink);
  }
}

function renderHomeSlideshow() {
  var allPhotos = [];
  Object.keys(EVENT_PHOTOS).forEach(function (slug) {
    EVENT_PHOTOS[slug].forEach(function (url) {
      allPhotos.push(url);
    });
  });
  if (!allPhotos.length) return;

  for (var i = allPhotos.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = allPhotos[i];
    allPhotos[i] = allPhotos[j];
    allPhotos[j] = temp;
  }
  allPhotos = allPhotos.slice(0, 8);

  document.getElementById("slideshow-section").style.display = "";
  var track = document.getElementById("slideshow-track");
  var dots = document.getElementById("slideshow-dots");

  track.innerHTML = allPhotos.map(function (url, index) {
    return '<div class="slideshow-slide' + (index === 0 ? " active" : "") + '">' +
      '<img src="' + url + '" alt="Playmaker Sports action" loading="lazy" />' +
    "</div>";
  }).join("");

  dots.innerHTML = allPhotos.map(function (_, index) {
    return '<button class="slideshow-dot' + (index === 0 ? " active" : "") + '" data-idx="' + index + '"></button>';
  }).join("");

  var currentIndex = 0;
  var slides = track.querySelectorAll(".slideshow-slide");
  var dotButtons = dots.querySelectorAll(".slideshow-dot");

  function goTo(index) {
    slides[currentIndex].classList.remove("active");
    dotButtons[currentIndex].classList.remove("active");
    currentIndex = index;
    slides[currentIndex].classList.add("active");
    dotButtons[currentIndex].classList.add("active");
  }

  dots.addEventListener("click", function (event) {
    var button = event.target.closest(".slideshow-dot");
    if (button) goTo(parseInt(button.getAttribute("data-idx"), 10));
  });

  document.getElementById("slideshow-prev").addEventListener("click", function () {
    goTo((currentIndex - 1 + allPhotos.length) % allPhotos.length);
  });
  document.getElementById("slideshow-next").addEventListener("click", function () {
    goTo((currentIndex + 1) % allPhotos.length);
  });

  setInterval(function () {
    goTo((currentIndex + 1) % allPhotos.length);
  }, 5000);
}

function renderHomeEventsGrid(config) {
  var grid = document.getElementById("events-grid");
  grid.innerHTML = "";

  config.eventOrder.forEach(function (id) {
    var event = config.events[id];
    if (!event || !event.eventName) return;

    var slug = eventSlug(event.eventName);
    var logoSrc = event.logoPath ? staticUrl(event.logoPath) : "";
    var photos = EVENT_PHOTOS[slug] || [];
    var bgPhoto = photos[0] || "";

    var article = document.createElement("article");
    article.className = "event-card";
    article.innerHTML =
      '<div class="event-card-img">' +
        (bgPhoto
          ? '<img class="event-card-bg" src="' + bgPhoto + '" alt="' + event.eventName + '" />'
          : (logoSrc ? '<img src="' + logoSrc + '" alt="' + event.eventName + '" />' : "")) +
      "</div>" +
      '<div class="event-card-body">' +
        '<div class="event-name-row">' +
          (logoSrc ? '<img class="event-card-logo-inline" src="' + logoSrc + '" alt="" />' : "") +
          '<div class="event-name">' +
            (slug
              ? '<a href="' + eventPageUrl(slug) + '" style="color:inherit;text-decoration:none;">' + event.eventName.replace(/ \d{4}$/, "") + "</a>"
              : event.eventName) +
          "</div>" +
        "</div>" +
        '<div class="event-card-text">' +
          '<div class="event-date">' + (event.dateText || "") + "</div>" +
          '<div class="event-row">' + getFullAddress(event.locationText).replace(/\s\u2013\s/, "<br>") + "</div>" +
          '<div class="event-meta">Boys &amp; Girls, U6&ndash;U19</div>' +
        "</div>" +
      "</div>";

    grid.appendChild(article);
  });
}
