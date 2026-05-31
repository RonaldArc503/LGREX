"use strict";
// ══════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════
const Search = (() => {
  let timer = null;
  const cache = {};

  function open() {
    document.getElementById('search-view').classList.add('open');
    document.getElementById('sv-input').focus();
  }

  function close() {
    document.getElementById('search-view').classList.remove('open');
    document.getElementById('nav-q').value   = '';
    document.getElementById('sv-input').value = '';
  }

  function handle(q) {
    document.getElementById('sv-input').value = q;
    document.getElementById('nav-q').value    = q;
    clearTimeout(timer);
    const r = document.getElementById('sv-results');
    if (!q.trim()) {
      r.innerHTML = '<div class="sv-empty">Escribe para buscar contenido</div>';
      return;
    }
    r.innerHTML = `<div class="sv-loading">
      <div class="mini-spinner" style="display:inline-block;margin-right:8px"></div> Buscando...
    </div>`;
    timer = setTimeout(() => _doSearch(q), 450);
  }

  async function _doSearch(q) {
    const r = document.getElementById('sv-results');
    if (cache[q]) { _render(cache[q], q); return; }

    const raw   = await Api.fetchSearch(q);
    const items = raw.map(i => Api.normalizeItem(i, 'movie'));
    items.forEach(Store.save);
    cache[q] = items;
    _render(items, q);
  }

  function _render(items, q) {
    const r = document.getElementById('sv-results');
    r.innerHTML = '';
    if (!items.length) {
      r.innerHTML = `<div class="sv-empty">Sin resultados para "${q || ''}"</div>`;
      return;
    }
    items.forEach(item => r.appendChild(Cards.buildCard(item, item.type === 'anime')));
  }

  return { open, close, handle };
})();
