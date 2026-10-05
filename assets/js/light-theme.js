(function () {
  try {
    localStorage.setItem("theme", "dark");
  } catch (error) {
    // Ignore storage restrictions and still force the document to dark mode.
  }
  document.documentElement.setAttribute("data-theme", "dark");
})();
