document.addEventListener("DOMContentLoaded", async function () {
  var slug = getParam("slug");
  var container = document.getElementById("rules-container");

  if (!slug) {
    container.innerHTML = pageUtils.renderStateMessage("No event specified.");
    return;
  }

  pageUtils.setBackLink("back-link", slug + ".html");

  try {
    var loaded = await pageUtils.loadEventBySlug(slug);
    var event = loaded.event;
    document.title = event.eventName + " — Tournament Rules | Playmaker Sports";

    var template = await pageUtils.fetchStaticJsonWithFallback("/rules_template.json", "rules_template.json");
    container.innerHTML = renderRulesTemplate(template, event.eventName, event.rules || {});
  } catch (error) {
    container.innerHTML = pageUtils.renderStateMessage("Failed to load rules: " + error.message, "error");
  }
});

function renderRulesTemplate(template, eventName, eventRules) {
  var html = "";

  template.sections.forEach(function (section) {
    var text = String(section.text || "").replace(/\{eventName\}/g, eventName);

    switch (section.type) {
      case "header":
        html += '<h1 class="rules-header">' + text + "</h1>";
        break;
      case "sectionHeader":
        html += '<h2 class="rules-section-header">' +
          text.replace(/\{refundHeader\}/g, eventRules.refundHeader || "Refund Policy:") +
        "</h2>";
        break;
      case "subHeader":
        html += '<h3 class="rules-sub-header">' + text + "</h3>";
        break;
      case "text":
        if (section.key) {
          var value = eventRules[section.key];
          if (value) html += '<p class="rules-text">' + value + "</p>";
        } else {
          html += '<p class="rules-text">' + text + "</p>";
        }
        break;
      case "italic":
        html += '<p class="rules-italic">' + text + "</p>";
        break;
      case "listItem":
        html += '<div class="rules-list-item">' + text + "</div>";
        break;
      case "list":
      case "styledList":
        if (section.key && Array.isArray(eventRules[section.key])) {
          eventRules[section.key].forEach(function (line) {
            html += line.startsWith("*")
              ? '<p class="rules-italic">' + line + "</p>"
              : '<p class="rules-text">' + line + "</p>";
          });
        }
        break;
      case "table":
        html += '<table class="rules-table"><thead><tr>';
        (section.headers || []).forEach(function (header) {
          html += "<th>" + header.replace(/\n/g, "<br>") + "</th>";
        });
        html += "</tr></thead><tbody>";
        (section.rows || []).forEach(function (row) {
          html += "<tr>";
          row.forEach(function (cell) {
            html += "<td>" + cell + "</td>";
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
        break;
    }
  });

  return html;
}
