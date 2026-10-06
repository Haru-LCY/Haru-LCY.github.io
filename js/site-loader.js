(function () {
  var loader = document.getElementById("site-loader");

  if (!loader) return;

  var dismissed = false;
  var dismiss = function () {
    if (dismissed) return;
    dismissed = true;
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

  // Never leave the page covered if a network resource stalls.
  window.setTimeout(dismiss, 3500);
}());
