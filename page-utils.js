(function () {
  function renderStateMessage(message, tone) {
    var color = tone === "error" ? ' style="color:var(--danger);"' : "";
    return '<div class="data-empty"' + color + ">" + message + "</div>";
  }

  function setBackLink(id, href, label) {
    var link = document.getElementById(id);
    if (!link) return;
    link.href = href;
    if (label) link.innerHTML = label;
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

  async function fetchStaticJsonWithFallback(remotePath, localPath) {
    var response;
    try {
      response = await fetch(staticUrl(remotePath));
      if (response.ok) return await response.json();
    } catch (error) {}

    var fallbackResponse = await fetch(localPath);
    if (!fallbackResponse.ok) {
      throw new Error("Could not load " + localPath + ": HTTP " + fallbackResponse.status);
    }
    return await fallbackResponse.json();
  }

  async function loadEventBySlug(slug) {
    var config = await fetchConfig();
    var event = getEventBySlug(config, slug);
    if (!event) throw new Error("Event not found");
    return { config: config, event: event };
  }

  window.pageUtils = {
    fetchStaticJsonWithFallback: fetchStaticJsonWithFallback,
    loadEventBySlug: loadEventBySlug,
    populateAgeFilter: populateAgeFilter,
    renderStateMessage: renderStateMessage,
    setBackLink: setBackLink,
    sortAgeValues: sortAgeValues
  };
})();
