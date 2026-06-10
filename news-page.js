document.addEventListener("DOMContentLoaded", async function () {
  var grid = document.getElementById("news-grid");
  if (!grid) return;

  try {
    var response = await fetch("data/news.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    var posts = await response.json();

    grid.innerHTML = posts.map(function (post) {
      return '<article class="news-card">' +
        '<div class="news-card-img">' +
          '<img src="' + post.image + '" alt="' + post.imageAlt + '" />' +
        "</div>" +
        '<div class="news-card-body">' +
          '<h2 class="news-card-title">' + post.title + "</h2>" +
          '<p class="news-card-snippet">' + post.snippet + "</p>" +
          '<div class="news-card-meta">by ' + post.author + " &bull; " + post.date + "</div>" +
        "</div>" +
      "</article>";
    }).join("");
  } catch (error) {
    grid.innerHTML = pageUtils.renderStateMessage("Failed to load news: " + error.message, "error");
  }
});
