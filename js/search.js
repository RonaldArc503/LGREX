"use strict";
var __async = function(__this, __arguments, generator) {
  return new Promise(function(resolve, reject) {
    var fulfilled = function(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = function(value) {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = function(x) {
      return x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    };
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var Search = (function() {
  var timer = null;
  var cache = {};
  function open() {
    var s = document.getElementById("search-view");
    var wasOpen = s && s.classList.contains("open");
    if (s) s.classList.add("open");
    var input = document.getElementById("sv-input");
    if (input) input.focus();
    if (!wasOpen && window.Navigation) Navigation.recordOverlay("search");
  }
  function close(options) {
    if (!options) options = {};
    var s = document.getElementById("search-view");
    if (s) s.classList.remove("open");
    var q1 = document.getElementById("nav-q");
    if (q1) q1.value = "";
    var q2 = document.getElementById("sv-input");
    if (q2) q2.value = "";
    if (!options.skipHistory && window.Navigation) Navigation.closeOverlayHistorySafe();
  }
  function handle(q) {
    var q2 = document.getElementById("sv-input");
    if (q2) q2.value = q;
    var q1 = document.getElementById("nav-q");
    if (q1) q1.value = q;
    clearTimeout(timer);
    var r = document.getElementById("sv-results");
    if (!r) return;
    if (!q.trim()) {
      r.innerHTML = '<div class="sv-empty">Escribe para buscar contenido</div>';
      return;
    }
    r.innerHTML = '<div class="sv-loading">' +
      '<div class="mini-spinner" style="display:inline-block;margin-right:8px"></div> Buscando...' +
    '</div>';
    timer = setTimeout(function() { _doSearch(q); }, 450);
  }
  function _doSearch(q) {
    return __async(this, null, function* () {
      if (cache[q]) {
        _render(cache[q], q);
        return;
      }
      var raw = yield Api.fetchSearch(q);
      var items = raw.map(function(i) { return Api.normalizeItem(i, "movie"); });
      items.forEach(function(it) { if (window.Store) Store.save(it); });
      cache[q] = items;
      _render(items, q);
    });
  }
  function _render(items, q) {
    var r = document.getElementById("sv-results");
    if (!r) return;
    r.innerHTML = "";
    if (!items.length) {
      r.innerHTML = '<div class="sv-empty">Sin resultados para "' + (q || "") + '"</div>';
      return;
    }
    items.forEach(function(item) { r.appendChild(Cards.buildCard(item, item.type === "anime")); });
  }
  return { open: open, close: close, handle: handle };
})();
