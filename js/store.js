"use strict";
// ══════════════════════════════════════════════════
//  STORE — centralised state
// ══════════════════════════════════════════════════
const Store = (() => {
  const _itemMap = {};
  const _loaded  = {};

  function save(item)     { if (item?.id) _itemMap[String(item.id)] = item; }
  function saveAll(items) { items.forEach(save); }
  function get(id)        { return _itemMap[String(id)]; }
  function all()          { return Object.values(_itemMap); }

  function isLoaded(key)  { return !!_loaded[key]; }
  function markLoaded(key){ _loaded[key] = true; }

  return { save, saveAll, get, all, isLoaded, markLoaded };
})();
