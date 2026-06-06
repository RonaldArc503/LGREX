"use strict";
var Sections = (function() {
  function loadHome() {
    if (Store.isLoaded("home")) return Promise.resolve();
    Store.markLoaded("home");
    var c = document.getElementById("rows-home");
    if (!c) return Promise.resolve();
    var t1 = _addSpinner(c, "🏆 Top películas del mes");
    var t2 = _addSpinner(c, "🏆 Top series del mes");
    var t3 = _addSpinner(c, "🏆 Top anime del mes");
    var r1 = _addSpinner(c, "🔥 Películas en tendencia");
    var r2 = _addSpinner(c, "📺 Series populares");
    var r3 = _addSpinner(c, "🚩 Anime destacado");
    var r4 = _addSpinner(c, "📡 Canales en vivo");
    
    return Promise.all([
      Api.fetchTops("movies", "month", 30),
      Api.fetchTops("tvshows", "month", 30),
      Api.fetchTops("animes", "month", 30),
      Api.fetchListing("movies", 1, 20),
      Api.fetchListing("tvshows", 1, 20),
      Api.fetchListing("animes", 1, 20)
    ]).then(function(data) {
      var topM = data[0], topS = data[1], topA = data[2], rawM = data[3], rawS = data[4], rawA = data[5];

      var topMovies = topM.map(function(i) { return Api.normalizeItem(i, "movie"); });
      var topSeries = topS.map(function(i) { return Api.normalizeItem(i, "tvshows"); });
      var topAnime = topA.map(function(i) { return Api.normalizeItem(i, "anime"); });
      var mItems = rawM.map(function(i) { return Api.normalizeItem(i, "movie"); });
      var sItems = rawS.map(function(i) { return Api.normalizeItem(i, "tvshows"); });
      var aItems = rawA.map(function(i) { return Api.normalizeItem(i, "anime"); });
      
      Store.saveAll(topMovies.concat(topSeries, topAnime, mItems, sItems, aItems, CHANNELS));
      
      return Api.enrichArtwork(topMovies.concat(topSeries, topAnime, mItems, sItems, aItems)).then(function() {
        var heroList = topMovies.length ? topMovies.slice(0, 6) : mItems.slice(0, 6);
        if (heroList.length) {
          var hl = document.getElementById("hero-loading");
          if (hl) hl.classList.add("hidden");
          Hero.setItems(heroList);
          Hero.render(heroList[0]);
          Hero.buildDots(heroList.length);
          Hero.startAuto();
        } else {
          _showHeroError();
        }
        
        _fillRow(t1, "🏆 Top películas del mes", topMovies);
        _fillRow(t2, "🏆 Top series del mes", topSeries);
        _fillRow(t3, "🏆 Top anime del mes", topAnime, true);
        _fillRow(r1, "🔥 Películas en tendencia", mItems);
        _fillRow(r2, "📺 Series populares", sItems);
        _fillRow(r3, "🚩 Anime destacado", aItems, true);
        _fillRow(r4, "📡 Canales en vivo", CHANNELS, false, true);
        return _loadExtraHome(c);
      });
    });
  }

  function _loadExtraHome(c) {
    return Promise.all([
      Api.fetchListing("movies", 2, 20),
      Api.fetchListing("tvshows", 2, 20),
      Api.fetchListing("animes", 2, 20)
    ]).then(function(data) {
      var rawM2 = data[0], rawS2 = data[1], rawA2 = data[2];
      var m2 = rawM2.map(function(i) { return Api.normalizeItem(i, "movie"); });
      var s2 = rawS2.map(function(i) { return Api.normalizeItem(i, "tvshows"); });
      var a2 = rawA2.map(function(i) { return Api.normalizeItem(i, "anime"); });
      Store.saveAll(m2.concat(s2, a2));
      if (m2.length) Cards.buildRow("rows-home", "🎬 Más películas", m2);
      if (s2.length) Cards.buildRow("rows-home", "📺 Más series", s2);
      if (a2.length) Cards.buildRow("rows-home", "🚩 Más anime", a2, true);
    });
  }

  function loadSection(section) {
    if (Store.isLoaded(section)) return Promise.resolve();
    Store.markLoaded(section);
    var typeMap = { movies: "movies", series: "tvshows", animes: "animes" };
    var labelMap = { movies: "Películas", series: "Series", animes: "Anime" };
    var postType = typeMap[section];
    var portrait = section === "animes";
    var c = document.getElementById("rows-" + section);
    if (!c) return Promise.resolve();
    var h = document.createElement("h2");
    h.className = "section-heading";
    h.textContent = labelMap[section] || section.toUpperCase();
    c.appendChild(h);
    var sp = document.createElement("div");
    sp.className = "row-spinner";
    sp.innerHTML = '<div class="mini-spinner"></div> Cargando ' + (labelMap[section] || section) + '...';
    c.appendChild(sp);
    
    return Promise.all([
      Api.fetchListing(postType, 1, 20),
      Api.fetchListing(postType, 2, 20),
      Api.fetchListing(postType, 3, 20)
    ]).then(function(data) {
      var p1 = data[0], p2 = data[1], p3 = data[2];
      sp.parentNode && sp.parentNode.removeChild(sp);
      var all = p1.concat(p2, p3).map(function(i) { return Api.normalizeItem(i, postType); });
      return Api.enrichArtwork(all).then(function() {
        Store.saveAll(all);
        if (!all.length) {
          c.insertAdjacentHTML(
            "beforeend",
            '<div style="padding:40px 60px;color:var(--text3)">No se encontró contenido.</div>'
          );
          return;
        }
        Cards.buildRow("rows-" + section, "⭐ Más populares", all.slice(0, 20), portrait);
        if (all.length > 20) Cards.buildRow("rows-" + section, "🆕 Nuevos lanzamientos", all.slice(20, 40), portrait);
        if (all.length > 40) Cards.buildRow("rows-" + section, "🎯 Recomendados", all.slice(40, 60), portrait);
      });
    });
  }

  function loadChannels() {
    if (Store.isLoaded("channels")) return;
    Store.markLoaded("channels");
    Store.saveAll(CHANNELS);
    var c = document.getElementById("rows-channels");
    if (!c) return;
    var h = document.createElement("h2");
    h.className = "section-heading";
    h.textContent = "CANALES EN VIVO";
    c.appendChild(h);
    Cards.buildRow("rows-channels", "📡 Canales Salvadoreños y Regionales", CHANNELS, false, true);
  }
  
  function loadFootball() {
    if (typeof Football !== "undefined") Football.load();
  }

  function _addSpinner(container, label) {
    var row = document.createElement("div");
    row.className = "row";
    row.innerHTML = '<div class="row-title">' + label + '</div>' +
      '<div class="row-spinner"><div class="mini-spinner"></div> Cargando...</div>';
    container.appendChild(row);
    return row;
  }
  function _fillRow(row, title, items, portrait, channel) {
    row.innerHTML = '<div class="row-title">' + title + ' <span class="row-more">Ver todo ›</span></div>';
    var sc = document.createElement("div");
    sc.className = "row-scroll";
    items.forEach(function(i) { sc.appendChild(Cards.buildCard(i, portrait, channel)); });
    row.appendChild(sc);
  }
  function _showHeroError() {
    var hl = document.getElementById("hero-loading");
    if (!hl) return;
    hl.innerHTML = 
      '<div style="text-align:center;padding:40px;max-width:480px">' +
        '<div style="font-size:36px;margin-bottom:14px">⚠️</div>' +
        '<div style="font-size:17px;font-weight:600;margin-bottom:8px">No se pudo cargar el catálogo</div>' +
        '<div style="font-size:13px;color:var(--text3);line-height:1.6;margin-bottom:18px">' +
          'Verifica la conexión de red del TV.' +
        '</div>' +
        '<button onclick="Store.markLoaded.call(Store,\'home\',false);Sections.loadHome()" ' +
          'style="padding:10px 22px;background:var(--accent);border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px">' +
          '🔄 Reintentar' +
        '</button>' +
      '</div>';
  }
  return { loadHome: loadHome, loadSection: loadSection, loadChannels: loadChannels, loadFootball: loadFootball };
})();
