"use strict";
// ══════════════════════════════════════════════════
//  API — network helpers + data normalisation
// ══════════════════════════════════════════════════
const Api = (() => {
  const tmdbCache = new Map();
  let tmdbBackoffUntil = 0;
  let tmdbFailStreak = 0;

  function unwrapApiData(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    return payload.data ?? payload.result ?? payload.payload ?? payload;
  }

  function cleanUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.trim().replace(/^\[|\]$/g, '').replace(/\\u0026/g, '&').replace(/\\/g, '/');
  }

  function cleanTmdbQuery(title) {
    return String(title || '')
      .replace(/\(\d{4}\)/g, ' ')
      .replace(/\d{4}/g, ' ')
      .replace(/[\[\]{}]/g, ' ')
      .replace(/[:|\-_/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function fetchTmdbCandidates(query, mediaType = 'multi', year = '') {
    const q = cleanTmdbQuery(query);
    if (!q) return [];
    if (Date.now() < tmdbBackoffUntil) return [];

    const cacheKey = `${mediaType}|${q}|${year || ''}`;
    if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);

    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: q,
      include_adult: 'false',
      language: 'es-ES',
    });
    if (year) {
      if (mediaType === 'tv') params.set('first_air_date_year', year);
      else params.set('year', year);
    }

    const tries = mediaType === 'movie'
      ? ['movie', 'multi']
      : mediaType === 'tv'
        ? ['tv', 'multi']
        : ['multi', 'movie', 'tv'];

    let results = [];
    for (const type of tries) {
      try {
        const url = `${TMDB_API_BASE}/search/${type}?${params.toString()}`;
        const r = await fetchTimeout(url, {}, 8000);
        if (!r.ok) {
          if (r.status === 429) {
            tmdbFailStreak += 1;
            tmdbBackoffUntil = Date.now() + 10 * 60 * 1000;
            break;
          }
          continue;
        }
        const d = await r.json();
        results = Array.isArray(d?.results) ? d.results : [];
        tmdbFailStreak = 0;
        if (results.length) break;
      } catch (_) {
        tmdbFailStreak += 1;
        if (tmdbFailStreak >= 3) {
          tmdbBackoffUntil = Date.now() + 10 * 60 * 1000;
          break;
        }
      }
    }

    tmdbCache.set(cacheKey, results);
    return results;
  }

  function tmdbMediaTypeForItem(type) {
    if (type === 'movie' || type === 'movies') return 'movie';
    if (type === 'tvshows' || type === 'series') return 'tv';
    return 'multi';
  }

  async function enrichItemArtwork(item) {
    if (!item) return item;

    const title = item.title || '';
    const year = item.year && /^\d{4}$/.test(String(item.year)) ? String(item.year) : '';
    const results = await fetchTmdbCandidates(title, tmdbMediaTypeForItem(item.type), year);
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
  }

  async function enrichArtwork(items) {
    if (!Array.isArray(items) || !items.length) return items;
    await Promise.all(items.map(enrichItemArtwork));
    return items;
  }

  // ── CORS proxy cascade ──────────────────────────
  function fetchTimeout(url, opts = {}, ms = 8000) {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
  }

  async function proxiedFetch(url) {
    let host = '';
    try { host = new URL(url, window.location.href).host.toLowerCase(); } catch (_) {}

    const isAllcalidadApi = /(^|\.)allcalidad\.re$/.test(host);

    if (isAllcalidadApi) {
      try {
        const r = await fetchTimeout(url, { mode: 'cors' }, 6000);
        if (r.ok) return r;
      } catch (_) {}
    }

    // Most reliable proxies first for external embeds to reduce noisy expected CORS errors.
    const attempts = [
      { kind: 'raw', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
      { kind: 'raw', url: `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}` },
      { kind: 'allorigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}` },
      { kind: 'raw', url: `https://thingproxy.freeboard.io/fetch/${url}` },
    ];

    for (const at of attempts) {
      try {
        const r = await fetchTimeout(at.url, {}, 8000);
        if (!r.ok) continue;

        if (at.kind === 'allorigins') {
          const d = await r.json();
          if (!d?.contents) continue;
          const text = d.contents;
          return {
            ok: true,
            status: 200,
            text: () => Promise.resolve(text),
            json: () => Promise.resolve(JSON.parse(text)),
          };
        }

        return r;
      } catch (_) {}
    }

    // Last fallback for plain-text mirrors.
    try {
      const normalized = url.replace(/^https?:\/\//i, '');
      const r = await fetchTimeout(`https://r.jina.ai/http://${normalized}`, {}, 10000);
      if (r.ok) return r;
    } catch (_) {}

    throw new Error('All proxies failed: ' + url);
  }

  // ── Public fetch helpers ─────────────────────────
  async function fetchListing(postType, page = 1, perPage = 20) {
    try {
      const url = `${API}/listing?page=${page}&post_type=${postType}&posts_per_page=${perPage}`;
      const r   = await proxiedFetch(url);
      const txt = await r.text();
      const d   = JSON.parse(txt);
      const arr = d?.data?.posts ?? d?.posts ?? d?.data ?? d?.results ?? d;
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('[fetchListing]', postType, page, e.message);
      return [];
    }
  }

  async function fetchTops(postType, range = 'month', limit = 24) {
    try {
      const url = `${API}/tops?range=${encodeURIComponent(range)}&limit=${limit}&post_type=${encodeURIComponent(postType)}`;
      const r   = await proxiedFetch(url);
      const txt = await r.text();
      const d   = JSON.parse(txt);
      const arr = d?.data?.posts ?? d?.posts ?? d?.data ?? d?.results ?? d;
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('[fetchTops]', postType, range, e.message);
      return [];
    }
  }

  async function fetchPlayer(postId) {
    try {
      const r = await proxiedFetch(`${API}/player?post_id=${postId}&_any=1`);
      return unwrapApiData(JSON.parse(await r.text()));
    } catch (e) {
      console.warn('[fetchPlayer]', postId, e.message);
      return null;
    }
  }

  /**
   * fetchEpisodes — returns structured { seasons: Map<number, ep[]>, flat: ep[] }
   */
  async function fetchEpisodes(postId) {
    try {
      const r   = await proxiedFetch(`${API}/episodes?post_id=${postId}`);
      const txt = await r.text();
      const d   = JSON.parse(txt);
      const eps = d?.data?.episodes ?? d?.episodes ?? d ?? [];
      if (!Array.isArray(eps) || !eps.length) return null;

      // Group by season number
      const seasons = new Map();
      eps.forEach(ep => {
        const sn = Number(ep.season ?? ep.temporada ?? 1);
        if (!seasons.has(sn)) seasons.set(sn, []);
        seasons.get(sn).push(ep);
      });

      // Sort seasons and episodes within them
      for (const [sn, list] of seasons) {
        list.sort((a, b) =>
          (Number(a.number ?? a.episode ?? a.episodio ?? 0)) -
          (Number(b.number ?? b.episode ?? b.episodio ?? 0)));
        seasons.set(sn, list);
      }

      return { seasons, flat: eps };
    } catch (e) {
      console.warn('[fetchEpisodes]', postId, e.message);
      return null;
    }
  }

  async function fetchTaxonomies() {
    try {
      const r    = await proxiedFetch(`${API}/taxonomies`);
      const d    = JSON.parse(await r.text());
      const gs   = d?.data?.genres ?? d?.genres ?? [];
      const ys   = d?.data?.years  ?? d?.years  ?? [];
      gs.forEach(g => { if (g._id && g.name) GENRE_MAP[g._id] = g.name; });
      ys.forEach(y => { if (y._id && y.name) YEAR_MAP[y._id]  = String(y.name); });
    } catch (_) {}
  }

  async function fetchSearch(query) {
    const url = `${API}/listing?page=1&post_type=movies&posts_per_page=20&search=${encodeURIComponent(query)}`;
    try {
      const r   = await proxiedFetch(url);
      const d   = JSON.parse(await r.text());
      const arr = d?.data?.posts ?? d?.posts ?? d?.data ?? [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  // ── Embed extraction ─────────────────────────────
  function extractEmbed(data) {
    if (!data) return '';
    const source = unwrapApiData(data);
    const embed =
      source.embed_url || source.iframe || source.embed || source.url ||
      source.embeds?.[0]?.url || source.embeds?.[0]?.embed ||
      source.players?.[0]?.url || source.players?.[0]?.embed ||
      source.sources?.[0]?.url || source.sources?.[0]?.embed ||
      source.servers?.[0]?.url || source.servers?.[0]?.embed ||
      '';
    return cleanUrl(embed);
  }

  function extractPlayerSources(data) {
    const source = unwrapApiData(data);
    const list = source?.embeds || source?.players || source?.sources || source?.servers || [];
    return Array.isArray(list) ? list : [];
  }

  async function extractM3u8(embedUrl) {
    if (!embedUrl) return null;
    if (/\.m3u8(?:\?|#|$)/i.test(embedUrl)) return cleanUrl(embedUrl);
    try {
      const r    = await proxiedFetch(embedUrl);
      const html = await r.text();
      let m;
      m = html.match(/https?:\/\/[^"' <>\n]+master\.m3u8[^"' <>\n]*/i);
      if (m) return m[0].replace(/\u0026/g, '&').replace(/\\/g, '/');
      m = html.match(/https?:\/\/[^"' <>\n]+\.m3u8[^"' <>\n]*/i);
      if (m) return m[0].replace(/\u0026/g, '&').replace(/\\/g, '/');
      m = html.match(/["'](https?:[^"']+\.m3u8[^"']*)["']/i);
      if (m) return m[1].replace(/\u0026/g, '&');
      m = html.match(/file["']?\s*:\s*["'](https?:[^"']+)/i);
      if (m && m[1].includes('http')) return m[1].replace(/\u0026/g, '&');
    } catch (e) { console.warn('embed extract error', e); }
    return null;
  }

  // ── Normalise raw API item ───────────────────────
  function imgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return IMG_BASE + path;
  }
  function resolveGenres(ids) {
    if (!ids?.length) return [];
    return ids.slice(0, 3).map(id => GENRE_MAP[id] || ('G' + id)).filter(Boolean);
  }
  function resolveYear(ids) {
    if (!ids?.length) return '';
    return YEAR_MAP[ids[0]] || String(ids[0]) || '';
  }

  function normalizeItem(raw, forceType) {
    const type    = forceType || raw.type || 'movie';
    const genres  = resolveGenres(raw.genres);
    const year    = raw.release_date
      ? raw.release_date.slice(0, 4)
      : resolveYear(raw.years) || '';
    const poster   = imgUrl(raw.images?.poster  || raw.poster  || raw.image || raw.cover || '');
    const backdrop = imgUrl(raw.images?.backdrop || raw.backdrop || raw.images?.poster || raw.poster || raw.image || '');
    const logo     = imgUrl(raw.images?.logo || raw.logo || '');

    return {
      id:       raw._id || raw.id || raw.post_id || (Math.random() * 1e9 | 0),
      postId:   raw._id || raw.id || raw.post_id,
      title:    raw.title || raw.name || 'Sin título',
      year,
      type,
      genre:    genres[0] || '',
      tags:     genres,
      rating:   raw.rating ? parseFloat(raw.rating).toFixed(1) : '',
      dur:      raw.runtime ? Math.round(raw.runtime) + 'min' : (type === 'tvshows' ? 'Serie' : ''),
      match:    Math.floor(Math.random() * 15 + 83),
      desc:     raw.overview || raw.description || raw.excerpt || '',
      cast:     raw.cast || raw.actors || '',
      poster,
      backdrop,
      slug:     raw.slug || '',
      trailer:  raw.trailer || '',
      embedUrl: raw.embed_url || raw.iframe || '',
      logo,
      posterApi:   poster,
      backdropApi: backdrop,
      logoApi:     logo,
      isLive:   false,
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
    imgUrl,
  };
})();
