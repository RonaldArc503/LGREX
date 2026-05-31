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
const Player = /* @__PURE__ */ (() => {
  let hlsInstance = null;
  let seriesContext = null;
  let autoplayTimer = null;
  const $ = (id) => document.getElementById(id);
  const vid = () => $("video-el");
  const ifr = () => $("iframe-el");
  function _normText(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function _isSpanishAudio(track) {
    const text = _normText([
      track == null ? void 0 : track.label,
      track == null ? void 0 : track.name,
      track == null ? void 0 : track.lang,
      track == null ? void 0 : track.language,
      track == null ? void 0 : track.groupId
    ].filter(Boolean).join(" "));
    return /\bes\b/.test(text) || /espanol/.test(text) || /spanish/.test(text) || /latino/.test(text) || /\bspa\b/.test(text);
  }
  function _preferSpanishAudioHls() {
    if (!hlsInstance || !hlsInstance.audioTracks || !hlsInstance.audioTracks.length) return false;
    const tracks = hlsInstance.audioTracks;
    const preferredIndex = tracks.findIndex(_isSpanishAudio);
    if (preferredIndex >= 0 && hlsInstance.audioTrack !== preferredIndex) {
      hlsInstance.audioTrack = preferredIndex;
      _log("Audio espa\xF1ol seleccionado", "#46d369");
      return true;
    }
    return false;
  }
  function _preferSpanishAudioNative() {
    var _a;
    const audioTracks = (_a = vid()) == null ? void 0 : _a.audioTracks;
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
    _log("Audio espa\xF1ol seleccionado", "#46d369");
    return true;
  }
  function _log(msg, color = "#aaa") {
    console.log("[Player]", msg);
    const el = $("p-loading-title");
    if (el) el.innerHTML = `<span style="color:${color};font-size:12px">${msg}</span>`;
  }
  function open(item) {
    var _a;
    if (!item) return;
    seriesContext = null;
    _prepareUI(item.title, "");
    _showEpNav(false);
    cancelAutoplay();
    if (item.isLive && ((_a = item.sources) == null ? void 0 : _a.length)) {
      _loadLive(item);
    } else {
      _resolveAndPlay(item);
    }
  }
  function openEpisode(series, episodes, index, seasonsData) {
    var _a, _b, _c, _d, _e;
    seriesContext = { series, episodes, index, seasonsData };
    const ep = episodes[index];
    const sn = (_b = (_a = ep.season) != null ? _a : ep.temporada) != null ? _b : 1;
    const num = (_e = (_d = (_c = ep.number) != null ? _c : ep.episode) != null ? _d : ep.episodio) != null ? _e : index + 1;
    const epLabel = `T${sn} E${num} \u2014 ${ep.title || ep.name || "Episodio " + num}`;
    _prepareUI(series.title, epLabel);
    _showEpNav(true);
    cancelAutoplay();
    _updateEpNavButtons();
    const epItem = __spreadProps(__spreadValues({}, series), {
      title: series.title,
      postId: ep._id || ep.id || ep.post_id || series.postId,
      embedUrl: ep.embed_url || ep.iframe || ""
    });
    _resolveAndPlay(epItem);
  }
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
  function playNextNow() {
    cancelAutoplay();
    nextEp();
  }
  function _scheduleAutoplay() {
    var _a, _b, _c;
    if (!seriesContext) return;
    const { episodes, index } = seriesContext;
    if (index >= episodes.length - 1) return;
    if (!((_a = $("autoplay-check")) == null ? void 0 : _a.checked)) return;
    const nextEp2 = episodes[index + 1];
    const nextNum = (_c = (_b = nextEp2 == null ? void 0 : nextEp2.number) != null ? _b : nextEp2 == null ? void 0 : nextEp2.episode) != null ? _c : index + 2;
    const nextTitle = `Episodio ${nextNum}${(nextEp2 == null ? void 0 : nextEp2.title) ? " \u2014 " + nextEp2.title : ""}`;
    $("p-autoplay-ep-title").textContent = nextTitle;
    $("p-autoplay-next").style.display = "block";
    const bar = $("p-autoplay-progress");
    bar.style.transition = "none";
    bar.style.width = "100%";
    requestAnimationFrame(() => {
      bar.style.transition = `width ${AUTOPLAY_DELAY}s linear`;
      bar.style.width = "0%";
    });
    clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(() => {
      $("p-autoplay-next").style.display = "none";
      nextEp2();
    }, AUTOPLAY_DELAY * 1e3);
  }
  function cancelAutoplay() {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
    const el = $("p-autoplay-next");
    if (el) el.style.display = "none";
  }
  function _prepareUI(title, epLabel) {
    $("player").classList.add("open");
    $("p-title-el").textContent = title || "";
    $("p-ep-label").textContent = epLabel || "";
    $("p-loading").classList.remove("hidden");
    $("p-loading-title").textContent = "Conectando...";
    $("p-play-btn").textContent = "\u23F8";
    $("p-fill").style.width = "0%";
    $("p-time").textContent = "0:00 / 0:00";
    $("p-servers").innerHTML = "";
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    vid().src = "";
    vid().autoplay = true;
    vid().muted = true;
    vid().defaultMuted = true;
    vid().onloadedmetadata = null;
    ifr().src = "";
    ifr().style.display = "none";
    vid().style.display = "block";
  }
  function _showEpNav(show) {
    $("p-prev-ep").style.display = show ? "flex" : "none";
    $("p-next-ep").style.display = show ? "flex" : "none";
    _updateEpNavButtons();
  }
  function _updateEpNavButtons() {
    if (!seriesContext) return;
    const { index, episodes } = seriesContext;
    $("p-prev-ep").style.opacity = index > 0 ? "1" : "0.3";
    $("p-next-ep").style.opacity = index < episodes.length - 1 ? "1" : "0.3";
  }
  function _loadLive(item) {
    const hlsUrl = item.sources.find((s) => s.includes(".m3u8")) || item.sources[0];
    if (item.sources.length > 1) {
      const srv = $("p-servers");
      item.sources.forEach((s, i) => {
        const b = document.createElement("div");
        b.className = "p-srv-btn" + (i === 0 ? " active" : "");
        b.textContent = "HLS " + (i + 1);
        b.onclick = () => {
          srv.querySelectorAll(".p-srv-btn").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          _loadStream(s, true);
        };
        srv.appendChild(b);
      });
    }
    _loadStream(hlsUrl, true);
  }
  function _resolveAndPlay(item) {
    return __async(this, null, function* () {
      let embedUrl = item.embedUrl || "";
      let servers = [];
      if (!embedUrl && item.postId) {
        _log("Obteniendo fuentes de la API...");
        const data = yield Api.fetchPlayer(item.postId);
        if (!data) {
          _noStream("API no respondi\xF3");
          return;
        }
        embedUrl = Api.extractEmbed(data);
        _log("Embed encontrado: " + (embedUrl ? embedUrl.slice(0, 60) + "..." : "NINGUNO"), embedUrl ? "#46d369" : "#f55");
        servers = Api.extractPlayerSources(data);
        // Prioritize server index 1 (server 2) when available — many sources here provide a faster HLS server
        try {
          if (Array.isArray(servers) && servers.length > 1) {
            const preferred = servers.splice(1, 1)[0];
            if (preferred) servers.unshift(preferred);
            _log("Priorizando servidor 2 como predeterminado", "#46d369");
          }
        } catch (e) {}
        _buildServerButtons(servers, (url) => _tryEmbed(url));
      }
      const candidateUrls = [];
      // Prefer server-provided URLs first (after reordering above), then fall back to raw embedUrl
      servers.forEach((s) => {
        const url = s.url || s.embed || s.embed_url || s.iframe || s.file || s.link || "";
        if (url && !candidateUrls.includes(url)) candidateUrls.push(url);
      });
      if (embedUrl && !candidateUrls.includes(embedUrl)) candidateUrls.push(embedUrl);
      if (!candidateUrls.length) {
        _noStream("No se encontr\xF3 URL de embed");
        return;
      }
      for (let i = 0; i < candidateUrls.length; i++) {
        const url = candidateUrls[i];
        const tryingMsg = candidateUrls.length > 1 ? `Probando servidor ${i + 1}/${candidateUrls.length}...` : "Probando servidor...";
        _log(tryingMsg, "#f5c518");
        const ok = yield _tryEmbed(url, false);
        if (ok) return;
      }
      _noStream("Ning\xFAn servidor compatible con reproducci\xF3n directa.");
    });
  }
  function _tryEmbed(embedUrl, showErrorOnFail = true) {
    return __async(this, null, function* () {
      _log("Extrayendo stream de: " + embedUrl.slice(0, 60) + "...");
      if (/\.m3u8(?:\?|#|$)/i.test(embedUrl)) {
        _log("Stream HLS directo encontrado \u2713", "#46d369");
        ifr().style.display = "none";
        vid().style.display = "block";
        _loadStream(embedUrl, false);
        return true;
      }
      const m3u8 = yield Api.extractM3u8(embedUrl);
      if (m3u8) {
        _log("Stream HLS encontrado \u2713", "#46d369");
        ifr().style.display = "none";
        vid().style.display = "block";
        _loadStream(m3u8, false);
        return true;
      } else {
        if (!ALLOW_IFRAME_FALLBACK) {
          _log("Servidor no compatible: no se pudo extraer stream directo", "#f55");
          if (showErrorOnFail) {
            _noStream("Este servidor usa iframe externo bloqueado por CORS/ads. Prueba otro servidor.");
          }
          return false;
        }
        _log("Usando reproductor externo", "#f5c518");
        ifr().src = _withAutoplayParams(embedUrl);
        ifr().style.display = "block";
        vid().style.display = "none";
        setTimeout(() => $("p-loading").classList.add("hidden"), 3e3);
        return true;
      }
    });
  }
  function _withAutoplayParams(url) {
    if (!url) return "";
    try {
      const u = new URL(url, window.location.href);
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("mute", "1");
      u.searchParams.set("muted", "1");
      u.searchParams.set("playsinline", "1");
      return u.toString();
    } catch (_) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}autoplay=1&mute=1&muted=1&playsinline=1`;
    }
  }
  function _buildServerButtons(servers, onPick) {
    if (!servers.length) return;
    const srv = $("p-servers");
    servers.forEach((s, i) => {
      const url = s.url || s.embed || s.embed_url || s.iframe || s.file || s.link || "";
      if (!url) return;
      const b = document.createElement("div");
      b.className = "p-srv-btn" + (i === 0 ? " active" : "");
      b.tabIndex = 0;
      b.setAttribute("role", "button");
      b.textContent = s.name || s.server || s.label || "Srv " + (i + 1);
      b.onclick = () => {
        srv.querySelectorAll(".p-srv-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $("p-loading").classList.remove("hidden");
        onPick(url);
      };
      srv.appendChild(b);
    });
  }
  function _updateVolumeIcon(v = vid()) {
    if (!v) return;
    $("p-vol-icon").textContent = v.muted || v.volume === 0 ? "\u{1F507}" : "\u{1F50A}";
  }
  function _attemptAutoUnmute(v) {
    if (!v) return;
    setTimeout(() => {
      if (v.paused) return;
      v.muted = false;
      v.defaultMuted = false;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          v.muted = true;
          v.defaultMuted = true;
          _log("Autoplay con sonido bloqueado por el navegador", "#f5c518");
        }).finally(() => _updateVolumeIcon(v));
      } else {
        _updateVolumeIcon(v);
      }
    }, 280);
  }
  function _playWithAutoplayFallback(v, context = "") {
    if (!v) return Promise.resolve();
    v.autoplay = true;
    v.muted = true;
    v.defaultMuted = true;
    const startPlayback = () => v.play().then(() => {
      _attemptAutoUnmute(v);
    }).catch((err) => {
      console.warn("[Player] autoplay blocked", context, err);
      return new Promise((resolve, reject) => {
        const retry = () => {
          v.removeEventListener("canplay", retry);
          v.removeEventListener("loadedmetadata", retry);
          v.play().then(() => {
            _log("Reproducci\xF3n autom\xE1tica activada", "#46d369");
            _attemptAutoUnmute(v);
            resolve();
          }).catch((err2) => {
            console.warn("[Player] autoplay retry failed", context, err2);
            reject(err2);
          });
        };
        if (v.readyState >= 2) {
          retry();
        } else {
          v.addEventListener("canplay", retry, { once: true });
          v.addEventListener("loadedmetadata", retry, { once: true });
        }
      }).catch((err2) => {
        console.warn("[Player] muted autoplay fallback failed", context, err2);
        throw err2;
      });
    });
    return startPlayback();
  }
  function _loadStream(url, isLive) {
    const v = vid();
    $("p-loading").classList.remove("hidden");
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    v.autoplay = true;
    if (url.includes(".m3u8") && Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 0 : 30,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });
      hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        _preferSpanishAudioHls();
      });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(v);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        _preferSpanishAudioHls();
        v.muted = true;
        v.defaultMuted = true;
        _playWithAutoplayFallback(v, "hls-manifest");
        $("p-loading").classList.add("hidden");
        $("p-play-btn").textContent = "\u23F8";
      });
      hlsInstance.on(Hls.Events.ERROR, (e, d) => {
        console.error("[HLS error]", d);
        if (d.fatal) _noStream("Error HLS: " + d.type);
      });
    } else if (v.canPlayType("application/x-mpegURL")) {
      v.src = url;
      v.onloadedmetadata = () => {
        _preferSpanishAudioNative();
      };
      v.muted = true;
      v.defaultMuted = true;
      _playWithAutoplayFallback(v, "native-hls");
      $("p-loading").classList.add("hidden");
    } else {
      v.src = url;
      v.onloadedmetadata = () => {
        _preferSpanishAudioNative();
      };
      v.muted = true;
      v.defaultMuted = true;
      _playWithAutoplayFallback(v, "direct-file");
      v.oncanplay = () => $("p-loading").classList.add("hidden");
    }
    v.ontimeupdate = _updateProgress;
    v.onended = _onEnded;
  }
  function _onEnded() {
    $("p-play-btn").textContent = "\u25B6";
    if (seriesContext) _scheduleAutoplay();
  }
  function _updateProgress() {
    const v = vid();
    if (!v || !v.duration || isNaN(v.duration)) return;
    const pct = (v.currentTime / v.duration * 100).toFixed(2);
    $("p-fill").style.width = pct + "%";
    $("p-time").textContent = UI.fmt(v.currentTime) + " / " + UI.fmt(v.duration);
    if (seriesContext && !autoplayTimer && parseFloat(pct) >= 95) _scheduleAutoplay();
  }
  function _noStream(reason = "") {
    $("p-loading").classList.add("hidden");
    UI.toast("\u26A0 " + (reason || "Stream no disponible. Prueba otro servidor."));
    console.error("[Player] no stream:", reason);
  }
  function close() {
    cancelAutoplay();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    vid().pause();
    vid().src = "";
    ifr().src = "";
    ifr().style.display = "none";
    vid().style.display = "block";
    $("player").classList.remove("open");
    seriesContext = null;
  }
  function togglePlay() {
    const v = vid();
    // If iframe player is visible, don't attempt to control <video>
    if (ifr() && ifr().style.display === "block") {
      UI.toast("Reproductor externo activo; usa sus controles.");
      return;
    }
    // Ensure there is a source available before trying to play
    const hasSrc = v && (v.currentSrc || v.src);
    if (!hasSrc) {
      UI.toast("No hay fuentes disponibles para reproducir.");
      return;
    }
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.then(() => {
          $("p-play-btn").textContent = "\u23F8";
        }).catch((err) => {
          console.warn('[Player] play failed', err);
          UI.toast('No se pudo iniciar la reproducción.');
          $("p-play-btn").textContent = "\u25B6";
        });
      } else {
        $("p-play-btn").textContent = "\u23F8";
      }
    } else {
      v.pause();
      $("p-play-btn").textContent = "\u25B6";
    }
  }
  function skip(s) {
    const v = vid();
    if (v) v.currentTime += s;
  }
  function setVol(val) {
    const v = vid();
    if (v) {
      v.volume = parseFloat(val);
      $("p-vol-icon").textContent = val > 0 ? "\u{1F50A}" : "\u{1F507}";
    }
  }
  function toggleMute() {
    const v = vid();
    if (v) {
      v.muted = !v.muted;
      $("p-vol-icon").textContent = v.muted ? "\u{1F507}" : "\u{1F50A}";
    }
  }
  function toggleFS() {
    const p = $("player");
    if (!document.fullscreenElement) p.requestFullscreen().catch(() => {
    });
    else document.exitFullscreen();
  }
  function seek(e) {
    const v = vid();
    if (!v || !v.duration) return;
    const r = $("p-progress").getBoundingClientRect();
    v.currentTime = (e.clientX - r.left) / r.width * v.duration;
  }
  return {
    open,
    openEpisode,
    close,
    togglePlay,
    skip,
    setVol,
    toggleMute,
    toggleFS,
    seek,
    prevEp,
    nextEp,
    playNextNow,
    cancelAutoplay
  };
})();
