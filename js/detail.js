"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
const Detail = /* @__PURE__ */ (() => {
  let current = null;
  let seasonsData = null;
  let currentSeason = 1;
  let seasonSelectKeyHandler = null;
  let seasonSelectChangeHandler = null;
  function _sortedSeasonsMap(mapLike) {
    const seasons = /* @__PURE__ */ new Map();
    if (!mapLike) return seasons;
    const entries = mapLike instanceof Map ? Array.from(mapLike.entries()) : Object.entries(mapLike);
    entries.forEach(([seasonKey, list]) => {
      const seasonNumber = Number(seasonKey || 1);
      if (!Array.isArray(list)) return;
      if (!seasons.has(seasonNumber)) seasons.set(seasonNumber, []);
      list.forEach((ep, index) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const sn = Number((_d = (_c = (_b = (_a = ep == null ? void 0 : ep.season) != null ? _a : ep == null ? void 0 : ep.temporada) != null ? _b : ep == null ? void 0 : ep.season_number) != null ? _c : seasonNumber) != null ? _d : 1);
        if (!seasons.has(sn)) seasons.set(sn, []);
        const fallbackNumber = Number((_g = (_f = (_e = ep == null ? void 0 : ep.episode) != null ? _e : ep == null ? void 0 : ep.number) != null ? _f : ep == null ? void 0 : ep.episodio) != null ? _g : index + 1);
        seasons.get(sn).push(__spreadProps(__spreadValues({}, ep), {
          season: sn,
          number: fallbackNumber,
          episode: fallbackNumber
        }));
      });
    });
    for (const [sn, list] of seasons) {
      list.sort((a, b) => {
        var _a, _b, _c, _d;
        return Number((_b = (_a = a.number) != null ? _a : a.episode) != null ? _b : 0) - Number((_d = (_c = b.number) != null ? _c : b.episode) != null ? _d : 0);
      });
      seasons.set(sn, list);
    }
    return seasons;
  }
  function _updatePlayButtonLabel() {
    var _a;
    const pb = document.getElementById("d-play-btn");
    if (!pb) return;
    if (current == null ? void 0 : current.isLive) {
      pb.className = "d-play-btn live";
      pb.innerHTML = "\u25CF Ver en Vivo";
      return;
    }
    pb.className = "d-play-btn";
    if (seasonsData && seasonsData.size) {
      const firstSeason = Array.from(seasonsData.keys()).sort((a, b) => Number(a) - Number(b))[0] || 1;
      const firstCount = ((_a = seasonsData.get(firstSeason)) == null ? void 0 : _a.length) || 0;
      pb.innerHTML = firstCount ? `\u25B6 Reproducir T${firstSeason} E1` : "\u25B6 Reproducir";
    } else {
      pb.innerHTML = "\u25B6 Reproducir";
    }
  }
  function _seasonNumbers() {
    return Array.from((seasonsData == null ? void 0 : seasonsData.keys()) || []).sort((a, b) => Number(a) - Number(b));
  }
  function _switchSeasonByOffset(offset) {
    const seasonNums = _seasonNumbers();
    if (!seasonNums.length) return;
    const currentIndex = Math.max(0, seasonNums.indexOf(Number(currentSeason)));
    const nextIndex = Math.min(seasonNums.length - 1, Math.max(0, currentIndex + offset));
    currentSeason = Number(seasonNums[nextIndex]);
    renderEpisodes(currentSeason);
    const select = document.getElementById("d-season-select");
    if (select) select.value = String(currentSeason);
  }
  function _moveSeasonSelectByOffset(select, offset) {
    const seasonNums = _seasonNumbers();
    if (!seasonNums.length || !select) return;
    const currentValue = Number(select.value || currentSeason || seasonNums[0]);
    const currentIndex = Math.max(0, seasonNums.indexOf(currentValue));
    const nextIndex = Math.min(seasonNums.length - 1, Math.max(0, currentIndex + offset));
    select.value = String(seasonNums[nextIndex]);
  }
  function _focusFirstEpisode() {
    const firstEpisode = document.querySelector("#d-eps-list .ep-row");
    if (firstEpisode) firstEpisode.focus();
  }
  function open(item) {
    return __async(this, null, function* () {
      if (!item) return;
      current = item;
      seasonsData = null;
      document.getElementById("d-title").textContent = item.title || "";
      document.getElementById("d-match").textContent = item.match ? item.match + "% coincidencia" : "";
      document.getElementById("d-year").textContent = item.year || "";
      document.getElementById("d-dur").textContent = item.dur || "";
      document.getElementById("d-desc").textContent = item.desc || "Cargando informaci\xF3n...";
      document.getElementById("d-cast").innerHTML = item.cast ? `<span>Reparto:</span> ${item.cast}` : "";
      const bd = document.getElementById("d-backdrop");
      const bs = item.backdrop || item.poster || item.img || "";
      bd.src = bs;
      bd.style.display = bs ? "block" : "none";
      const tags = document.getElementById("d-tags");
      tags.innerHTML = "";
      (item.tags || [item.genre].filter(Boolean)).slice(0, 6).forEach((t) => {
        const s = document.createElement("span");
        s.className = "d-tag";
        s.textContent = t;
        tags.appendChild(s);
      });
      _updatePlayButtonLabel();
      document.getElementById("d-eps-section").style.display = "none";
      document.getElementById("d-servers-section").style.display = "none";
      const wasOpen = document.getElementById("detail").classList.contains("open");
      document.getElementById("detail").classList.add("open");
      document.body.style.overflow = "hidden";
      if (!wasOpen && window.Navigation) Navigation.recordOverlay("detail");
      if (item.postId && !item.isLive) {
        const loadedEpisodes = yield loadEpisodes(item);
        if (!loadedEpisodes) {
          yield loadServers(item);
        }
      }
    });
  }
  function close(options = {}) {
    document.getElementById("detail").classList.remove("open");
    document.body.style.overflow = "";
    if (!options.skipHistory && window.Navigation) Navigation.closeOverlayHistorySafe();
  }
  function outsideClick(e) {
    if (e.target === document.getElementById("detail")) close();
  }
  function play() {
    if (!current) return;
    if (current.isLive) {
      close();
      Player.open(current);
      return;
    }
    if (seasonsData && seasonsData.size) {
      const firstSeason = Array.from(seasonsData.keys()).sort((a, b) => Number(a) - Number(b))[0];
      const eps = seasonsData.get(firstSeason) || Array.from(seasonsData.values())[0] || [];
      if (eps.length) {
        close();
        Player.openEpisode(current, eps, 0, seasonsData);
        return;
      }
    }
    close();
    Player.open(current);
  }
  function loadServers(item) {
    return __async(this, null, function* () {
      const data = yield Api.fetchPlayer(item.postId);
      if (!data) return;
      current._playerData = data;
      const embed = Api.extractEmbed(data);
      if (embed) current.embedUrl = embed;
      const servers = Api.extractPlayerSources(data);
      if (!servers.length) return;
      current._servers = servers;
      const tab = document.getElementById("d-server-tabs");
      tab.innerHTML = "";
      servers.forEach((s, i) => {
        const b = document.createElement("div");
        b.className = "server-tab" + (i === 0 ? " active" : "");
        b.tabIndex = 0;
        b.setAttribute("role", "button");
        b.textContent = s.name || s.server || s.label || "Servidor " + (i + 1);
        b.onclick = () => {
          tab.querySelectorAll(".server-tab").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          const u = s.url || s.embed || s.embed_url || s.iframe || s.file || "";
          if (u) current.embedUrl = u;
        };
        tab.appendChild(b);
      });
      document.getElementById("d-servers-section").style.display = "block";
    });
  }
  function loadEpisodes(item) {
    return __async(this, null, function* () {
      const data = yield Api.fetchEpisodes(item.postId);
      if (!data || !data.seasons || !data.seasons.size) return false;
      seasonsData = _sortedSeasonsMap(data.seasons);
      const seasonNums = Array.from(seasonsData.keys()).sort((a, b) => a - b);
      currentSeason = seasonNums[0];
      const wrap = document.getElementById("d-season-select-wrap");
      const select = document.getElementById("d-season-select");
      select.innerHTML = "";
      if (seasonNums.length > 1) {
        seasonNums.forEach((sn) => {
          const opt = document.createElement("option");
          opt.value = sn;
          opt.textContent = `Temporada ${sn}`;
          select.appendChild(opt);
        });
        wrap.style.display = "block";
      } else {
        wrap.style.display = "none";
      }
      select.value = String(currentSeason);
      if (seasonSelectKeyHandler) {
        select.removeEventListener("keydown", seasonSelectKeyHandler);
      }
      if (seasonSelectChangeHandler) {
        select.removeEventListener("change", seasonSelectChangeHandler);
      }
      seasonSelectKeyHandler = (e) => {
        const key = e.key;
        if (key === "ArrowDown") {
          e.preventDefault();
          _focusFirstEpisode();
        } else if (key === "ArrowUp") {
          e.preventDefault();
        } else if (key === "ArrowRight") {
          e.preventDefault();
          _moveSeasonSelectByOffset(select, 1);
        } else if (key === "ArrowLeft") {
          e.preventDefault();
          _moveSeasonSelectByOffset(select, -1);
        } else if (key === "Enter") {
          e.preventDefault();
          onSeasonChange(select.value);
        }
      };
      select.addEventListener("keydown", seasonSelectKeyHandler);
      seasonSelectChangeHandler = () => {
        onSeasonChange(select.value);
      };
      select.addEventListener("change", seasonSelectChangeHandler);
      renderEpisodes(currentSeason);
      document.getElementById("d-eps-section").style.display = "block";
      _updatePlayButtonLabel();
      return true;
    });
  }
  
  function openWatchPage() {
    if (!current) return;
    const url = `detallecontenido.html?id=${encodeURIComponent(current.postId)}&type=${encodeURIComponent(current.type||'movie')}&title=${encodeURIComponent(current.title||'')}`;
    window.location.href = url;
  }

  function onSeasonChange(val) {
    currentSeason = Number(val);
    renderEpisodes(currentSeason);
    const select = document.getElementById("d-season-select");
    if (select) select.value = String(currentSeason);
  }
  function renderEpisodes(seasonNum) {
    const list = document.getElementById("d-eps-list");
    list.innerHTML = "";
    const seasonKeys = Array.from((seasonsData == null ? void 0 : seasonsData.keys()) || []).sort((a, b) => Number(a) - Number(b));
    const activeSeason = Number(seasonNum || currentSeason || seasonKeys[0] || 1);
    const eps = (seasonsData == null ? void 0 : seasonsData.get(activeSeason)) || [];
    const heading = document.getElementById("d-eps-heading");
    if (heading) heading.textContent = (seasonsData == null ? void 0 : seasonsData.size) > 1 ? `Temporada ${activeSeason}` : "Episodios";
    const wrap = document.getElementById("d-season-select-wrap");
    if (wrap) wrap.title = `${(seasonsData == null ? void 0 : seasonsData.size) || 0} temporadas \xB7 ${eps.length} episodios`;
    const countLabel = document.getElementById("d-season-count");
    if (countLabel) countLabel.textContent = `${eps.length} episodios`;
    if (!eps.length) {
      list.innerHTML = '<div style="padding:24px 4px;color:var(--text3)">No hay episodios para esta temporada.</div>';
      return;
    }
    eps.sort((a, b) => {
      var _a, _b, _c, _d;
      return Number((_b = (_a = a.number) != null ? _a : a.episode) != null ? _b : 0) - Number((_d = (_c = b.number) != null ? _c : b.episode) != null ? _d : 0);
    });
    eps.forEach((ep, i) => {
      var _a, _b, _c, _d;
      const row = document.createElement("div");
      row.className = "ep-row";
      const thumb = Api.imgUrl(ep.thumbnail || ep.thumb || ep.image || ((_a = ep.images) == null ? void 0 : _a.poster) || "");
      const num = (_d = (_c = (_b = ep.number) != null ? _b : ep.episode) != null ? _c : ep.episodio) != null ? _d : i + 1;
      const title = ep.title || ep.name || `Episodio ${num}`;
      const desc = ep.overview || ep.description || ep.desc || "";
      const dur = ep.runtime ? ep.runtime + "min" : "";
      row.innerHTML = `
        <div class="ep-num">${num}</div>
        <div class="ep-thumb">
          ${thumb ? `<img src="${thumb}" alt="">` : ""}
          <div class="ep-play-icon">\u25B6</div>
        </div>
        <div class="ep-info">
          <div class="ep-title">${title}</div>
          <div class="ep-desc">${desc}</div>
          <div class="ep-meta-row">
            ${ep.air_date ? `<span>${String(ep.air_date).slice(0, 10)}</span>` : ""}
            ${dur ? `<span>${dur}</span>` : ""}
          </div>
        </div>
        <div class="ep-dur">${dur}</div>`;
      row.onclick = () => {
        close();
        Player.openEpisode(current, eps, i, seasonsData);
      };
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      list.appendChild(row);
    });
  }
  return { open, close, outsideClick, play, onSeasonChange, openWatchPage };
})();