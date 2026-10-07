(function () {
  var loader = document.getElementById("site-loader");

  if (!loader) return;

  var skipReferrerPath = loader.getAttribute("data-skip-referrer-path");
  if (skipReferrerPath && document.referrer) {
    try {
      var referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin &&
          (referrer.pathname === skipReferrerPath.replace(/\/$/, "") ||
           referrer.pathname.indexOf(skipReferrerPath) === 0)) {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
        return;
      }
    } catch (error) {}
  }

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

  if (document.readyState === "complete") {
    window.setTimeout(dismiss, 2000);
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(dismiss, 2000);
    }, { once: true });
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
