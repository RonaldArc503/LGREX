"use strict";
(function initWebOS() {
  var isWebOS = navigator.userAgent.indexOf("Web0S") >= 0 || navigator.userAgent.indexOf("WebOS") >= 0 || navigator.userAgent.indexOf("SmartTV") >= 0 || typeof window.webOS !== "undefined";
  if (!isWebOS) return;
  console.log("[WebOS] LG TV adaptations active");
  
  // Usar style.setProperty si está disponible, o fallback manual
  if (document.documentElement.style.setProperty) {
    document.documentElement.style.setProperty("--card-w", "200px");
  }

  document.addEventListener("keydown", function(e) {
    var isBack = e.keyCode === 461 || e.key === "GoBack" || e.key === "XF86Back";
    if (!isBack) return;
    e.preventDefault();
    e.stopPropagation();
    if (window.Navigation) Navigation.handleBack();
  });

  document.addEventListener("keydown", function(e) {
    if (e.keyCode === 13 && e.target.classList.contains("card")) {
      e.target.click();
    }
  });

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function() {
      var cards = document.querySelectorAll(".card:not([tabindex])");
      for (var i = 0; i < cards.length; i++) {
        cards[i].tabIndex = 0;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  var scrolls = document.querySelectorAll(".row-scroll");
  for (var j = 0; j < scrolls.length; j++) {
    scrolls[j].style.scrollSnapType = "x mandatory";
  }
})();
