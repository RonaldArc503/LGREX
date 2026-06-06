"use strict";
var Store = (function() {
  var _itemMap = {};
  var _loaded = {};
  function save(item) {
    if (item && item.id) _itemMap[String(item.id)] = item;
  }
  function saveAll(items) {
    if (Array.isArray(items)) {
      items.forEach(save);
    }
  }
  function get(id) {
    return _itemMap[String(id)];
  }
  function all() {
    var keys = Object.keys(_itemMap);
    var results = [];
    for (var i = 0; i < keys.length; i++) {
      results.push(_itemMap[keys[i]]);
    }
    return results;
  }
  function isLoaded(key) {
    return !!_loaded[key];
  }
  function markLoaded(key, val) {
    if (val === undefined) val = true;
    _loaded[key] = val;
  }
  return { save: save, saveAll: saveAll, get: get, all: all, isLoaded: isLoaded, markLoaded: markLoaded };
})();
