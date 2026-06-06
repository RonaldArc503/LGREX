"use strict";
var TVFocus = (function() {
  var scheduledEnsure = false;
  var rafId = 0;
  var SELECTORS = {
    main: [
      "#nav .nav-logo",
      "#nav .nav-link",
      "#nav-q",
      "#nav .nav-avatar",
      "#hero .btn-play",
      "#hero .btn-info",
      "#hero .hero-dot",
      '.rows-wrap:not([style*="display: none"]) .card'
    ].join(", "),
    detail: [
      "#detail .d-close",
      "#detail .d-play-btn",
      "#detail .d-circle",
      "#detail #d-season-select",
      "#detail .server-tab",
      "#detail .ep-row",
      "#detail #autoplay-check",
      ".ep-card",
      ".btn-play-large",
      ".btn-back-circle"
    ].join(", "),
    search: [
      "#search-view .sv-back",
      "#search-view #sv-input",
      "#search-view .card"
    ].join(", "),
    player: [
      "#player .p-close",
      "#player #p-progress",
      "#player .p-btn",
      "#player .vol-slider",
      "#player .p-srv-btn",
      "#player .p-autoplay-btn"
    ].join(", ")
  };
  function getContext() {
    var p = document.getElementById("player");
    if (p && p.classList.contains("open")) return "player";
    var d = document.getElementById("dc-container");
    if (d) return "detail";
    var s = document.getElementById("search-view");
    if (s && s.classList.contains("open")) return "search";
    return "main";
  }
  function isVisible(el) {
    if (!el || el.disabled) return false;
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function markFocusable(el) {
    if (!el) return;
    if (!el.matches("button, input, select, textarea, a, [tabindex]")) {
      el.tabIndex = 0;
    }
    if (el.matches(".card, .nav-link, .nav-logo, .nav-avatar, .ep-row, .server-tab, .p-srv-btn, .hero-dot, .ep-card, .btn-play-large, .btn-back-circle")) {
      el.setAttribute("role", "button");
    }
    el.classList.add("tv-focusable");
  }
  function getCandidates(ctx) {
    if (!ctx) ctx = getContext();
    var list = Array.from(document.querySelectorAll(SELECTORS[ctx])).filter(isVisible);
    list.forEach(markFocusable);
    return list;
  }
  function getPreferred(ctx, list) {
    if (!list.length) return null;
    if (ctx === "main") {
      return document.querySelector("#nav .nav-link.active") || document.querySelector("#hero .btn-play") || list[0];
    }
    if (ctx === "detail") {
      return document.querySelector(".btn-play-large") || document.querySelector(".ep-card") || list[0];
    }
    if (ctx === "search") {
      return document.getElementById("sv-input") || list[0];
    }
    return document.getElementById("p-play-btn") || list[0];
  }
  function focusElement(el) {
    if (!el) return false;
    if (document.activeElement === el) return true;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    return true;
  }
  function center(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  function selectByDirection(from, candidates, dir) {
    var fromRect = from.getBoundingClientRect();
    var a = center(fromRect);
    var best = null;
    var bestScore = Number.POSITIVE_INFINITY;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el === from) continue;
      var rect = el.getBoundingClientRect();
      var b = center(rect);
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      if (dir === "left" && dx >= -5) continue;
      if (dir === "right" && dx <= 5) continue;
      if (dir === "up" && dy >= -5) continue;
      if (dir === "down" && dy <= 5) continue;
      var primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
      var secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
      var score = primary * 1e3 + secondary;
      if (score < bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }
  function _isMainNav(el) {
    return !!(el && el.closest("#nav"));
  }
  function _isHero(el) {
    return !!(el && el.closest("#hero"));
  }
  function _isCard(el) {
    return !!(el && el.closest(".card"));
  }
  function _visible(el) {
    return !!el && isVisible(el);
  }
  function _activeNavElement() {
    return document.querySelector("#nav .nav-link.active") || document.querySelector("#nav .nav-logo") || document.querySelector("#nav .nav-link");
  }
  function _mainNavItems() {
    return Array.from(document.querySelectorAll("#nav .nav-logo, #nav .nav-link, #nav-q, #nav .nav-avatar")).filter(_visible);
  }
  function _heroItems() {
    return Array.from(document.querySelectorAll("#hero .btn-play, #hero .btn-info, #hero .hero-dot")).filter(_visible);
  }
  function _visibleRows() {
    return Array.from(document.querySelectorAll('.rows-wrap:not([style*="display: none"]) .row-scroll')).filter(_visible);
  }
  function _rowCards(rowEl) {
    if (!rowEl) return [];
    return Array.from(rowEl.querySelectorAll(".card")).filter(_visible);
  }
  function _firstCard() {
    var rows = _visibleRows();
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var cards = _rowCards(row);
      if (cards.length) return cards[0];
    }
    return null;
  }
  function _moveWithinList(current, list, direction) {
    if (!list.length) return false;
    var idx = Math.max(0, list.indexOf(current));
    var nextIdx = idx;
    if (direction === "left") nextIdx = Math.max(0, idx - 1);
    if (direction === "right") nextIdx = Math.min(list.length - 1, idx + 1);
    return focusElement(list[nextIdx]);
  }
  function _moveCardsByRows(currentCard, direction) {
    var currentRow = currentCard ? currentCard.closest(".row-scroll") : null;
    if (!currentRow) return false;
    var rows = _visibleRows();
    var rowIdx = rows.indexOf(currentRow);
    if (rowIdx < 0) return false;
    var cardsInCurrent = _rowCards(currentRow);
    var colIdx = Math.max(0, cardsInCurrent.indexOf(currentCard));
    if (direction === "left" || direction === "right") {
      return _moveWithinList(currentCard, cardsInCurrent, direction);
    }
    if (direction === "up") {
      if (rowIdx === 0) {
        var hero = _heroItems();
        if (hero.length) return focusElement(hero[0]);
        var nav = _activeNavElement();
        if (nav) return focusElement(nav);
        return false;
      }
      var targetCardsUp = _rowCards(rows[rowIdx - 1]);
      if (!targetCardsUp.length) return false;
      return focusElement(targetCardsUp[Math.min(colIdx, targetCardsUp.length - 1)]);
    }
    if (direction === "down") {
      if (rowIdx >= rows.length - 1) return false;
      var targetCardsDown = _rowCards(rows[rowIdx + 1]);
      if (!targetCardsDown.length) return false;
      return focusElement(targetCardsDown[Math.min(colIdx, targetCardsDown.length - 1)]);
    }
    return false;
  }
  function moveMain(direction) {
    var current = document.activeElement;
    var navItems = _mainNavItems();
    var heroItems = _heroItems();
    if (!current || current === document.body) {
      var preferred = _activeNavElement() || heroItems[0] || _firstCard();
      return focusElement(preferred);
    }
    if (_isMainNav(current)) {
      if (direction === "left" || direction === "right") {
        return _moveWithinList(current, navItems, direction);
      }
      if (direction === "down") {
        if (heroItems.length) return focusElement(heroItems[0]);
        return focusElement(_firstCard());
      }
      return false;
    }
    if (_isHero(current)) {
      if (direction === "left" || direction === "right") {
        return _moveWithinList(current, heroItems, direction);
      }
      if (direction === "up") {
        return focusElement(_activeNavElement());
      }
      if (direction === "down") {
        return focusElement(_firstCard());
      }
      return false;
    }
    if (_isCard(current)) {
      return _moveCardsByRows(current.closest(".card"), direction);
    }
    if (direction === "up") return focusElement(_activeNavElement());
    if (direction === "down") return focusElement(heroItems[0] || _firstCard());
    if (direction === "left" || direction === "right") return _moveWithinList(current, navItems, direction);
    return false;
  }
  function move(direction) {
    var ctx = getContext();
    if (ctx === "main") {
      var handled = moveMain(direction);
      if (handled) return true;
    }
    var candidates = getCandidates(ctx);
    if (!candidates.length) return false;
    var current = document.activeElement;
    if (candidates.indexOf(current) < 0) {
      current = getPreferred(ctx, candidates);
      return focusElement(current);
    }
    var target = selectByDirection(current, candidates, direction);
    if (!target) return false;
    return focusElement(target);
  }
  function clickFocused() {
    var el = document.activeElement;
    if (!el) return false;
    if (el.matches('input[type="text"], textarea')) return false;
    if (el.matches('input[type="checkbox"]')) {
      el.checked = !el.checked;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (typeof el.click === "function") {
      el.click();
      return true;
    }
    return false;
  }
  function ensureContextFocus() {
    var ctx = getContext();
    var candidates = getCandidates(ctx);
    if (!candidates.length) return;
    if (candidates.indexOf(document.activeElement) >= 0) return;
    focusElement(getPreferred(ctx, candidates));
  }
  function scheduleEnsureContextFocus() {
    if (scheduledEnsure) return;
    scheduledEnsure = true;
    rafId = window.requestAnimationFrame(function() {
      scheduledEnsure = false;
      ensureContextFocus();
    });
  }
  function handleKeydown(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return false;
    var key = e.key;
    var active = document.activeElement;
    var inTextInput = !!active && active.matches('input[type="text"], textarea');
    if (inTextInput) {
      if (key === "ArrowDown") {
        e.preventDefault();
        return move("down");
      }
      return false;
    }
    if (key === "ArrowLeft") {
      e.preventDefault();
      return move("left");
    }
    if (key === "ArrowRight") {
      e.preventDefault();
      return move("right");
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      return move("up");
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      return move("down");
    }
    if (key === "Enter") {
      e.preventDefault();
      return clickFocused();
    }
    if (key === "MediaPlayPause" || key === "Play") {
      if (getContext() === "player") {
        e.preventDefault();
        if (window.Player) Player.togglePlay();
        return true;
      }
    }
    return false;
  }
  function init() {
    scheduleEnsureContextFocus();
    var obs = new MutationObserver(function() {
      scheduleEnsureContextFocus();
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true
    });
    window.addEventListener("focus", scheduleEnsureContextFocus, true);
    window.addEventListener("resize", scheduleEnsureContextFocus);
    ["player", "detail", "search-view", "dc-container"].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var panelObs = new MutationObserver(scheduleEnsureContextFocus);
      panelObs.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
    document.querySelectorAll("#nav-q, #sv-input").forEach(function(input) {
      input.addEventListener("blur", scheduleEnsureContextFocus);
    });
    window.addEventListener("beforeunload", function() {
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }
  return { init: init, handleKeydown: handleKeydown, ensureContextFocus: ensureContextFocus };
})();
window.TVFocus = TVFocus;
window.addEventListener("DOMContentLoaded", function() {
  TVFocus.init();
});
