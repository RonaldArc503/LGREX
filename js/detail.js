"use strict";
// ══════════════════════════════════════════════════
//  DETAIL — movie/series info panel
// ══════════════════════════════════════════════════
const Detail = (() => {
  let current       = null;
  let seasonsData   = null;  // Map<seasonNum, ep[]>
  let currentSeason = 1;

  // ── Open panel ─────────────────────────────────
  async function open(item) {
    if (!item) return;
    current     = item;
    seasonsData = null;

    // Populate static fields
    document.getElementById('d-title').textContent  = item.title || '';
    document.getElementById('d-match').textContent  = item.match ? item.match + '% coincidencia' : '';
    document.getElementById('d-year').textContent   = item.year  || '';
    document.getElementById('d-dur').textContent    = item.dur   || '';
    document.getElementById('d-desc').textContent   = item.desc  || 'Cargando información...';
    document.getElementById('d-cast').innerHTML     = item.cast
      ? `<span>Reparto:</span> ${item.cast}` : '';

    const bd = document.getElementById('d-backdrop');
    const bs = item.backdrop || item.poster || item.img || '';
    bd.src = bs;
    bd.style.display = bs ? 'block' : 'none';

    const tags = document.getElementById('d-tags');
    tags.innerHTML = '';
    (item.tags || [item.genre].filter(Boolean)).slice(0, 6).forEach(t => {
      const s = document.createElement('span');
      s.className   = 'd-tag';
      s.textContent = t;
      tags.appendChild(s);
    });

    const pb = document.getElementById('d-play-btn');
    if (item.isLive) {
      pb.className = 'd-play-btn live';
      pb.innerHTML = '● Ver en Vivo';
    } else {
      pb.className = 'd-play-btn';
      pb.innerHTML = '▶ Reproducir';
    }

    document.getElementById('d-eps-section').style.display    = 'none';
    document.getElementById('d-servers-section').style.display = 'none';
    document.getElementById('detail').classList.add('open');
    document.body.style.overflow = 'hidden';

    // Async load servers or episodes
    if (item.postId && !item.isLive) {
      const isSeries = item.type === 'tvshows' || item.type === 'series';
      if (isSeries) {
        await loadEpisodes(item);
      } else {
        await loadServers(item);
      }
    }
  }

  function close() {
    document.getElementById('detail').classList.remove('open');
    document.body.style.overflow = '';
  }

  function outsideClick(e) {
    if (e.target === document.getElementById('detail')) close();
  }

  // ── Play button from detail ─────────────────────
  function play() {
    if (!current) return;
    if (current.isLive) {
      close();
      Player.open(current);
      return;
    }
    const isSeries = current.type === 'tvshows' || current.type === 'series';
    if (isSeries && seasonsData) {
      // Play first episode of current season
      const eps = seasonsData.get(currentSeason) || [...seasonsData.values()][0] || [];
      if (eps.length) {
        close();
        Player.openEpisode(current, eps, 0, seasonsData);
        return;
      }
    }
    close();
    Player.open(current);
  }

  // ── Load servers (movies) ───────────────────────
  async function loadServers(item) {
    const data = await Api.fetchPlayer(item.postId);
    if (!data) return;
    current._playerData = data;
    const embed = Api.extractEmbed(data);
    if (embed) current.embedUrl = embed;

    const servers = Api.extractPlayerSources(data);
    if (!servers.length) return;

    current._servers = servers;
    const tab = document.getElementById('d-server-tabs');
    tab.innerHTML = '';
    servers.forEach((s, i) => {
      const b = document.createElement('div');
      b.className = 'server-tab' + (i === 0 ? ' active' : '');
      b.textContent = s.name || s.server || s.label || 'Servidor ' + (i + 1);
      b.onclick = () => {
        tab.querySelectorAll('.server-tab').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const u = s.url || s.embed || s.embed_url || s.iframe || s.file || '';
        if (u) current.embedUrl = u;
      };
      tab.appendChild(b);
    });
    document.getElementById('d-servers-section').style.display = 'block';
  }

  // ── Load episodes (series) ──────────────────────
  async function loadEpisodes(item) {
    const data = await Api.fetchEpisodes(item.postId);
    if (!data) return;

    seasonsData = data.seasons;
    const seasonNums = [...seasonsData.keys()].sort((a, b) => a - b);
    currentSeason    = seasonNums[0];

    // Build season selector
    const wrap   = document.getElementById('d-season-select-wrap');
    const select = document.getElementById('d-season-select');
    select.innerHTML = '';

    if (seasonNums.length > 1) {
      seasonNums.forEach(sn => {
        const opt = document.createElement('option');
        opt.value       = sn;
        opt.textContent = `Temporada ${sn}`;
        select.appendChild(opt);
      });
      wrap.style.display = 'block';
    } else {
      wrap.style.display = 'none';
    }

    renderEpisodes(currentSeason);
    document.getElementById('d-eps-section').style.display = 'block';
  }

  function onSeasonChange(val) {
    currentSeason = Number(val);
    renderEpisodes(currentSeason);
  }

  function renderEpisodes(seasonNum) {
    const list = document.getElementById('d-eps-list');
    list.innerHTML = '';
    const eps = seasonsData?.get(seasonNum) || [];

    document.getElementById('d-eps-heading').textContent =
      seasonsData && [...seasonsData.keys()].length > 1
        ? `Temporada ${seasonNum}`
        : 'Episodios';

    eps.forEach((ep, i) => {
      const row   = document.createElement('div');
      row.className = 'ep-row';
      const thumb = Api.imgUrl(ep.thumbnail || ep.thumb || ep.image || ep.images?.poster || '');
      const num   = ep.number ?? ep.episode ?? ep.episodio ?? (i + 1);
      const title = ep.title || ep.name || `Episodio ${num}`;
      const desc  = ep.overview || ep.description || ep.desc || '';
      const dur   = ep.runtime ? ep.runtime + 'min' : '';

      row.innerHTML = `
        <div class="ep-num">${num}</div>
        <div class="ep-thumb">
          ${thumb ? `<img src="${thumb}" alt="">` : ''}
          <div class="ep-play-icon">▶</div>
        </div>
        <div class="ep-info">
          <div class="ep-title">${title}</div>
          <div class="ep-desc">${desc}</div>
        </div>
        <div class="ep-dur">${dur}</div>`;

      row.onclick = () => {
        close();
        Player.openEpisode(current, eps, i, seasonsData);
      };
      list.appendChild(row);
    });
  }

  return { open, close, outsideClick, play, onSeasonChange };
})();
