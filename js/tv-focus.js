"use strict";
const TVFocus = (() => {
  let scheduledEnsure = false;
  let rafId = 0;
  const SELECTORS = {
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
      "#detail #autoplay-check"
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
    var _a, _b, _c;
    if ((_a = document.getElementById("player")) == null ? void 0 : _a.classList.contains("open")) return "player";
    if ((_b = document.getElementById("detail")) == null ? void 0 : _b.classList.contains("open")) return "detail";
    if ((_c = document.getElementById("search-view")) == null ? void 0 : _c.classList.contains("open")) return "search";
    return "main";
  }
  function isVisible(el) {
    if (!el || el.disabled) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function markFocusable(el) {
    if (!el) return;
    if (!el.matches("button, input, select, textarea, a, [tabindex]")) {
      el.tabIndex = 0;
    }
    if (el.matches(".card, .nav-link, .nav-logo, .nav-avatar, .ep-row, .server-tab, .p-srv-btn, .hero-dot")) {
      el.setAttribute("role", "button");
    }
    el.classList.add("tv-focusable");
  }
  function getCandidates(ctx = getContext()) {
    const list = [...document.querySelectorAll(SELECTORS[ctx])].filter(isVisible);
    list.forEach(markFocusable);
    return list;
  }
  function getPreferred(ctx, list) {
    if (!list.length) return null;
    if (ctx === "main") {
      return document.querySelector("#nav .nav-link.active") || document.querySelector("#hero .btn-play") || list[0];
    }
    if (ctx === "detail") {
      return document.getElementById("d-play-btn") || list[0];
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
    const fromRect = from.getBoundingClientRect();
    const a = center(fromRect);
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const el of candidates) {
      if (el === from) continue;
      const rect = el.getBoundingClientRect();
      const b = center(rect);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dir === "left" && dx >= -5) continue;
      if (dir === "right" && dx <= 5) continue;
      if (dir === "up" && dy >= -5) continue;
      if (dir === "down" && dy <= 5) continue;
      const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
      const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
      const score = primary * 1e3 + secondary;
      if (score < bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }
  function _isMainNav(el) {
    return !!(el == null ? void 0 : el.closest("#nav"));
  }
  function _isHero(el) {
    return !!(el == null ? void 0 : el.closest("#hero"));
  }
  function _isCard(el) {
    return !!(el == null ? void 0 : el.closest(".card"));
  }
  function _visible(el) {
    return !!el && isVisible(el);
  }
  function _activeNavElement() {
    return document.querySelector("#nav .nav-link.active") || document.querySelector("#nav .nav-logo") || document.querySelector("#nav .nav-link");
  }
  function _mainNavItems() {
    return [
      ...document.querySelectorAll("#nav .nav-logo, #nav .nav-link, #nav-q, #nav .nav-avatar")
    ].filter(_visible);
  }
  function _heroItems() {
    return [
      ...document.querySelectorAll("#hero .btn-play, #hero .btn-info, #hero .hero-dot")
    ].filter(_visible);
  }
  function _visibleRows() {
    return [
      ...document.querySelectorAll('.rows-wrap:not([style*="display: none"]) .row-scroll')
    ].filter(_visible);
  }
  function _rowCards(rowEl) {
    if (!rowEl) return [];
    return [...rowEl.querySelectorAll(".card")].filter(_visible);
  }
  function _firstCard() {
    const rows = _visibleRows();
    for (const row of rows) {
      const cards = _rowCards(row);
      if (cards.length) return cards[0];
    }
    return null;
  }
  function _moveWithinList(current, list, direction) {
    if (!list.length) return false;
    const idx = Math.max(0, list.indexOf(current));
    let nextIdx = idx;
    if (direction === "left") nextIdx = Math.max(0, idx - 1);
    if (direction === "right") nextIdx = Math.min(list.length - 1, idx + 1);
    return focusElement(list[nextIdx]);
  }
  function _moveCardsByRows(currentCard, direction) {
    const currentRow = currentCard == null ? void 0 : currentCard.closest(".row-scroll");
    if (!currentRow) return false;
    const rows = _visibleRows();
    const rowIdx = rows.indexOf(currentRow);
    if (rowIdx < 0) return false;
    const cardsInCurrent = _rowCards(currentRow);
    const colIdx = Math.max(0, cardsInCurrent.indexOf(currentCard));
    if (direction === "left" || direction === "right") {
      return _moveWithinList(currentCard, cardsInCurrent, direction);
    }
    if (direction === "up") {
      if (rowIdx === 0) {
        const hero = _heroItems();
        if (hero.length) return focusElement(hero[0]);
        const nav = _activeNavElement();
        if (nav) return focusElement(nav);
        return false;
      }
      const targetCards = _rowCards(rows[rowIdx - 1]);
      if (!targetCards.length) return false;
      return focusElement(targetCards[Math.min(colIdx, targetCards.length - 1)]);
    }
    if (direction === "down") {
      if (rowIdx >= rows.length - 1) return false;
      const targetCards = _rowCards(rows[rowIdx + 1]);
      if (!targetCards.length) return false;
      return focusElement(targetCards[Math.min(colIdx, targetCards.length - 1)]);
    }
    return false;
  }
  function moveMain(direction) {
    const current = document.activeElement;
    const navItems = _mainNavItems();
    const heroItems = _heroItems();
    if (!current || current === document.body) {
      const preferred = _activeNavElement() || heroItems[0] || _firstCard();
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
    const ctx = getContext();
    if (ctx === "main") {
      const handled = moveMain(direction);
      if (handled) return true;
    }
    const candidates = getCandidates(ctx);
    if (!candidates.length) return false;
    let current = document.activeElement;
    if (!candidates.includes(current)) {
      current = getPreferred(ctx, candidates);
      return focusElement(current);
    }
    const target = selectByDirection(current, candidates, direction);
    if (!target) return false;
    return focusElement(target);
  }
  function clickFocused() {
    const el = document.activeElement;
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
    const ctx = getContext();
    const candidates = getCandidates(ctx);
    if (!candidates.length) return;
    if (candidates.includes(document.activeElement)) return;
    focusElement(getPreferred(ctx, candidates));
  }
  function scheduleEnsureContextFocus() {
    if (scheduledEnsure) return;
    scheduledEnsure = true;
    rafId = window.requestAnimationFrame(() => {
      scheduledEnsure = false;
      ensureContextFocus();
    });
  }
  function handleKeydown(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return false;
    const key = e.key;
    const active = document.activeElement;
    const inTextInput = !!active && active.matches('input[type="text"], textarea');
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
        Player.togglePlay();
        return true;
      }
    }
    return false;
  }
  function init() {
    scheduleEnsureContextFocus();
    const obs = new MutationObserver(() => {
      scheduleEnsureContextFocus();
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true
    });
    window.addEventListener("focus", scheduleEnsureContextFocus, true);
    window.addEventListener("resize", scheduleEnsureContextFocus);
    ["player", "detail", "search-view"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const panelObs = new MutationObserver(scheduleEnsureContextFocus);
      panelObs.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
    document.querySelectorAll("#nav-q, #sv-input").forEach((input) => {
      input.addEventListener("blur", scheduleEnsureContextFocus);
    });
    window.addEventListener("beforeunload", () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }
  return { init, handleKeydown, ensureContextFocus };
})();
window.TVFocus = TVFocus;
window.addEventListener("DOMContentLoaded", () => {
  TVFocus.init();
});
