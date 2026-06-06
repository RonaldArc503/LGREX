"use strict";
(function() {
  function init() {
    var panel = document.getElementById("share-modal") || document.getElementById("share-panel");
    if (!panel) {
      window.ShareModal = { open: function() {}, close: function() {} };
      return;
    }
    var openButtons = [
      "#share-btn",
      ".share-btn",
      '[data-action="share"]',
      '[title="Compartir"]'
    ];
    var closeBtn = panel ? panel.querySelector("[data-close], .close, .btn-close") : null;
    
    function safeAddListener(selector, eventName, handler) {
      try {
        if (!selector) return;
        var el = document.querySelector(selector);
        if (el && typeof el.addEventListener === 'function') {
          el.addEventListener(eventName, handler);
        }
      } catch (e) {
      }
    }
    function open() {
      if (!panel) return;
      panel.classList.add("open");
      panel.style.display = "block";
    }
    function close() {
      if (!panel) return;
      panel.classList.remove("open");
      panel.style.display = "none";
    }
    for (var i = 0; i < openButtons.length; i++) {
      safeAddListener(openButtons[i], "click", open);
    }
    if (closeBtn && typeof closeBtn.addEventListener === 'function') {
      try {
        closeBtn.addEventListener("click", close);
      } catch (e) {
      }
    }
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") close();
    });
    window.ShareModal = { open: open, close: close };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
