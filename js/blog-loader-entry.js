(function () {
  var key = "guanlan-loader-seen";
  try {
    if (window.sessionStorage.getItem(key)) {
      document.documentElement.classList.add("blog-loader-skipped");
    }
    window.sessionStorage.setItem(key, "true");
  } catch (error) {
    // Storage may be disabled; still skip transitions within the blog.
    try {
      var referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin &&
          /^\/(blog|guanlan)(\/|$)/.test(referrer.pathname)) {
        document.documentElement.classList.add("blog-loader-skipped");
      }
    } catch (ignored) {}
  }
}());
