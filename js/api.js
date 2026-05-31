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
const Api = /* @__PURE__ */ (() => {
  const tmdbCache = /* @__PURE__ */ new Map();
  let tmdbBackoffUntil = 0;
  let tmdbFailStreak = 0;
  function unwrapApiData(payload) {
    var _a, _b, _c;
    if (!payload || typeof payload !== "object") return payload;
    return (_c = (_b = (_a = payload.data) != null ? _a : payload.result) != null ? _b : payload.payload) != null ? _c : payload;
  }
  function cleanUrl(url) {
    if (!url || typeof url !== "string") return "";
    return url.trim().replace(/^\[|\]$/g, "").replace(/\\u0026/g, "&").replace(/\\/g, "/");
  }
  function cleanTmdbQuery(title) {
    return String(title || "").replace(/\(\d{4}\)/g, " ").replace(/\d{4}/g, " ").replace(/[\[\]{}]/g, " ").replace(/[:|\-_/]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function fetchTmdbCandidates(query, mediaType = "multi", year = "") {
    return __async(this, null, function* () {
      const q = cleanTmdbQuery(query);
      if (!q) return [];
      if (Date.now() < tmdbBackoffUntil) return [];
      const cacheKey = `${mediaType}|${q}|${year || ""}`;
      if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);
      const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        query: q,
        include_adult: "false",
        language: "es-ES"
      });
      if (year) {
        if (mediaType === "tv") params.set("first_air_date_year", year);
        else params.set("year", year);
      }
      const tries = mediaType === "movie" ? ["movie", "multi"] : mediaType === "tv" ? ["tv", "multi"] : ["multi", "movie", "tv"];
      let results = [];
      for (const type of tries) {
        try {
          const url = `${TMDB_API_BASE}/search/${type}?${params.toString()}`;
          const r = yield fetchTimeout(url, {}, 8e3);
          if (!r.ok) {
            if (r.status === 429) {
              tmdbFailStreak += 1;
              tmdbBackoffUntil = Date.now() + 10 * 60 * 1e3;
              break;
            }
            continue;
          }
          const d = yield r.json();
          results = Array.isArray(d == null ? void 0 : d.results) ? d.results : [];
          tmdbFailStreak = 0;
          if (results.length) break;
        } catch (_) {
          tmdbFailStreak += 1;
          if (tmdbFailStreak >= 3) {
            tmdbBackoffUntil = Date.now() + 10 * 60 * 1e3;
            break;
          }
        }
      }
      tmdbCache.set(cacheKey, results);
      return results;
    });
  }
  function tmdbMediaTypeForItem(type) {
    if (type === "movie" || type === "movies") return "movie";
    if (type === "tvshows" || type === "series") return "tv";
    return "multi";
  }
  function enrichItemArtwork(item) {
    return __async(this, null, function* () {
      if (!item) return item;
      const title = item.title || "";
      const year = item.year && /^\d{4}$/.test(String(item.year)) ? String(item.year) : "";
      const results = yield fetchTmdbCandidates(title, tmdbMediaTypeForItem(item.type), year);
      const match = results[0];
      if (!match) {
        if (!item.poster && item.posterApi) item.poster = item.posterApi;
        if (!item.backdrop && item.backdropApi) item.backdrop = item.backdropApi;
        if (!item.logo && item.logoApi) item.logo = item.logoApi;
        return item;
      }
      if (item.poster && !item.posterApi) item.posterApi = item.poster;
      if (item.backdrop && !item.backdropApi) item.backdropApi = item.backdrop;
      if (item.logo && !item.logoApi) item.logoApi = item.logo;
      if (match.poster_path) item.poster = `${TMDB_IMG}${match.poster_path}`;
      else if (!item.poster && item.posterApi) item.poster = item.posterApi;
      if (match.backdrop_path) item.backdrop = `${TMDB_BACK}${match.backdrop_path}`;
      else if (!item.backdrop && item.backdropApi) item.backdrop = item.backdropApi;
      if (match.poster_path) item.logo = `${TMDB_IMG}${match.poster_path}`;
      else if (!item.logo && item.logoApi) item.logo = item.logoApi;
      return item;
    });
  }
  function enrichArtwork(items) {
    return __async(this, null, function* () {
      if (!Array.isArray(items) || !items.length) return items;
      yield Promise.all(items.map(enrichItemArtwork));
      return items;
    });
  }
  function fetchTimeout(url, opts = {}, ms = 8e3) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, __spreadProps(__spreadValues({}, opts), { signal: ctrl.signal })).finally(() => clearTimeout(id));
  }
  function proxiedFetch(url) {
    return __async(this, null, function* () {
      let host = "";
      try {
        host = new URL(url, window.location.href).host.toLowerCase();
      } catch (_) {
      }
      const isAllcalidadApi = /(^|\.)allcalidad\.re$/.test(host);
      if (isAllcalidadApi) {
        try {
          const r = yield fetchTimeout(url, { mode: "cors" }, 6e3);
          if (r.ok) return r;
        } catch (_) {
        }
      }
      const attempts = [
        { kind: "raw", url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
        { kind: "raw", url: `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}` },
        { kind: "allorigins", url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}` },
        { kind: "raw", url: `https://thingproxy.freeboard.io/fetch/${url}` }
      ];
      for (const at of attempts) {
        try {
          const r = yield fetchTimeout(at.url, {}, 8e3);
          if (!r.ok) continue;
          if (at.kind === "allorigins") {
            const d = yield r.json();
            if (!(d == null ? void 0 : d.contents)) continue;
            const text = d.contents;
            return {
              ok: true,
              status: 200,
              text: () => Promise.resolve(text),
              json: () => Promise.resolve(JSON.parse(text))
            };
          }
          return r;
        } catch (_) {
        }
      }
      try {
        const normalized = url.replace(/^https?:\/\//i, "");
        const r = yield fetchTimeout(`https://r.jina.ai/http://${normalized}`, {}, 1e4);
        if (r.ok) return r;
      } catch (_) {
      }
      throw new Error("All proxies failed: " + url);
    });
  }
  function fetchListing(postType, page = 1, perPage = 20) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      try {
        const url = `${API}/listing?page=${page}&post_type=${postType}&posts_per_page=${perPage}`;
        const r = yield proxiedFetch(url);
        const txt = yield r.text();
        const d = JSON.parse(txt);
        const arr = (_e = (_d = (_c = (_b = (_a = d == null ? void 0 : d.data) == null ? void 0 : _a.posts) != null ? _b : d == null ? void 0 : d.posts) != null ? _c : d == null ? void 0 : d.data) != null ? _d : d == null ? void 0 : d.results) != null ? _e : d;
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        console.warn("[fetchListing]", postType, page, e.message);
        return [];
      }
    });
  }
  function fetchTops(postType, range = "month", limit = 30) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      try {
        const url = `${API}/tops?range=${encodeURIComponent(range)}&limit=${limit}&post_type=${encodeURIComponent(postType)}`;
        const r = yield proxiedFetch(url);
        const txt = yield r.text();
        const d = JSON.parse(txt);
        const arr = (_e = (_d = (_c = (_b = (_a = d == null ? void 0 : d.data) == null ? void 0 : _a.posts) != null ? _b : d == null ? void 0 : d.posts) != null ? _c : d == null ? void 0 : d.data) != null ? _d : d == null ? void 0 : d.results) != null ? _e : d;
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        console.warn("[fetchTops]", postType, range, e.message);
        return [];
      }
    });
  }
  function fetchPlayer(postId) {
    return __async(this, null, function* () {
      try {
        const r = yield proxiedFetch(`${API}/player?post_id=${postId}&_any=1`);
        return unwrapApiData(JSON.parse(yield r.text()));
      } catch (e) {
        console.warn("[fetchPlayer]", postId, e.message);
        return null;
      }
    });
  }
  function fetchEpisodes(postId) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      try {
        const r = yield proxiedFetch(`${API}/episodes?post_id=${postId}`);
        const txt = yield r.text();
        const d = JSON.parse(txt);
        const payload = (_e = (_d = (_c = (_b = (_a = d == null ? void 0 : d.data) == null ? void 0 : _a.episodes) != null ? _b : d == null ? void 0 : d.episodes) != null ? _c : d == null ? void 0 : d.data) != null ? _d : d) != null ? _e : [];
        const seasons = /* @__PURE__ */ new Map();
        const addEpisode = (seasonNumber, ep, episodeNumberFallback = 0) => {
          var _a2, _b2, _c2, _d2, _e2;
          const sn = Number(seasonNumber || (ep == null ? void 0 : ep.season) || (ep == null ? void 0 : ep.temporada) || (ep == null ? void 0 : ep.season_number) || 1);
          if (!seasons.has(sn)) seasons.set(sn, []);
          const episodeNumber = Number(
            (_e2 = (_d2 = (_c2 = (_b2 = (_a2 = ep == null ? void 0 : ep.episode) != null ? _a2 : ep == null ? void 0 : ep.number) != null ? _b2 : ep == null ? void 0 : ep.episodio) != null ? _c2 : ep == null ? void 0 : ep.episode_number) != null ? _d2 : episodeNumberFallback) != null ? _e2 : 0
          );
          const episodeSource = (ep == null ? void 0 : ep.title) || (ep == null ? void 0 : ep.name) || (ep == null ? void 0 : ep.label) || (ep == null ? void 0 : ep.episode_title) || "";
          seasons.get(sn).push(__spreadProps(__spreadValues({}, ep), {
            season: sn,
            number: episodeNumber || seasons.get(sn).length + 1,
            episode: episodeNumber || seasons.get(sn).length + 1,
            post_id: (ep == null ? void 0 : ep.post_id) || (ep == null ? void 0 : ep._id) || (ep == null ? void 0 : ep.id) || (ep == null ? void 0 : ep.postId) || "",
            title: episodeSource || `Episodio ${episodeNumber || seasons.get(sn).length + 1}`
          }));
        };
        if (Array.isArray(payload)) {
          if (!payload.length) return null;
          payload.forEach((ep) => {
            var _a2, _b2, _c2;
            return addEpisode((_c2 = (_b2 = (_a2 = ep == null ? void 0 : ep.season) != null ? _a2 : ep == null ? void 0 : ep.temporada) != null ? _b2 : ep == null ? void 0 : ep.season_number) != null ? _c2 : 1, ep);
          });
        } else if (payload && typeof payload === "object") {
          const seasonEntries = Object.entries(payload).filter(
            ([key, value]) => /^season[_-]?\d+$/i.test(key) && Array.isArray(value)
          );
          if (!seasonEntries.length) {
            const nestedList = payload.episodes || payload.items || [];
            if (Array.isArray(nestedList) && nestedList.length) {
              nestedList.forEach((ep) => {
                var _a2, _b2, _c2;
                return addEpisode((_c2 = (_b2 = (_a2 = ep == null ? void 0 : ep.season) != null ? _a2 : ep == null ? void 0 : ep.temporada) != null ? _b2 : ep == null ? void 0 : ep.season_number) != null ? _c2 : 1, ep);
              });
            }
          } else {
            seasonEntries.forEach(([key, list]) => {
              var _a2;
              const sn = Number(((_a2 = key.match(/\d+/)) == null ? void 0 : _a2[0]) || 1);
              list.forEach((ep) => addEpisode(sn, ep));
            });
          }
        }
        if (!seasons.size) return null;
        for (const [sn, list] of seasons) {
          list.sort((a, b) => {
            var _a2, _b2, _c2, _d2;
            return Number((_b2 = (_a2 = a.number) != null ? _a2 : a.episode) != null ? _b2 : 0) - Number((_d2 = (_c2 = b.number) != null ? _c2 : b.episode) != null ? _d2 : 0);
          });
          seasons.set(sn, list);
        }
        const flat = [...seasons.values()].flat();
        return { seasons, flat };
      } catch (e) {
        console.warn("[fetchEpisodes]", postId, e.message);
        return null;
      }
    });
  }
  function fetchTaxonomies() {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f;
      try {
        const r = yield proxiedFetch(`${API}/taxonomies`);
        const d = JSON.parse(yield r.text());
        const gs = (_c = (_b = (_a = d == null ? void 0 : d.data) == null ? void 0 : _a.genres) != null ? _b : d == null ? void 0 : d.genres) != null ? _c : [];
        const ys = (_f = (_e = (_d = d == null ? void 0 : d.data) == null ? void 0 : _d.years) != null ? _e : d == null ? void 0 : d.years) != null ? _f : [];
        gs.forEach((g) => {
          if (g._id && g.name) GENRE_MAP[g._id] = g.name;
        });
        ys.forEach((y) => {
          if (y._id && y.name) YEAR_MAP[y._id] = String(y.name);
        });
      } catch (_) {
      }
    });
  }
  function fetchSearch(query) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const url = `${API}/listing?page=1&post_type=movies&posts_per_page=20&search=${encodeURIComponent(query)}`;
      try {
        const r = yield proxiedFetch(url);
        const d = JSON.parse(yield r.text());
        const arr = (_d = (_c = (_b = (_a = d == null ? void 0 : d.data) == null ? void 0 : _a.posts) != null ? _b : d == null ? void 0 : d.posts) != null ? _c : d == null ? void 0 : d.data) != null ? _d : [];
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    });
  }
  function extractEmbed(data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    if (!data) return "";
    const source = unwrapApiData(data);
    const embed = source.embed_url || source.iframe || source.embed || source.url || ((_b = (_a = source.embeds) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) || ((_d = (_c = source.embeds) == null ? void 0 : _c[0]) == null ? void 0 : _d.embed) || ((_f = (_e = source.players) == null ? void 0 : _e[0]) == null ? void 0 : _f.url) || ((_h = (_g = source.players) == null ? void 0 : _g[0]) == null ? void 0 : _h.embed) || ((_j = (_i = source.sources) == null ? void 0 : _i[0]) == null ? void 0 : _j.url) || ((_l = (_k = source.sources) == null ? void 0 : _k[0]) == null ? void 0 : _l.embed) || ((_n = (_m = source.servers) == null ? void 0 : _m[0]) == null ? void 0 : _n.url) || ((_p = (_o = source.servers) == null ? void 0 : _o[0]) == null ? void 0 : _p.embed) || "";
    return cleanUrl(embed);
  }
  function extractPlayerSources(data) {
    const source = unwrapApiData(data);
    const list = (source == null ? void 0 : source.embeds) || (source == null ? void 0 : source.players) || (source == null ? void 0 : source.sources) || (source == null ? void 0 : source.servers) || [];
    return Array.isArray(list) ? list : [];
  }
  function extractM3u8(embedUrl) {
    return __async(this, null, function* () {
      if (!embedUrl) return null;
      if (/\.m3u8(?:\?|#|$)/i.test(embedUrl)) return cleanUrl(embedUrl);
      try {
        const r = yield proxiedFetch(embedUrl);
        const html = yield r.text();
        let m;
        m = html.match(/https?:\/\/[^"' <>\n]+master\.m3u8[^"' <>\n]*/i);
        if (m) return m[0].replace(/\u0026/g, "&").replace(/\\/g, "/");
        m = html.match(/https?:\/\/[^"' <>\n]+\.m3u8[^"' <>\n]*/i);
        if (m) return m[0].replace(/\u0026/g, "&").replace(/\\/g, "/");
        m = html.match(/["'](https?:[^"']+\.m3u8[^"']*)["']/i);
        if (m) return m[1].replace(/\u0026/g, "&");
        m = html.match(/file["']?\s*:\s*["'](https?:[^"']+)/i);
        if (m && m[1].includes("http")) return m[1].replace(/\u0026/g, "&");
        // Special-case: vimeos embed pages sometimes expose a download endpoint
        // like /d/<code>_h which can contain direct links or redirects to m3u8.
        try {
          const codeMatch = embedUrl.match(/embed-([A-Za-z0-9]+)\.html/i);
          if (codeMatch && codeMatch[1]) {
            const code = codeMatch[1];
            const tryUrl = `https://vimeos.net/d/${code}_h`;
              try {
                try { console.log('[Api.extractM3u8] trying vimeos download endpoint', tryUrl); } catch(e){}
                const rr = yield proxiedFetch(tryUrl);
              // If the proxied request final URL is an m3u8, return it
              try {
                const finalUrl = rr.url || "";
                if (finalUrl && /\.m3u8(?:\?|#|$)/i.test(finalUrl)) return cleanUrl(finalUrl);
              } catch (_e) {}
              const txt = yield rr.text();
              let mm = txt.match(/https?:\/\/[^"' <>\n]+\.m3u8[^"' <>\n]*/i);
              if (mm) return mm[0].replace(/\u0026/g, "&").replace(/\\/g, "/");
            } catch (_e) {}
          }
        } catch (_e) {}
      } catch (e) {
        console.warn("embed extract error", e);
      }
      return null;
    });
  }
  function imgUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return IMG_BASE + path;
  }
  function resolveGenres(ids) {
    if (!(ids == null ? void 0 : ids.length)) return [];
    return ids.slice(0, 3).map((id) => GENRE_MAP[id] || "G" + id).filter(Boolean);
  }
  function resolveYear(ids) {
    if (!(ids == null ? void 0 : ids.length)) return "";
    return YEAR_MAP[ids[0]] || String(ids[0]) || "";
  }
  function normalizeItem(raw, forceType) {
    var _a, _b, _c, _d;
    const type = forceType || raw.type || "movie";
    const genres = resolveGenres(raw.genres);
    const year = raw.release_date ? raw.release_date.slice(0, 4) : resolveYear(raw.years) || "";
    const poster = imgUrl(((_a = raw.images) == null ? void 0 : _a.poster) || raw.poster || raw.image || raw.cover || "");
    const backdrop = imgUrl(((_b = raw.images) == null ? void 0 : _b.backdrop) || raw.backdrop || ((_c = raw.images) == null ? void 0 : _c.poster) || raw.poster || raw.image || "");
    const logo = imgUrl(((_d = raw.images) == null ? void 0 : _d.logo) || raw.logo || "");
    return {
      id: raw._id || raw.id || raw.post_id || Math.random() * 1e9 | 0,
      postId: raw._id || raw.id || raw.post_id,
      title: raw.title || raw.name || "Sin t\xEDtulo",
      year,
      type,
      genre: genres[0] || "",
      tags: genres,
      rating: raw.rating ? parseFloat(raw.rating).toFixed(1) : "",
      dur: raw.runtime ? Math.round(raw.runtime) + "min" : type === "tvshows" ? "Serie" : "",
      match: Math.floor(Math.random() * 15 + 83),
      desc: raw.overview || raw.description || raw.excerpt || "",
      cast: raw.cast || raw.actors || "",
      poster,
      backdrop,
      slug: raw.slug || "",
      trailer: raw.trailer || "",
      embedUrl: raw.embed_url || raw.iframe || "",
      logo,
      posterApi: poster,
      backdropApi: backdrop,
      logoApi: logo,
      isLive: false
    };
  }
  return {
    proxiedFetch,
    fetchListing,
    fetchTops,
    fetchPlayer,
    fetchEpisodes,
    fetchTaxonomies,
    fetchSearch,
    extractEmbed,
    extractPlayerSources,
    extractM3u8,
    enrichArtwork,
    normalizeItem,
    imgUrl
  };
})();
