(function () {
  var loader = document.getElementById("site-loader");

  if (!loader) return;

  var dismissed = false;
  var dismiss = function (immediate) {
    if (dismissed) return;
    dismissed = true;
    if (immediate) {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      return;
    }
    loader.classList.add("site-loader--hidden");
    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 900);
  };

  var scheduleDismiss = function () {
    window.setTimeout(dismiss, 2000);
  };

  if (document.readyState === "complete") {
    scheduleDismiss();
  } else {
    window.addEventListener("load", scheduleDismiss, { once: true });
  }

  // Let visitors skip the opening screen immediately.
  loader.addEventListener("click", function () { dismiss(true); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      dismiss(true);
    }
  }, { once: false });

  // Never leave the page covered if a network resource stalls.
  window.setTimeout(dismiss, 3500);
}());
