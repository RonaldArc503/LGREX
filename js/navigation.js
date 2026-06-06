"use strict";
var Navigation = (function() {
  var HOME_SECTION = "home";
  var EXIT_HINT_MS = 1800;
  var sectionStack = [HOME_SECTION];
  var applyingBack = false;
  var suppressNextPop = false;
  var lastRootBackAt = 0;

  function _main() {
    return document.getElementById("main");
  }

  function _scrollTop() {
    var main = _main();
    return main ? main.scrollTop : 0;
  }

  function _activeSection() {
    if (window.App && typeof App.currentSection === "function") {
      return App.currentSection();
    }
    var active = document.querySelector("#nav .nav-link.active");
    return active ? active.getAttribute("data-section") || HOME_SECTION : HOME_SECTION;
  }

  function _sameTop(section) {
    return sectionStack[sectionStack.length - 1] === section;
  }

  function _focusAfterNavigation() {
    if (window.TVFocus && typeof TVFocus.ensureContextFocus === "function") {
      window.requestAnimationFrame(function() { TVFocus.ensureContextFocus(); });
    }
  }

  function init() {
    var section = _activeSection();
    sectionStack = [section || HOME_SECTION];
    try {
      window.history.replaceState({ rexRoute: sectionStack[0] }, "", window.location.href);
    } catch (_) {
    }
    window.addEventListener("popstate", function() {
      if (suppressNextPop) {
        suppressNextPop = false;
        return;
      }
      if (!handleBack({ fromPopState: true })) {
        try {
          window.history.pushState({ rexRoute: _activeSection() }, "", window.location.href);
        } catch (_) {
        }
      }
    });
  }

  function recordSection(section, options) {
    if (!options) options = {};
    if (!section) return;
    if (applyingBack || options.skipHistory) return;
    if (options.replace) {
      sectionStack[sectionStack.length - 1] = section;
    } else if (!_sameTop(section)) {
      sectionStack.push(section);
    }
    try {
      window.history.pushState({ rexRoute: section }, "", window.location.href);
    } catch (_) {
    }
  }

  function recordOverlay(name) {
    if (applyingBack || !name) return;
    try {
      window.history.pushState({ rexOverlay: name, rexRoute: _activeSection() }, "", window.location.href);
    } catch (_) {
    }
  }

  function isBackKey(e) {
    return !!e && (e.keyCode === 461 || e.key === "GoBack" || e.key === "XF86Back" || e.key === "BrowserBack" || e.key === "Escape");
  }

  function handleBack(options) {
    if (!options) options = {};
    var player = document.getElementById("player");
    var detail = document.getElementById("detail");
    var search = document.getElementById("search-view");
    applyingBack = true;
    try {
      if (player && player.classList.contains("open")) {
        Player.close({ skipHistory: true });
        _focusAfterNavigation();
        return true;
      }
      if (detail && detail.classList.contains("open")) {
        Detail.close({ skipHistory: true });
        _focusAfterNavigation();
        return true;
      }
      if (search && search.classList.contains("open")) {
        Search.close({ skipHistory: true });
        _focusAfterNavigation();
        return true;
      }
      if (_scrollTop() > 160) {
        var main = _main();
        if (main) main.scrollTo({ top: 0, behavior: "smooth" });
        _focusAfterNavigation();
        return true;
      }
      if (sectionStack.length > 1) {
        sectionStack.pop();
        var previous = sectionStack[sectionStack.length - 1] || HOME_SECTION;
        if (window.App && typeof App.switchSection === "function") {
          App.switchSection(previous, null, { skipHistory: true });
        }
        _focusAfterNavigation();
        return true;
      }
      var now = Date.now();
      var msg = now - lastRootBackAt < EXIT_HINT_MS
        ? "Estas en Inicio"
        : "Inicio: usa el menu para navegar";
      lastRootBackAt = now;
      if (window.UI && typeof UI.toast === "function") UI.toast(msg);
      _focusAfterNavigation();
      return true;
    } finally {
      applyingBack = false;
      if (options.fromPopState) {
        try {
          window.history.pushState({ rexRoute: _activeSection() }, "", window.location.href);
        } catch (_) {
        }
      }
    }
  }

  function closeOverlayHistorySafe() {
    if (applyingBack) return;
    try {
      if (window.history.state && window.history.state.rexOverlay) {
        suppressNextPop = true;
        window.history.back();
      }
    } catch (_) {
    }
  }

  return {
    init: init,
    recordSection: recordSection,
    recordOverlay: recordOverlay,
    isBackKey: isBackKey,
    handleBack: handleBack,
    closeOverlayHistorySafe: closeOverlayHistorySafe
  };
})();
window.Navigation = Navigation;
