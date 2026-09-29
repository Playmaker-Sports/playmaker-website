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

    var template = await fetchStaticJson("rules_template.json");
    container.innerHTML = renderRulesBlocks(PlaymakerData.rulesBlocks(template, event));
  } catch (error) {
    container.innerHTML = pageUtils.renderStateMessage("Failed to load rules: " + error.message, "error");
  }
});

var RULES_TAGS = {
  header: ["h1", "rules-header"],
  sectionHeader: ["h2", "rules-section-header"],
  subHeader: ["h3", "rules-sub-header"],
  text: ["p", "rules-text"],
  italic: ["p", "rules-italic"],
  listItem: ["div", "rules-list-item"]
};

// Rules text is site-owned, but it is escaped like any other data.
function renderRulesBlocks(blocks) {
  var esc = pageUtils.esc;
  return blocks.map(function (block) {
    if (block.type === "table") {
      return '<table class="rules-table"><thead><tr>' +
        block.headers.map(function (header) { return "<th>" + esc(header).replace(/\n/g, "<br>") + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        block.rows.map(function (row) {
          return "<tr>" + row.map(function (cell) { return "<td>" + esc(cell) + "</td>"; }).join("") + "</tr>";
        }).join("") +
        "</tbody></table>";
    }
    var tag = RULES_TAGS[block.type] || RULES_TAGS.text;
    return "<" + tag[0] + ' class="' + tag[1] + '">' + esc(block.text) + "</" + tag[0] + ">";
  }).join("");
}
