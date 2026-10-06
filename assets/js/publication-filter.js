(function () {
  var filters = document.querySelectorAll("[data-publication-filter]");
  var lists = document.querySelectorAll("[data-publication-list]");

  if (!filters.length || !lists.length) return;

  var applyFilter = function (filter) {
    lists.forEach(function (list) {
      list.querySelectorAll("[data-publication-selected]").forEach(function (card) {
        card.hidden = filter === "selected" && card.dataset.publicationSelected !== "true";
      });
    });

    filters.forEach(function (button) {
      var active = button.dataset.publicationFilter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      applyFilter(button.dataset.publicationFilter);
    });
  });

  applyFilter("selected");
}());
