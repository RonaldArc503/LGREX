// ══════════════════════════════════════════════════
//  PLAYER
// ══════════════════════════════════════════════════
const Player = (() => {
  let hlsInstance   = null;
  let seriesContext = null;
  let autoplayTimer = null;

  const $   = id => document.getElementById(id);
  const vid = ()  => $('video-el');
  const ifr = ()  => $('iframe-el');

  function _normText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function _isSpanishAudio(track) {
    const text = _normText([
      track?.label,
      track?.name,
      track?.lang,
      track?.language,
      track?.groupId,
    ].filter(Boolean).join(' '));

    return /\bes\b/.test(text) ||
           /espanol/.test(text) ||
           /spanish/.test(text) ||
           /latino/.test(text) ||
           /\bspa\b/.test(text);
  }

  function _preferSpanishAudioHls() {
    if (!hlsInstance || !hlsInstance.audioTracks || !hlsInstance.audioTracks.length) return false;
    const tracks = hlsInstance.audioTracks;
    const preferredIndex = tracks.findIndex(_isSpanishAudio);
    if (preferredIndex >= 0 && hlsInstance.audioTrack !== preferredIndex) {
      hlsInstance.audioTrack = preferredIndex;
      _log('Audio español seleccionado', '#46d369');
      return true;
    }
    return false;
  }

  function _preferSpanishAudioNative() {
    const audioTracks = vid()?.audioTracks;
    if (!audioTracks || !audioTracks.length) return false;

    let preferredIndex = -1;
    for (let i = 0; i < audioTracks.length; i++) {
      if (_isSpanishAudio(audioTracks[i])) {
        preferredIndex = i;
        break;
      }
    }

    if (preferredIndex < 0) return false;

    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = i === preferredIndex;
    }
    _log('Audio español seleccionado', '#46d369');
    return true;
  }

  // ── Debug log (visible on TV without DevTools) ──
  function _log(msg, color = '#aaa') {
    console.log('[Player]', msg);
    const el = $('p-loading-title');
    if (el) el.innerHTML =
      `<span style="color:${color};font-size:12px">${msg}</span>`;
  }

  // ── Open player (movie / channel) ──────────────
  function open(item) {
    if (!item) return;
    seriesContext = null;
    _prepareUI(item.title, '');
    _showEpNav(false);
    cancelAutoplay();
    if (item.isLive && item.sources?.length) {
      _loadLive(item);
    } else {
      _resolveAndPlay(item);
    }
  }

  // ── Open a specific episode ─────────────────────
  function openEpisode(series, episodes, index, seasonsData) {
    seriesContext = { series, episodes, index, seasonsData };
    const ep      = episodes[index];
    const sn      = ep.season ?? ep.temporada ?? 1;
    const num     = ep.number ?? ep.episode ?? ep.episodio ?? (index + 1);
    const epLabel = `T${sn} E${num} — ${ep.title || ep.name || 'Episodio ' + num}`;

    _prepareUI(series.title, epLabel);
    _showEpNav(true);
    cancelAutoplay();
    _updateEpNavButtons();

    const epItem = {
      ...series,
      title:    series.title,
      postId:   ep._id || ep.id || ep.post_id || series.postId,
      embedUrl: ep.embed_url || ep.iframe || '',
    };
    _resolveAndPlay(epItem);
  }

  // ── Prev / Next episode ─────────────────────────
  function prevEp() {
    if (!seriesContext) return;
    const { series, episodes, index, seasonsData } = seriesContext;
    if (index > 0) openEpisode(series, episodes, index - 1, seasonsData);
  }

  function nextEp() {
    if (!seriesContext) return;
    const { series, episodes, index, seasonsData } = seriesContext;
    if (index < episodes.length - 1) openEpisode(series, episodes, index + 1, seasonsData);
  }

  function playNextNow() { cancelAutoplay(); nextEp(); }

  // ── Autoplay ────────────────────────────────────
  function _scheduleAutoplay() {
    if (!seriesContext) return;
    const { episodes, index } = seriesContext;
    if (index >= episodes.length - 1) return;
    if (!$('autoplay-check')?.checked) return;

    const nextEp   = episodes[index + 1];
    const nextNum  = nextEp?.number ?? nextEp?.episode ?? (index + 2);
    const nextTitle = `Episodio ${nextNum}${nextEp?.title ? ' — ' + nextEp.title : ''}`;

    $('p-autoplay-ep-title').textContent = nextTitle;
    $('p-autoplay-next').style.display   = 'block';

    const bar = $('p-autoplay-progress');
    bar.style.transition = 'none';
    bar.style.width      = '100%';
    requestAnimationFrame(() => {
      bar.style.transition = `width ${AUTOPLAY_DELAY}s linear`;
      bar.style.width      = '0%';
    });

    clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(() => {
      $('p-autoplay-next').style.display = 'none';
      nextEp();
    }, AUTOPLAY_DELAY * 1000);
  }

  function cancelAutoplay() {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
    const el = $('p-autoplay-next');
    if (el) el.style.display = 'none';
  }

  // ── Helpers ─────────────────────────────────────
  function _prepareUI(title, epLabel) {
    $('player').classList.add('open');
    $('p-title-el').textContent = title || '';
    $('p-ep-label').textContent = epLabel || '';
    $('p-loading').classList.remove('hidden');
    $('p-loading-title').textContent = 'Conectando...';
    $('p-play-btn').textContent  = '⏸';
    $('p-fill').style.width      = '0%';
    $('p-time').textContent      = '0:00 / 0:00';
    $('p-servers').innerHTML     = '';

    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    vid().src = '';
    vid().autoplay = true;
    vid().onloadedmetadata = null;
    ifr().src = '';
    ifr().style.display = 'none';
    vid().style.display = 'block';
  }

  function _showEpNav(show) {
    $('p-prev-ep').style.display = show ? 'flex' : 'none';
    $('p-next-ep').style.display = show ? 'flex' : 'none';
    _updateEpNavButtons();
  }

  function _updateEpNavButtons() {
    if (!seriesContext) return;
    const { index, episodes } = seriesContext;
    $('p-prev-ep').style.opacity = index > 0                        ? '1' : '0.3';
    $('p-next-ep').style.opacity = index < episodes.length - 1      ? '1' : '0.3';
  }

  function _loadLive(item) {
    const hlsUrl = item.sources.find(s => s.includes('.m3u8')) || item.sources[0];
    if (item.sources.length > 1) {
      const srv = $('p-servers');
      item.sources.forEach((s, i) => {
        const b = document.createElement('div');
        b.className   = 'p-srv-btn' + (i === 0 ? ' active' : '');
        b.textContent = 'HLS ' + (i + 1);
        b.onclick = () => {
          srv.querySelectorAll('.p-srv-btn').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          _loadStream(s, true);
        };
        srv.appendChild(b);
      });
    }
    _loadStream(hlsUrl, true);
  }

  async function _resolveAndPlay(item) {
    let embedUrl = item.embedUrl || '';

    // Step 1: get player data from API
    if (!embedUrl && item.postId) {
      _log('Obteniendo fuentes de la API...');
      const data = await Api.fetchPlayer(item.postId);
      if (!data) { _noStream('API no respondió'); return; }

      embedUrl = Api.extractEmbed(data);
      _log('Embed encontrado: ' + (embedUrl ? embedUrl.slice(0, 60) + '...' : 'NINGUNO'), embedUrl ? '#46d369' : '#f55');

      // Build server switcher buttons
      const servers = Api.extractPlayerSources(data);
      _buildServerButtons(servers, (url) => _tryEmbed(url));
    }

    if (!embedUrl) { _noStream('No se encontró URL de embed'); return; }

    await _tryEmbed(embedUrl);
  }

  async function _tryEmbed(embedUrl) {
    _log('Extrayendo stream de: ' + embedUrl.slice(0, 60) + '...');
    if (/\.m3u8(?:\?|#|$)/i.test(embedUrl)) {
      _log('Stream HLS directo encontrado ✓', '#46d369');
      ifr().style.display = 'none';
      vid().style.display = 'block';
      _loadStream(embedUrl, false);
      return;
    }
    const m3u8 = await Api.extractM3u8(embedUrl);

    if (m3u8) {
      _log('Stream HLS encontrado ✓', '#46d369');
      ifr().style.display = 'none';
      vid().style.display = 'block';
      _loadStream(m3u8, false);
    } else {
      // Fallback: iframe (vimeos.net serves its own player)
      _log('Usando iframe embed (el player externo se cargará)', '#f5c518');
      ifr().src           = embedUrl;
      ifr().style.display = 'block';
      vid().style.display = 'none';
      // Keep loading overlay briefly, then hide
      setTimeout(() => $('p-loading').classList.add('hidden'), 3000);
    }
  }

  function _buildServerButtons(servers, onPick) {
    if (!servers.length) return;
    const srv = $('p-servers');
    servers.forEach((s, i) => {
      const url = s.url || s.embed || s.embed_url || s.iframe || s.file || s.link || '';
      if (!url) return;
      const b = document.createElement('div');
      b.className   = 'p-srv-btn' + (i === 0 ? ' active' : '');
      b.textContent = s.name || s.server || s.label || 'Srv ' + (i + 1);
      b.onclick = () => {
        srv.querySelectorAll('.p-srv-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        $('p-loading').classList.remove('hidden');
        onPick(url);
      };
      srv.appendChild(b);
    });
  }

  function _loadStream(url, isLive) {
    const v = vid();
    $('p-loading').classList.remove('hidden');
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    v.autoplay = true;

    if (url.includes('.m3u8') && Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker:    true,
        lowLatencyMode:  isLive,
        backBufferLength: isLive ? 0 : 30,
        xhrSetup: xhr => { xhr.withCredentials = false; },
      });
      hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        _preferSpanishAudioHls();
      });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(v);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        _preferSpanishAudioHls();
        v.play().catch(() => {});
        $('p-loading').classList.add('hidden');
        $('p-play-btn').textContent = '⏸';
      });
      hlsInstance.on(Hls.Events.ERROR, (e, d) => {
        console.error('[HLS error]', d);
        if (d.fatal) _noStream('Error HLS: ' + d.type);
      });
    } else if (v.canPlayType('application/x-mpegURL')) {
      v.src = url;
      v.onloadedmetadata = () => {
        _preferSpanishAudioNative();
      };
      v.play().catch(() => {});
      $('p-loading').classList.add('hidden');
    } else {
      v.src = url;
      v.onloadedmetadata = () => {
        _preferSpanishAudioNative();
      };
      v.play().catch(() => {});
      v.oncanplay = () => $('p-loading').classList.add('hidden');
    }

    v.ontimeupdate = _updateProgress;
    v.onended      = _onEnded;
  }

  function _onEnded() {
    $('p-play-btn').textContent = '▶';
    if (seriesContext) _scheduleAutoplay();
  }

  function _updateProgress() {
    const v = vid();
    if (!v || !v.duration || isNaN(v.duration)) return;
    const pct = (v.currentTime / v.duration * 100).toFixed(2);
    $('p-fill').style.width = pct + '%';
    $('p-time').textContent = UI.fmt(v.currentTime) + ' / ' + UI.fmt(v.duration);
    if (seriesContext && !autoplayTimer && parseFloat(pct) >= 95) _scheduleAutoplay();
  }

  function _noStream(reason = '') {
    $('p-loading').classList.add('hidden');
    UI.toast('⚠ ' + (reason || 'Stream no disponible. Prueba otro servidor.'));
    console.error('[Player] no stream:', reason);
  }

  // ── Public controls ─────────────────────────────
  function close() {
    cancelAutoplay();
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    vid().pause();
    vid().src = '';
    ifr().src = '';
    ifr().style.display = 'none';
    vid().style.display = 'block';
    $('player').classList.remove('open');
    seriesContext = null;
  }

  function togglePlay() {
    const v = vid();
    if (v.paused) { v.play(); $('p-play-btn').textContent = '⏸'; }
    else          { v.pause(); $('p-play-btn').textContent = '▶'; }
  }

  function skip(s) { const v = vid(); if (v) v.currentTime += s; }

  function setVol(val) {
    const v = vid();
    if (v) { v.volume = parseFloat(val); $('p-vol-icon').textContent = val > 0 ? '🔊' : '🔇'; }
  }

  function toggleMute() {
    const v = vid();
    if (v) { v.muted = !v.muted; $('p-vol-icon').textContent = v.muted ? '🔇' : '🔊'; }
  }

  function toggleFS() {
    const p = $('player');
    if (!document.fullscreenElement) p.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }

  function seek(e) {
    const v = vid();
    if (!v || !v.duration) return;
    const r = $('p-progress').getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  }

  return {
    open, openEpisode,
    close, togglePlay, skip, setVol, toggleMute, toggleFS, seek,
    prevEp, nextEp, playNextNow, cancelAutoplay,
  };
})();