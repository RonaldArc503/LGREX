"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = function(obj, key, value) {
  return key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value }) : obj[key] = value;
};
var __spreadValues = function(a, b) {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols) {
    var symbols = __getOwnPropSymbols(b);
    for (var i = 0; i < symbols.length; i++) {
      var prop = symbols[i];
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  }
  return a;
};
var __spreadProps = function(a, b) {
  return __defProps(a, __getOwnPropDescs(b));
};
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
var Api = (function() {
  var tmdbCache = new Map();
  var tmdbBackoffUntil = 0;
  var tmdbFailStreak = 0;
  
  function unwrapApiData(payload) {
    if (!payload || typeof payload !== "object") return payload;
    return payload.data || payload.result || payload.payload || payload;
  }
  function cleanUrl(url) {
    if (!url || typeof url !== "string") return "";
    return url.trim().replace(/^\[|\]$/g, "").replace(/\\u0026/g, "&").replace(/\\/g, "/");
  }
  function cleanTmdbQuery(title) {
    return String(title || "").replace(/\(\d{4}\)/g, " ").replace(/\d{4}/g, " ").replace(/[\[\]{}]/g, " ").replace(/[:|\-_/]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function fetchTmdbCandidates(query, mediaType, year) {
    if (!mediaType) mediaType = "multi";
    if (!year) year = "";
    return __async(this, null, function* () {
      var q = cleanTmdbQuery(query);
      if (!q) return [];
      if (Date.now() < tmdbBackoffUntil) return [];
      var cacheKey = mediaType + "|" + q + "|" + (year || "");
      if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);
      var params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        query: q,
        include_adult: "false",
        language: "es-ES"
      });
      if (year) {
        if (mediaType === "tv") params.set("first_air_date_year", year);
        else params.set("year", year);
      }
      var tries = mediaType === "movie" ? ["movie", "multi"] : mediaType === "tv" ? ["tv", "multi"] : ["multi", "movie", "tv"];
      var results = [];
      for (var i = 0; i < tries.length; i++) {
        var type = tries[i];
        try {
          var url = TMDB_API_BASE + "/search/" + type + "?" + params.toString();
          var r = yield fetchTimeout(url, {}, 8e3);
          if (!r.ok) {
            if (r.status === 429) {
              tmdbFailStreak += 1;
              tmdbBackoffUntil = Date.now() + 10 * 60 * 1e3;
              break;
            }
            continue;
          }
          var d = yield r.json();
          results = Array.isArray(d && d.results) ? d.results : [];
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
      var title = item.title || "";
      var year = item.year && /^\d{4}$/.test(String(item.year)) ? String(item.year) : "";
      var results = yield fetchTmdbCandidates(title, tmdbMediaTypeForItem(item.type), year);
      var match = results[0];
      if (!match) {
        if (!item.poster && item.posterApi) item.poster = item.posterApi;
        if (!item.backdrop && item.backdropApi) item.backdrop = item.backdropApi;
        if (!item.logo && item.logoApi) item.logo = item.logoApi;
        return item;
      }
      if (item.poster && !item.posterApi) item.posterApi = item.poster;
      if (item.backdrop && !item.backdropApi) item.backdropApi = item.backdrop;
      if (item.logo && !item.logoApi) item.logoApi = item.logo;
      if (match.poster_path) item.poster = TMDB_IMG + match.poster_path;
      else if (!item.poster && item.posterApi) item.poster = item.posterApi;
      if (match.backdrop_path) item.backdrop = TMDB_BACK + match.backdrop_path;
      else if (!item.backdrop && item.backdropApi) item.backdrop = item.backdropApi;
      if (match.poster_path) item.logo = TMDB_IMG + match.poster_path;
      else if (!item.logo && item.logoApi) item.logo = item.logoApi;
      return item;
    });
  }
  function enrichArtwork(items) {
    return __async(this, null, function* () {
      if (!Array.isArray(items) || !items.length) return items;
      yield Promise.all(items.map(function(it) { return enrichItemArtwork(it); }));
      return items;
    });
  }
  function fetchTimeout(url, opts, ms) {
    if (!opts) opts = {};
    if (!ms) ms = 8e3;
    var ctrl = new AbortController();
    var id = setTimeout(function() { return ctrl.abort(); }, ms);
    return fetch(url, __spreadProps(__spreadValues({}, opts), { signal: ctrl.signal })).finally(function() { return clearTimeout(id); });
  }
  function proxiedFetch(url) {
    return __async(this, null, function* () {
      var host = "";
      try {
        host = new URL(url, window.location.href).host.toLowerCase();
      } catch (_) {
      }
      var isAllcalidadApi = /(^|\.)allcalidad\.re$/.test(host);
      if (isAllcalidadApi) {
        try {
          var r = yield fetchTimeout(url, { mode: "cors" }, 6e3);
          if (r.ok) return r;
        } catch (_) {
        }
      }
      var attempts = [
        { kind: "raw", url: "https://corsproxy.io/?" + encodeURIComponent(url) },
        { kind: "raw", url: "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(url) },
        { kind: "allorigins", url: "https://api.allorigins.win/get?url=" + encodeURIComponent(url) },
        { kind: "raw", url: "https://thingproxy.freeboard.io/fetch/" + url }
      ];
      for (var i = 0; i < attempts.length; i++) {
        var at = attempts[i];
        try {
          var r = yield fetchTimeout(at.url, {}, 8e3);
          if (!r.ok) continue;
          if (at.kind === "allorigins") {
            var d = yield r.json();
            if (!d || !d.contents) continue;
            var text = d.contents;
            return {
              ok: true,
              status: 200,
              text: function() { return Promise.resolve(text); },
              json: function() { return Promise.resolve(JSON.parse(text)); }
            };
          }
          return r;
        } catch (_) {
        }
      }
      try {
        var normalized = url.replace(/^https?:\/\//i, "");
        var r = yield fetchTimeout("https://r.jina.ai/http://" + normalized, {}, 1e4);
        if (r.ok) return r;
      } catch (_) {
      }
      throw new Error("All proxies failed: " + url);
    });
  }
  function fetchListing(postType, page, perPage) {
    if (!page) page = 1;
    if (!perPage) perPage = 20;
    return __async(this, null, function* () {
      try {
        var url = API + "/listing?page=" + page + "&post_type=" + postType + "&posts_per_page=" + perPage;
        var r = yield proxiedFetch(url);
        var txt = yield r.text();
        var d = JSON.parse(txt);
        var arr = d && d.data && d.data.posts || d && d.posts || d && d.data || d && d.results || d;
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        console.warn("[fetchListing]", postType, page, e.message);
        return [];
      }
    });
  }
  function fetchTops(postType, range, limit) {
    if (!range) range = "month";
    if (!limit) limit = 30;
    return __async(this, null, function* () {
      try {
        var url = API + "/tops?range=" + encodeURIComponent(range) + "&limit=" + limit + "&post_type=" + encodeURIComponent(postType);
        var r = yield proxiedFetch(url);
        var txt = yield r.text();
        var d = JSON.parse(txt);
        var arr = d && d.data && d.data.posts || d && d.posts || d && d.data || d && d.results || d;
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
        var r = yield proxiedFetch(API + "/player?post_id=" + postId + "&_any=1");
        return unwrapApiData(JSON.parse(yield r.text()));
      } catch (e) {
        console.warn("[fetchPlayer]", postId, e.message);
        return null;
      }
    });
  }
  function fetchEpisodes(postId) {
    return __async(this, null, function* () {
      try {
        var r = yield proxiedFetch(API + "/episodes?post_id=" + postId);
        var txt = yield r.text();
        var d = JSON.parse(txt);
        var payload = d && d.data && d.data.episodes || d && d.episodes || d && d.data || d || [];
        var seasons = new Map();
        var addEpisode = function(seasonNumber, ep, episodeNumberFallback) {
          if (!episodeNumberFallback) episodeNumberFallback = 0;
          var sn = Number(seasonNumber || ep && ep.season || ep && ep.temporada || ep && ep.season_number || 1);
          if (!seasons.has(sn)) seasons.set(sn, []);
          var episodeNumber = Number(
            ep && ep.episode || ep && ep.number || ep && ep.episodio || ep && ep.episode_number || episodeNumberFallback || 0
          );
          var episodeSource = ep && ep.title || ep && ep.name || ep && ep.label || ep && ep.episode_title || "";
          seasons.get(sn).push(__spreadProps(__spreadValues({}, ep), {
            season: sn,
            number: episodeNumber || seasons.get(sn).length + 1,
            episode: episodeNumber || seasons.get(sn).length + 1,
            post_id: ep && ep.post_id || ep && ep._id || ep && ep.id || ep && ep.postId || "",
            title: episodeSource || "Episodio " + (episodeNumber || seasons.get(sn).length + 1)
          }));
        };
        if (Array.isArray(payload)) {
          if (!payload.length) return null;
          payload.forEach(function(ep) {
            return addEpisode(ep && ep.season || ep && ep.temporada || ep && ep.season_number || 1, ep);
          });
        } else if (payload && typeof payload === "object") {
          var entries = Object.keys(payload);
          var seasonEntries = [];
          for (var i = 0; i < entries.length; i++) {
            var key = entries[i];
            if (/^season[_-]?\d+$/i.test(key) && Array.isArray(payload[key])) {
              seasonEntries.push([key, payload[key]]);
            }
          }
          if (!seasonEntries.length) {
            var nestedList = payload.episodes || payload.items || [];
            if (Array.isArray(nestedList) && nestedList.length) {
              nestedList.forEach(function(ep) {
                return addEpisode(ep && ep.season || ep && ep.temporada || ep && ep.season_number || 1, ep);
              });
            }
          } else {
            seasonEntries.forEach(function(entry) {
              var key = entry[0];
              var list = entry[1];
              var m = key.match(/\d+/);
              var sn = Number(m ? m[0] : 1);
              list.forEach(function(ep) { return addEpisode(sn, ep); });
            });
          }
        }
        if (!seasons.size) return null;
        var seasonKeys = Array.from(seasons.keys());
        for (var j = 0; j < seasonKeys.length; j++) {
          var sn = seasonKeys[j];
          var list = seasons.get(sn);
          list.sort(function(a, b) {
            return Number(a.number || a.episode || 0) - Number(b.number || b.episode || 0);
          });
          seasons.set(sn, list);
        }
        var flat = Array.from(seasons.values()).flat();
        return { seasons: seasons, flat: flat };
      } catch (e) {
        console.warn("[fetchEpisodes]", postId, e.message);
        return null;
      }
    });
  }
  function fetchTaxonomies() {
    return __async(this, null, function* () {
      try {
        var r = yield proxiedFetch(API + "/taxonomies");
        var d = JSON.parse(yield r.text());
        var gs = d && d.data && d.data.genres || d && d.genres || [];
        var ys = d && d.data && d.data.years || d && d.years || [];
        gs.forEach(function(g) {
          if (g._id && g.name) GENRE_MAP[g._id] = g.name;
        });
        ys.forEach(function(y) {
          if (y._id && y.name) YEAR_MAP[y._id] = String(y.name);
        });
      } catch (_) {
      }
    });
  }
  function fetchSearch(query) {
    return __async(this, null, function* () {
      var url = API + "/listing?page=1&post_type=movies&posts_per_page=20&search=" + encodeURIComponent(query);
      try {
        var r = yield proxiedFetch(url);
        var d = JSON.parse(yield r.text());
        var arr = d && d.data && d.data.posts || d && d.posts || d && d.data || [];
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    });
  }
  function extractEmbed(data) {
    if (!data) return "";
    var source = unwrapApiData(data);
    var embeds = source.embeds || source.players || source.sources || source.servers || [];
    var embed = source.embed_url || source.iframe || source.embed || source.url || (embeds[0] && (embeds[0].url || embeds[0].embed)) || "";
    return cleanUrl(embed);
  }
  function extractPlayerSources(data) {
    var source = unwrapApiData(data);
    var list = source && (source.embeds || source.players || source.sources || source.servers) || [];
    return Array.isArray(list) ? list : [];
  }
  function decodePackedString(raw) {
    if (!raw) return "";
    try {
      return JSON.parse('"' + raw.replace(/"/g, '\\"') + '"');
    } catch (_) {
      return raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }
  function unpackPackerScripts(html) {
    const unpacked = [];
    if (!html || typeof html !== "string") return unpacked;
    const re = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)\)\)/g;
    let match;
    while ((match = re.exec(html))) {
      let payload = decodePackedString(match[1]);
      const radix = Number(match[2] || 36);
      let count = Number(match[3] || 0);
      const words = decodePackedString(match[4]).split("|");
      while (count--) {
        const word = words[count];
        if (!word) continue;
        const token = count.toString(radix);
        payload = payload.replace(new RegExp("\\b" + token + "\\b", "g"), word);
      }
      unpacked.push(payload);
    }
    return unpacked;
  }
  function findM3u8InText(text) {
    if (!text) return "";
    let m = text.match(/https?:\/\/[^"' <>\n]+master\.m3u8[^"' <>\n]*/i);
    if (m) return cleanUrl(m[0]);
    m = text.match(/https?:\/\/[^"' <>\n]+\.m3u8[^"' <>\n]*/i);
    if (m) return cleanUrl(m[0]);
    m = text.match(/["'](https?:[^"']+\.m3u8[^"']*)["']/i);
    if (m) return cleanUrl(m[1]);
    m = text.match(/file["']?\s*:\s*["'](https?:[^"']+)/i);
    if (m && m[1].includes("http")) return cleanUrl(m[1]);
    return "";
  }
  function extractM3u8(embedUrl) {
    return __async(this, null, function* () {
      if (!embedUrl) return null;
      if (/\.m3u8(?:\?|#|$)/i.test(embedUrl)) return cleanUrl(embedUrl);
      try {
        const r = yield proxiedFetch(embedUrl);
        const html = yield r.text();
        const direct = findM3u8InText(html);
        if (direct) return direct;
        const unpackedScripts = unpackPackerScripts(html);
        for (const script of unpackedScripts) {
          const unpackedM3u8 = findM3u8InText(script);
          if (unpackedM3u8) return unpackedM3u8;
        }
        try {
          const codeMatch = embedUrl.match(/embed-([A-Za-z0-9]+)\.html/i);
          if (codeMatch && codeMatch[1]) {
            const code = codeMatch[1];
            const tryUrl = `https://vimeos.net/d/${code}_h`;
            try {
              try {
                console.log("[Api.extractM3u8] trying vimeos download endpoint", tryUrl);
              } catch (e) {
              }
              const rr = yield proxiedFetch(tryUrl);
              try {
                const finalUrl = rr.url || "";
                if (finalUrl && /\.m3u8(?:\?|#|$)/i.test(finalUrl)) return cleanUrl(finalUrl);
              } catch (_e) {
              }
              const txt = yield rr.text();
              const downloadM3u8 = findM3u8InText(txt);
              if (downloadM3u8) return downloadM3u8;
              const unpackedDownloadScripts = unpackPackerScripts(txt);
              for (const script of unpackedDownloadScripts) {
                const unpackedDownloadM3u8 = findM3u8InText(script);
                if (unpackedDownloadM3u8) return unpackedDownloadM3u8;
              }
            } catch (_e) {
            }
          }
        } catch (_e) {
        }
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
    if (!ids || !ids.length) return [];
    return ids.slice(0, 3).map(function(id) { return GENRE_MAP[id] || "G" + id; }).filter(Boolean);
  }
  function resolveYear(ids) {
    if (!ids || !ids.length) return "";
    return YEAR_MAP[ids[0]] || String(ids[0]) || "";
  }
  function normalizeItem(raw, forceType) {
    var type = forceType || raw.type || (raw.post_type ? (raw.post_type === 'movies' ? 'movie' : raw.post_type === 'series' ? 'tvshows' : raw.post_type) : "movie");
    var genres = resolveGenres(raw.genres);
    var year = raw.release_date ? raw.release_date.slice(0, 4) : resolveYear(raw.years) || "";
    
    // Fallbacks inteligentes para títulos
    var title = raw.title || raw.name || raw.post_title || "Sin título";
    var originalTitle = raw.original_title || raw.original_name || "";

    // Fallbacks inteligentes para imágenes
    var imgs = raw.images || {};
    var poster = imgUrl(imgs.poster || raw.poster || raw.image || raw.cover || raw.thumbnail || "");
    var backdrop = imgUrl(imgs.backdrop || raw.backdrop || imgs.poster || raw.poster || raw.image || "");
    var logo = imgUrl(imgs.logo || raw.logo || "");

    return {
      id: raw._id || raw.id || raw.post_id || Math.random() * 1e9 | 0,
      postId: raw._id || raw.id || raw.post_id,
      title: title,
      originalTitle: originalTitle,
      year: year,
      type: type,
      genre: genres[0] || "",
      tags: genres,
      rating: raw.rating ? parseFloat(raw.rating).toFixed(1) : "",
      dur: raw.runtime ? Math.round(raw.runtime) + "min" : type === "tvshows" ? "Serie" : "",
      match: Math.floor(Math.random() * 15 + 83),
      desc: raw.overview || raw.description || raw.excerpt || raw.post_content || "",
      cast: raw.cast || raw.actors || "",
      poster: poster,
      backdrop: backdrop,
      slug: raw.slug || "",
      trailer: raw.trailer || "",
      embedUrl: raw.embed_url || raw.iframe || "",
      logo: logo,
      posterApi: poster,
      backdropApi: backdrop,
      logoApi: logo,
      isLive: type === 'channel' || raw.is_live === true
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
