(function () {
  var loader = document.getElementById("site-loader");

  if (!loader) return;

  var dismiss = function () {
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

  // Never leave the page covered if a network resource stalls.
  window.setTimeout(dismiss, 3500);
}());
