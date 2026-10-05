document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".publication-card__more-authors").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.textContent = expanded
        ? `${toggle.dataset.moreCount} more authors`
        : toggle.dataset.moreAuthors;
    });
  });
});
