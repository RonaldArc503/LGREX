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
const Sections = /* @__PURE__ */ (() => {
  function loadHome() {
    return __async(this, null, function* () {
      if (Store.isLoaded("home")) return;
      Store.markLoaded("home");
      const c = document.getElementById("rows-home");
      const t1 = _addSpinner(c, "\u{1F3C6} Top pel\xEDculas del mes");
      const t2 = _addSpinner(c, "\u{1F3C6} Top series del mes");
      const t3 = _addSpinner(c, "\u{1F3C6} Top anime del mes");
      const r1 = _addSpinner(c, "\u{1F525} Pel\xEDculas en tendencia");
      const r2 = _addSpinner(c, "\u{1F4FA} Series populares");
      const r3 = _addSpinner(c, "\u{1F38C} Anime destacado");
      const r4 = _addSpinner(c, "\u{1F4E1} Canales en vivo");
      const [topM, topS, topA, rawM, rawS, rawA] = yield Promise.all([
        Api.fetchTops("movies", "month", 30),
        Api.fetchTops("tvshows", "month", 30),
        Api.fetchTops("animes", "month", 30),
        Api.fetchListing("movies", 1, 20),
        Api.fetchListing("tvshows", 1, 20),
        Api.fetchListing("animes", 1, 20)
      ]);
      const topMovies = topM.map((i) => Api.normalizeItem(i, "movie"));
      const topSeries = topS.map((i) => Api.normalizeItem(i, "tvshows"));
      const topAnime = topA.map((i) => Api.normalizeItem(i, "anime"));
      const mItems = rawM.map((i) => Api.normalizeItem(i, "movie"));
      const sItems = rawS.map((i) => Api.normalizeItem(i, "tvshows"));
      const aItems = rawA.map((i) => Api.normalizeItem(i, "anime"));
      Store.saveAll([...topMovies, ...topSeries, ...topAnime, ...mItems, ...sItems, ...aItems, ...CHANNELS]);
      yield Api.enrichArtwork([...topMovies, ...topSeries, ...topAnime, ...mItems, ...sItems, ...aItems]);
      const heroList = topMovies.length ? topMovies.slice(0, 6) : mItems.slice(0, 6);
      if (heroList.length) {
        document.getElementById("hero-loading").classList.add("hidden");
        Hero.setItems(heroList);
        Hero.render(heroList[0]);
        Hero.buildDots(heroList.length);
        Hero.startAuto();
      } else {
        _showHeroError();
      }
      _fillRow(t1, "\u{1F3C6} Top pel\xEDculas del mes", topMovies);
      _fillRow(t2, "\u{1F3C6} Top series del mes", topSeries);
      _fillRow(t3, "\u{1F3C6} Top anime del mes", topAnime, true);
      _fillRow(r1, "\u{1F525} Pel\xEDculas en tendencia", mItems);
      _fillRow(r2, "\u{1F4FA} Series populares", sItems);
      _fillRow(r3, "\u{1F38C} Anime destacado", aItems, true);
      _fillRow(r4, "\u{1F4E1} Canales en vivo", CHANNELS, false, true);
      _loadExtraHome(c);
    });
  }
  function _loadExtraHome(c) {
    return __async(this, null, function* () {
      const [rawM2, rawS2, rawA2] = yield Promise.all([
        Api.fetchListing("movies", 2, 20),
        Api.fetchListing("tvshows", 2, 20),
        Api.fetchListing("animes", 2, 20)
      ]);
      const m2 = rawM2.map((i) => Api.normalizeItem(i, "movie"));
      const s2 = rawS2.map((i) => Api.normalizeItem(i, "tvshows"));
      const a2 = rawA2.map((i) => Api.normalizeItem(i, "anime"));
      Store.saveAll([...m2, ...s2, ...a2]);
      if (m2.length) Cards.buildRow("rows-home", "\u{1F3AC} M\xE1s pel\xEDculas", m2);
      if (s2.length) Cards.buildRow("rows-home", "\u{1F4FA} M\xE1s series", s2);
      if (a2.length) Cards.buildRow("rows-home", "\u{1F38C} M\xE1s anime", a2, true);
    });
  }
  function loadSection(section) {
    return __async(this, null, function* () {
      if (Store.isLoaded(section)) return;
      Store.markLoaded(section);
      const typeMap = { movies: "movies", series: "tvshows", animes: "animes" };
      const labelMap = { movies: "Pel\xEDculas", series: "Series", animes: "Anime" };
      const postType = typeMap[section];
      const portrait = section === "animes";
      const c = document.getElementById("rows-" + section);
      const h = document.createElement("h2");
      h.className = "section-heading";
      h.textContent = labelMap[section] || section.toUpperCase();
      c.appendChild(h);
      const sp = document.createElement("div");
      sp.className = "row-spinner";
      sp.innerHTML = `<div class="mini-spinner"></div> Cargando ${labelMap[section] || section}...`;
      c.appendChild(sp);
      const [p1, p2, p3] = yield Promise.all([
        Api.fetchListing(postType, 1, 20),
        Api.fetchListing(postType, 2, 20),
        Api.fetchListing(postType, 3, 20)
      ]);
      sp.remove();
      const all = [...p1, ...p2, ...p3].map((i) => Api.normalizeItem(i, postType));
      yield Api.enrichArtwork(all);
      Store.saveAll(all);
      if (!all.length) {
        c.insertAdjacentHTML(
          "beforeend",
          '<div style="padding:40px 60px;color:var(--text3)">No se encontr\xF3 contenido.</div>'
        );
        return;
      }
      Cards.buildRow("rows-" + section, "\u2B50 M\xE1s populares", all.slice(0, 20), portrait);
      if (all.length > 20) Cards.buildRow("rows-" + section, "\u{1F195} Nuevos lanzamientos", all.slice(20, 40), portrait);
      if (all.length > 40) Cards.buildRow("rows-" + section, "\u{1F3AF} Recomendados", all.slice(40, 60), portrait);
    });
  }
  function loadChannels() {
    if (Store.isLoaded("channels")) return;
    Store.markLoaded("channels");
    Store.saveAll(CHANNELS);
    const c = document.getElementById("rows-channels");
    const h = document.createElement("h2");
    h.className = "section-heading";
    h.textContent = "CANALES EN VIVO";
    c.appendChild(h);
    Cards.buildRow("rows-channels", "\u{1F4E1} Canales Salvadore\xF1os y Regionales", CHANNELS, false, true);
  }
  function _addSpinner(container, label) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div class="row-title">${label}</div>
      <div class="row-spinner"><div class="mini-spinner"></div> Cargando...</div>`;
    container.appendChild(row);
    return row;
  }
  function _fillRow(row, title, items, portrait = false, channel = false) {
    row.innerHTML = `<div class="row-title">${title} <span class="row-more">Ver todo \u203A</span></div>`;
    const sc = document.createElement("div");
    sc.className = "row-scroll";
    items.forEach((i) => sc.appendChild(Cards.buildCard(i, portrait, channel)));
    row.appendChild(sc);
  }
  function _showHeroError() {
    document.getElementById("hero-loading").innerHTML = `
      <div style="text-align:center;padding:40px;max-width:480px">
        <div style="font-size:36px;margin-bottom:14px">\u26A0\uFE0F</div>
        <div style="font-size:17px;font-weight:600;margin-bottom:8px">No se pudo cargar el cat\xE1logo</div>
        <div style="font-size:13px;color:var(--text3);line-height:1.6;margin-bottom:18px">
          Verifica la conexi\xF3n de red del TV.
        </div>
        <button onclick="Store.markLoaded.call(Store,'home',false);Sections.loadHome()"
          style="padding:10px 22px;background:var(--accent);border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px">
          \u{1F504} Reintentar
        </button>
      </div>`;
  }
  return { loadHome, loadSection, loadChannels };
})();
