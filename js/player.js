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
var Player = (function() {
  var hlsInstance = null;
  var seriesContext = null;
  var autoplayTimer = null;
  var playbackCandidates = [];
  var playbackCandidateIndex = -1;
  var playbackRetrying = false;
  var IS_WEBOS = navigator.userAgent.indexOf("Web0S") >= 0 || navigator.userAgent.indexOf("WebOS") >= 0 || navigator.userAgent.indexOf("SmartTV") >= 0 || typeof window.webOS !== "undefined";
  var $ = function(id) { return document.getElementById(id); };
  var vid = function() { return $("video-el"); };
  var ifr = function() { return $("iframe-el"); };
  function _normText(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function _isSpanishAudio(track) {
    var text = _normText([
      track && track.label,
      track && track.name,
      track && track.lang,
      track && track.language,
      track && track.groupId
    ].filter(Boolean).join(" "));
    return /\bes\b/.test(text) || /espanol/.test(text) || /spanish/.test(text) || /latino/.test(text) || /\bspa\b/.test(text);
  }
  function _preferSpanishAudioHls() {
    if (!hlsInstance || !hlsInstance.audioTracks || !hlsInstance.audioTracks.length) return false;
    var tracks = hlsInstance.audioTracks;
    var preferredIndex = -1;
    for (var i = 0; i < tracks.length; i++) {
      if (_isSpanishAudio(tracks[i])) {
        preferredIndex = i;
        break;
      }
    }
    if (preferredIndex >= 0 && hlsInstance.audioTrack !== preferredIndex) {
      hlsInstance.audioTrack = preferredIndex;
      _log("Audio español seleccionado", "#46d369");
      return true;
    }
    return false;
  }
  function _preferSpanishAudioNative() {
    var v = vid();
    var audioTracks = v && v.audioTracks;
    if (!audioTracks || !audioTracks.length) return false;
    var preferredIndex = -1;
    for (var i = 0; i < audioTracks.length; i++) {
      if (_isSpanishAudio(audioTracks[i])) {
        preferredIndex = i;
        break;
      }
    }
    if (preferredIndex < 0) return false;
    for (var j = 0; j < audioTracks.length; j++) {
      audioTracks[j].enabled = j === preferredIndex;
    }
    _log("Audio español seleccionado", "#46d369");
    return true;
  }
  function _log(msg, color) {
    if (!color) color = "#aaa";
    console.log("[Player]", msg);
    var el = $("p-loading-title");
    if (el) el.innerHTML = '<span style="color:' + color + ';font-size:12px">' + msg + '</span>';
  }
  function _playbackUrlScore(url) {
    var value = String(url || "").toLowerCase();
    if (/\.m3u8(?:\?|#|$)/i.test(value)) return 0;
    if (value.indexOf("vimeos.net") >= 0 || value.indexOf("goodstream.one") >= 0) return 1;
    if (value.indexOf("hlswish.com") >= 0 || value.indexOf("streamwish.") >= 0 || value.indexOf("filemoon.") >= 0) return 8;
    return 4;
  }
  function open(item) {
    if (!item) return;
    seriesContext = null;
    _prepareUI(item.title, "");
    _showEpNav(false);
    cancelAutoplay();
    if (item.isLive && item.sources && item.sources.length) {
      _loadLive(item);
    } else {
      _resolveAndPlay(item);
    }
  }
  function openEpisode(series, episodes, index, seasonsData) {
    seriesContext = { series: series, episodes: episodes, index: index, seasonsData: seasonsData };
    var ep = episodes[index];
    var sn = ep.season || ep.temporada || 1;
    var num = ep.number || ep.episode || ep.episodio || index + 1;
    var epLabel = "T" + sn + " E" + num + " — " + (ep.title || ep.name || "Episodio " + num);
    _prepareUI(series.title, epLabel);
    _showEpNav(true);
    cancelAutoplay();
    _updateEpNavButtons();
    var epItem = __spreadProps(__spreadValues({}, series), {
      title: series.title,
      postId: ep._id || ep.id || ep.post_id || series.postId,
      embedUrl: ep.embed_url || ep.iframe || ""
    });
    _resolveAndPlay(epItem);
  }
  function prevEp() {
    if (!seriesContext) return;
    var ctx = seriesContext;
    if (ctx.index > 0) openEpisode(ctx.series, ctx.episodes, ctx.index - 1, ctx.seasonsData);
  }
  function nextEp() {
    if (!seriesContext) return;
    var ctx = seriesContext;
    if (ctx.index < ctx.episodes.length - 1) openEpisode(ctx.series, ctx.episodes, ctx.index + 1, ctx.seasonsData);
  }
  function playNextNow() {
    cancelAutoplay();
    nextEp();
  }
  function _scheduleAutoplay() {
    if (!seriesContext) return;
    var ctx = seriesContext;
    if (ctx.index >= ctx.episodes.length - 1) return;
    var check = $("autoplay-check");
    if (check && !check.checked) return;
    var nextEp2 = ctx.episodes[ctx.index + 1];
    var nextNum = nextEp2 && (nextEp2.number || nextEp2.episode) || ctx.index + 2;
    var nextTitle = "Episodio " + nextNum + (nextEp2 && nextEp2.title ? " — " + nextEp2.title : "");
    $("p-autoplay-ep-title").textContent = nextTitle;
    $("p-autoplay-next").style.display = "block";
    var bar = $("p-autoplay-progress");
    bar.style.transition = "none";
    bar.style.width = "100%";
    requestAnimationFrame(function() {
      bar.style.transition = "width " + AUTOPLAY_DELAY + "s linear";
      bar.style.width = "0%";
    });
    clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(function() {
      $("p-autoplay-next").style.display = "none";
      nextEp();
    }, AUTOPLAY_DELAY * 1e3);
  }
  function cancelAutoplay() {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
    var el = $("p-autoplay-next");
    if (el) el.style.display = "none";
  }
  function _prepareUI(title, epLabel) {
    var wasOpen = $("player").classList.contains("open");
    $("player").classList.add("open");
    if (!wasOpen && window.Navigation && !window.location.pathname.includes('watch.html')) {
      Navigation.recordOverlay("player");
    }
    $("p-title-el").textContent = title || "Reproduciendo...";
    $("p-ep-label").textContent = epLabel || "";
    $("p-loading").classList.remove("hidden");
    $("p-loading-title").textContent = "Conectando...";
    $("p-play-btn").textContent = "⏸";
    $("p-fill").style.width = "0%";
    $("p-time").textContent = "0:00 / 0:00";
    $("p-servers").innerHTML = "";
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    var v = vid();
    v.src = "";
    v.autoplay = true;
    v.muted = true;
    v.defaultMuted = true;
    v.onloadedmetadata = null;
    var i = ifr();
    i.src = "";
    i.style.display = "none";
    v.style.display = "block";
  }
  function _showEpNav(show) {
    $("p-prev-ep").style.display = show ? "flex" : "none";
    $("p-next-ep").style.display = show ? "flex" : "none";
    _updateEpNavButtons();
  }
  function _updateEpNavButtons() {
    if (!seriesContext) return;
    var ctx = seriesContext;
    $("p-prev-ep").style.opacity = ctx.index > 0 ? "1" : "0.3";
    $("p-next-ep").style.opacity = ctx.index < ctx.episodes.length - 1 ? "1" : "0.3";
  }
  function _loadLive(item) {
    if (!item.sources || !item.sources.length) {
      _noStream("No hay fuentes para este canal.");
      return;
    }
    var hlsUrl = item.sources[0];
    for (var i = 0; i < item.sources.length; i++) {
      if (item.sources[i].indexOf(".m3u8") >= 0) {
        hlsUrl = item.sources[i];
        break;
      }
    }
    if (item.sources.length > 1) {
      var srv = $("p-servers");
      srv.innerHTML = "";
      for (var j = 0; j < item.sources.length; j++) {
        (function(idx) {
          var s = item.sources[idx];
          var b = document.createElement("div");
          b.className = "p-srv-btn" + (idx === 0 ? " active" : "");
          b.tabIndex = 0;
          b.setAttribute("role", "button");
          b.textContent = "HLS " + (idx + 1);
          b.onclick = function() {
            srv.querySelectorAll(".p-srv-btn").forEach(function(x) { x.classList.remove("active"); });
            b.classList.add("active");
            _loadStream(s, true);
          };
          srv.appendChild(b);
        })(j);
      }
    }
    _loadStream(hlsUrl, true);
  }
  function _resolveAndPlay(item) {
    return __async(this, null, function* () {
      _log("Buscando fuentes...");
      var embedUrl = item.embedUrl || "";
      var servers = item._servers || [];
      
      // Manejo especial para fútbol
      if (item.type === 'football' || (item.url && item.url.indexOf('futbol-libre') >= 0)) {
        _log("Resolviendo evento deportivo...");
        var res = yield Api.resolveFootballSource(item.url || embedUrl);
        if (res) {
          if (res.type === 'hls') {
            _log("Stream deportivo encontrado ✓", "#46d369");
            _loadStream(res.stream, true);
            return;
          } else if (res.type === 'iframe') {
            _log("Usando reproductor externo deportivo", "#f5c518");
            ifr().src = _withAutoplayParams(res.stream);
            ifr().style.display = "block";
            vid().style.display = "none";
            setTimeout(function() { var l = $("p-loading"); if (l) l.classList.add("hidden"); }, 3e3);
            return;
          }
        }
      }

      if (item.isLive && item.sources && item.sources.length) {
        _loadStream(item.sources[0], true);
        return;
      }
      if ((!embedUrl || !servers.length) && item.postId) {
        var data = yield Api.fetchPlayer(item.postId);
        if (!data) {
          if (!embedUrl) {
            _noStream("API no respondió");
            return;
          }
        } else {
          if (!embedUrl) embedUrl = Api.extractEmbed(data);
          servers = Api.extractPlayerSources(data);
          item._servers = servers;
          _log("Fuentes obtenidas: " + servers.length, "#46d369");
        }
      }
      if (servers.length) {
        _buildServerButtons(servers, function(url) { return _tryEmbed(url); });
      }
      var candidateUrls = [];
      for (var k = 0; k < servers.length; k++) {
        var s = servers[k];
        var url = s.url || s.embed || s.embed_url || s.iframe || s.file || s.link || "";
        if (url && candidateUrls.indexOf(url) < 0) candidateUrls.push(url);
      }
      if (embedUrl && candidateUrls.indexOf(embedUrl) < 0) candidateUrls.push(embedUrl);
      candidateUrls.sort(function(a, b) { return _playbackUrlScore(a) - _playbackUrlScore(b); });
      playbackCandidates = candidateUrls.slice();
      playbackCandidateIndex = -1;
      if (!candidateUrls.length) {
        _noStream("No se encontró URL de embed");
        return;
      }
      _log("Buscando stream directo para autoplay...", "#f5c518");
      for (var i = 0; i < candidateUrls.length; i++) {
        var url = candidateUrls[i];
        var tryingMsg = candidateUrls.length > 1 ? "Probando servidor " + (i + 1) + "/" + candidateUrls.length + "..." : "Probando servidor...";
        _log(tryingMsg, "#f5c518");
        var ok = yield _tryEmbed(url, false, i, { allowIframe: false });
        if (ok) return;
      }
      if (ALLOW_IFRAME_FALLBACK) {
        _log("Sin HLS directo; usando reproductor externo como ultimo recurso", "#f5c518");
        for (var j = 0; j < candidateUrls.length; j++) {
          var ok2 = yield _tryEmbed(candidateUrls[j], false, j, { allowIframe: true });
          if (ok2) return;
        }
      }
      _noStream("Ningún servidor compatible con reproducción directa.");
    });
  }
  function _tryEmbed(embedUrl, showErrorOnFail, candidateIndex, options) {
    if (showErrorOnFail === undefined) showErrorOnFail = true;
    if (candidateIndex === undefined) candidateIndex = -1;
    if (!options) options = {};
    return __async(this, null, function* () {
      var allowIframe = options.allowIframe !== false;
      if (candidateIndex >= 0) playbackCandidateIndex = candidateIndex;
      _log("Extrayendo stream de: " + embedUrl.slice(0, 60) + "...");
      if (/\.m3u8(?:\?|#|$)/i.test(embedUrl)) {
        _log("Stream HLS directo encontrado ✓", "#46d369");
        ifr().style.display = "none";
        vid().style.display = "block";
        _loadStream(embedUrl, false);
        return true;
      }
      var m3u8 = yield Api.extractM3u8(embedUrl);
      if (m3u8) {
        _log("Stream HLS encontrado ✓", "#46d369");
        ifr().style.display = "none";
        vid().style.display = "block";
        _loadStream(m3u8, false);
        return true;
      } else {
        if (!ALLOW_IFRAME_FALLBACK || !allowIframe) {
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
        setTimeout(function() { var l = $("p-loading"); if (l) l.classList.add("hidden"); }, 3e3);
        return true;
      }
    });
  }
  function _fallbackToNextCandidate(reason) {
    if (!reason) reason = "";
    if (playbackRetrying) return false;
    var nextIndex = playbackCandidateIndex + 1;
    if (!playbackCandidates.length || nextIndex >= playbackCandidates.length) {
      return false;
    }
    var nextUrl = playbackCandidates[nextIndex];
    playbackRetrying = true;
    _log("Fallback al servidor " + (nextIndex + 1) + "/" + playbackCandidates.length + (reason ? " tras " + reason : ""), "#f5c518");
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    setTimeout(function() {
      playbackRetrying = false;
      _tryEmbed(nextUrl, true, nextIndex);
    }, 0);
    return true;
  }
  function _withAutoplayParams(url) {
    if (!url) return "";
    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("mute", "1");
      u.searchParams.set("muted", "1");
      u.searchParams.set("playsinline", "1");
      return u.toString();
    } catch (_) {
      var sep = url.indexOf("?") >= 0 ? "&" : "?";
      return url + sep + "autoplay=1&mute=1&muted=1&playsinline=1";
    }
  }
  function _buildServerButtons(servers, onPick) {
    if (!servers || !servers.length) return;
    var srv = $("p-servers");
    srv.innerHTML = "";
    for (var i = 0; i < servers.length; i++) {
      (function(idx) {
        var s = servers[idx];
        var url = s.url || s.embed || s.embed_url || s.iframe || s.file || s.link || "";
        if (!url) return;
        var b = document.createElement("div");
        b.className = "p-srv-btn" + (idx === 0 ? " active" : "");
        b.tabIndex = 0;
        b.setAttribute("role", "button");
        b.textContent = s.name || s.server || s.label || "Srv " + (idx + 1);
        b.onclick = function() {
          srv.querySelectorAll(".p-srv-btn").forEach(function(x) { x.classList.remove("active"); });
          b.classList.add("active");
          $("p-loading").classList.remove("hidden");
          onPick(url);
        };
        srv.appendChild(b);
      })(i);
    }
  }
  function _updateVolumeIcon(v) {
    if (!v) v = vid();
    if (!v) return;
    $("p-vol-icon").textContent = v.muted || v.volume === 0 ? "🔇" : "🔊";
  }
  function _attemptAutoUnmute(v) {
    if (!v) return;
    setTimeout(function() {
      if (v.paused) return;
      v.muted = false;
      v.defaultMuted = false;
      var p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(function() {
          v.muted = true;
          v.defaultMuted = true;
          _log("Autoplay con sonido bloqueado por el navegador", "#f5c518");
        }).finally(function() { return _updateVolumeIcon(v); });
      } else {
        _updateVolumeIcon(v);
      }
    }, 280);
  }
  function _playWithAutoplayFallback(v, context) {
    if (!v) return Promise.resolve();
    v.autoplay = true;
    v.muted = true;
    v.defaultMuted = true;
    var startPlayback = function() {
      return v.play().then(function() {
        _attemptAutoUnmute(v);
      }).catch(function(err) {
        console.warn("[Player] autoplay blocked", context, err);
        return new Promise(function(resolve, reject) {
          var retry = function() {
            v.removeEventListener("canplay", retry);
            v.removeEventListener("loadedmetadata", retry);
            v.play().then(function() {
              _log("Reproducción automática activada", "#46d369");
              _attemptAutoUnmute(v);
              resolve();
            }).catch(function(err2) {
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
        }).catch(function(err2) {
          console.warn("[Player] muted autoplay fallback failed", context, err2);
          throw err2;
        });
      });
    };
    return startPlayback();
  }
  function _loadStream(url, isLive) {
    var v = vid();
    $("p-loading").classList.remove("hidden");
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    v.autoplay = true;
    var isM3u8 = url.indexOf(".m3u8") >= 0;
    var canNativeHls = !!(v.canPlayType("application/vnd.apple.mpegURL") || v.canPlayType("application/x-mpegURL"));
    var preferNativeHls = isM3u8 && canNativeHls && IS_WEBOS;
    if (isM3u8 && typeof Hls !== "undefined" && Hls.isSupported() && !preferNativeHls) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 0 : 30,
        xhrSetup: function(xhr) {
          xhr.withCredentials = false;
        }
      });
      hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, function() {
        _preferSpanishAudioHls();
      });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(v);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
        _preferSpanishAudioHls();
        v.muted = true;
        v.defaultMuted = true;
        _playWithAutoplayFallback(v, "hls-manifest");
        $("p-loading").classList.add("hidden");
        $("p-play-btn").textContent = "⏸";
      });
      hlsInstance.on(Hls.Events.ERROR, function(e, d) {
        console.error("[HLS error]", d);
        if (d.fatal) {
          var isNetwork = d.type === Hls.ErrorTypes.NETWORK_ERROR || d.details === Hls.ErrorDetails.FRAG_LOAD_ERROR || d.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR;
          if (isNetwork && _fallbackToNextCandidate("error de red HLS")) return;
          _noStream("Error HLS: " + d.type);
        }
      });
    } else if (canNativeHls) {
      v.src = url;
      v.onloadedmetadata = function() {
        _preferSpanishAudioNative();
      };
      v.muted = true;
      v.defaultMuted = true;
      _playWithAutoplayFallback(v, "native-hls");
      $("p-loading").classList.add("hidden");
    } else {
      v.src = url;
      v.onloadedmetadata = function() {
        _preferSpanishAudioNative();
      };
      v.muted = true;
      v.defaultMuted = true;
      _playWithAutoplayFallback(v, "direct-file");
      v.oncanplay = function() { return $("p-loading").classList.add("hidden"); };
    }
    v.ontimeupdate = _updateProgress;
    v.onended = _onEnded;
  }
  function _onEnded() {
    $("p-play-btn").textContent = "▶";
    if (seriesContext) _scheduleAutoplay();
  }
  function _updateProgress() {
    var v = vid();
    if (!v || !v.duration || isNaN(v.duration)) return;
    var pct = (v.currentTime / v.duration * 100).toFixed(2);
    $("p-fill").style.width = pct + "%";
    $("p-time").textContent = UI.fmt(v.currentTime) + " / " + UI.fmt(v.duration);
    if (seriesContext && !autoplayTimer && parseFloat(pct) >= 95) _scheduleAutoplay();
  }
  function _noStream(reason) {
    if (!reason) reason = "";
    $("p-loading").classList.add("hidden");
    UI.toast("⚠ " + (reason || "Stream no disponible. Prueba otro servidor."));
    console.error("[Player] no stream:", reason);
  }
  function close(options) {
    if (!options) options = {};
    cancelAutoplay();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    var v = vid();
    v.pause();
    v.src = "";
    var i = ifr();
    i.src = "";
    i.style.display = "none";
    v.style.display = "block";
    $("player").classList.remove("open");
    seriesContext = null;
    if (!options.skipHistory && window.Navigation) Navigation.closeOverlayHistorySafe();
  }
  function togglePlay() {
    var v = vid();
    var i = ifr();
    if (i && i.style.display === "block") {
      UI.toast("Reproductor externo activo; usa sus controles.");
      return;
    }
    var hasSrc = v && (v.currentSrc || v.src);
    if (!hasSrc) {
      UI.toast("No hay fuentes disponibles para reproducir.");
      return;
    }
    if (v.paused) {
      var p = v.play();
      if (p && typeof p.catch === "function") {
        p.then(function() {
          $("p-play-btn").textContent = "⏸";
        }).catch(function(err) {
          console.warn("[Player] play failed", err);
          UI.toast("No se pudo iniciar la reproducción.");
          $("p-play-btn").textContent = "▶";
        });
      } else {
        $("p-play-btn").textContent = "⏸";
      }
    } else {
      v.pause();
      $("p-play-btn").textContent = "▶";
    }
  }
  function skip(s) {
    var v = vid();
    if (v) v.currentTime += s;
  }
  function setVol(val) {
    var v = vid();
    if (v) {
      v.volume = parseFloat(val);
      $("p-vol-icon").textContent = val > 0 ? "🔊" : "🔇";
    }
  }
  function toggleMute() {
    var v = vid();
    if (v) {
      v.muted = !v.muted;
      $("p-vol-icon").textContent = v.muted ? "🔇" : "🔊";
    }
  }
  function toggleFS() {
    var p = $("player");
    if (!document.fullscreenElement) {
      p.requestFullscreen().catch(function() { });
    } else {
      document.exitFullscreen();
    }
  }
  function seek(e) {
    var v = vid();
    if (!v || !v.duration) return;
    var r = $("p-progress").getBoundingClientRect();
    v.currentTime = (e.clientX - r.left) / r.width * v.duration;
  }
  return {
    open: open,
    openEpisode: openEpisode,
    close: close,
    togglePlay: togglePlay,
    skip: skip,
    setVol: setVol,
    toggleMute: toggleMute,
    toggleFS: toggleFS,
    seek: seek,
    prevEp: prevEp,
    nextEp: nextEp,
    playNextNow: playNextNow,
    cancelAutoplay: cancelAutoplay
  };
})();
