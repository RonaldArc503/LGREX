"use strict";
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const Search = /* @__PURE__ */ (() => {
  let timer = null;
  const cache = {};
  function open() {
    document.getElementById("search-view").classList.add("open");
    document.getElementById("sv-input").focus();
  }
  function close() {
    document.getElementById("search-view").classList.remove("open");
    document.getElementById("nav-q").value = "";
    document.getElementById("sv-input").value = "";
  }
  function handle(q) {
    document.getElementById("sv-input").value = q;
    document.getElementById("nav-q").value = q;
    clearTimeout(timer);
    const r = document.getElementById("sv-results");
    if (!q.trim()) {
      r.innerHTML = '<div class="sv-empty">Escribe para buscar contenido</div>';
      return;
    }
    r.innerHTML = `<div class="sv-loading">
      <div class="mini-spinner" style="display:inline-block;margin-right:8px"></div> Buscando...
    </div>`;
    timer = setTimeout(() => _doSearch(q), 450);
  }
  function _doSearch(q) {
    return __async(this, null, function* () {
      const r = document.getElementById("sv-results");
      if (cache[q]) {
        _render(cache[q], q);
        return;
      }
      const raw = yield Api.fetchSearch(q);
      const items = raw.map((i) => Api.normalizeItem(i, "movie"));
      items.forEach(Store.save);
      cache[q] = items;
      _render(items, q);
    });
  }
  function _render(items, q) {
    const r = document.getElementById("sv-results");
    r.innerHTML = "";
    if (!items.length) {
      r.innerHTML = `<div class="sv-empty">Sin resultados para "${q || ""}"</div>`;
      return;
    }
    items.forEach((item) => r.appendChild(Cards.buildCard(item, item.type === "anime")));
  }
  return { open, close, handle };
})();
