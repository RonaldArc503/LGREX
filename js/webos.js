"use strict";
(function initWebOS() {
  const isWebOS = navigator.userAgent.includes("Web0S") || navigator.userAgent.includes("WebOS") || navigator.userAgent.includes("SmartTV") || typeof window.webOS !== "undefined";
  if (!isWebOS) return;
  console.log("[WebOS] LG TV adaptations active");
  document.documentElement.style.setProperty("--card-w", "200px");
  document.addEventListener("keydown", (e) => {
    const isBack = e.keyCode === 461 || e.key === "GoBack" || e.key === "XF86Back";
    if (!isBack) return;
    if (document.getElementById("player").classList.contains("open")) {
      Player.close();
      e.preventDefault();
    } else if (document.getElementById("detail").classList.contains("open")) {
      Detail.close();
      e.preventDefault();
    } else if (document.getElementById("search-view").classList.contains("open")) {
      Search.close();
      e.preventDefault();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.keyCode === 13 && e.target.classList.contains("card")) {
      e.target.click();
    }
  });
  const observer = new MutationObserver(() => {
    document.querySelectorAll(".card:not([tabindex])").forEach((c) => {
      c.tabIndex = 0;
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll(".row-scroll").forEach((el) => {
    el.style.scrollSnapType = "x mandatory";
  });
})();
