(function () {
  // Escape every value that did not come from this repo before it goes into
  // innerHTML. Team/club names and locations are typed into GotSport by third
  // parties and flow through the API unchanged.
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Only allow http(s) and relative URLs in src/href attributes.
  function safeUrl(value) {
    var url = String(value || "").trim();
    return /^(https?:\/\/|[a-z0-9._\/-]+$)/i.test(url) && !/^javascript:/i.test(url) ? esc(url) : "";
  }

  function renderStateMessage(message, tone) {
    var className = tone === "error" ? "data-empty data-error" : "data-empty";
    return '<div class="' + className + '"' + (tone === "error" ? ' style="color:var(--danger);"' : "") + ">" + esc(message) + "</div>";
  }

  function setBackLink(id, href, label) {
    var link = document.getElementById(id);
    if (!link) return;
    link.href = href;
    if (label) link.textContent = label;
    link.style.display = "";
  }

  function sortAgeValues(values) {
    return values.sort(function (a, b) {
      return (parseInt(String(a).replace(/\D/g, ""), 10) || 0) - (parseInt(String(b).replace(/\D/g, ""), 10) || 0);
    });
  }

  function populateAgeFilter(selectId, teams, allLabel) {
    var select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = "";

    var defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = allLabel || "All Age Groups";
    select.appendChild(defaultOption);

    var ages = sortAgeValues(
      Array.from(
        new Set(
          teams
            .map(function (team) { return team.age; })
            .filter(Boolean)
        )
      )
    );

    ages.forEach(function (age) {
      var option = document.createElement("option");
      option.value = age;
      option.textContent = age;
      select.appendChild(option);
    });
  }

  async function loadEventBySlug(slug) {
    var config = await fetchConfig();
    var event = getEventBySlug(config, slug);
    if (!event) throw new Error("Event not found");
    return { config: config, event: event };
  }

  window.pageUtils = {
    esc: esc,
    safeUrl: safeUrl,
    loadEventBySlug: loadEventBySlug,
    populateAgeFilter: populateAgeFilter,
    renderStateMessage: renderStateMessage,
    setBackLink: setBackLink,
    sortAgeValues: sortAgeValues
  };
})();
