document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("contact-form");
  if (!form) return;

  var submit = document.getElementById("contact-submit");
  var success = document.getElementById("contact-success");
  var error = document.getElementById("contact-error");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = "Sending…";
    success.style.display = "none";
    error.style.display = "none";

    try {
      var response = await fetch(form.action, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || result.success === "false" || result.success === false) {
        throw new Error(result.message || "Delivery failed");
      }
      form.reset();
      success.style.display = "block";
    } catch (requestError) {
      error.style.display = "block";
    } finally {
      submit.disabled = false;
      submit.textContent = "Send Message";
    }
  });
});
