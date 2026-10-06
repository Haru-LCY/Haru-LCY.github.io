document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".music-video-card__player[data-bvid]").forEach((player) => {
    const button = player.querySelector(".music-video-card__load");
    if (!button) return;

    const bvid = player.dataset.bvid;
    const setPoster = (cover) => {
      const secureCover = cover.replace(/^http:/, "https:");
      const image = new Image();
      image.onload = () => {
        button.style.setProperty("--music-cover", `url("${secureCover}")`);
        button.classList.add("has-poster");
      };
      image.src = secureCover;
    };

    if (player.dataset.cover) {
      setPoster(player.dataset.cover);
    } else {
      const coverApi = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;

      // Fetch only the lightweight Bilibili metadata on page load. The actual
      // player is still created only after the visitor clicks the cover.
      fetch(coverApi, { credentials: "omit" })
        .then((response) => response.json())
        .then((payload) => {
          const cover = payload?.data?.pic;
          if (cover) setPoster(cover);
        })
        .catch(() => {
          // Keep the accessible dark fallback button if Bilibili metadata is
          // temporarily unavailable or blocked by the browser.
        });
    }

    button.addEventListener("click", () => {
      const params = new URLSearchParams({
        bvid,
        page: player.dataset.page || "1",
        high_quality: "1",
        danmaku: "0"
      });
      const iframe = document.createElement("iframe");
      iframe.src = `https://player.bilibili.com/player.html?${params.toString()}`;
      iframe.title = player.dataset.videoTitle || "Bilibili video";
      iframe.allow = "fullscreen";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      player.replaceChildren(iframe);
    }, { once: true });
  });
});
