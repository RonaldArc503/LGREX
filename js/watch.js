"use strict";
/* ══════════════════════════════════════════════
   WatchPage — página dedicada de detalle + player
   watch.html?id=XXX&type=movie|tvshows|anime&title=...
   ══════════════════════════════════════════════ */
var WatchPage = (function() {
  var _item = null;
  var _seasonsMap = null;
  var _currentSeason = null;

  function _getParam(name) {
    var reg = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
    var res = reg.exec(window.location.search);
    return res ? res[1] : null;
  }

  function init() {
    var postId  = _getParam('id');
    var type    = _getParam('type') || 'movie';
    var title   = _getParam('title') ? decodeURIComponent(_getParam('title')) : '';
    var season  = _getParam('season')  ? Number(_getParam('season'))  : null;
    var episode = _getParam('episode') ? Number(_getParam('episode')) : null;

    if (!postId) {
      _showError('No se especificó contenido. <a href="index.html">← Volver al catálogo</a>');
      return;
    }

    document.getElementById('w-title').textContent = title || 'Cargando...';
    document.title = (title || 'Cargando') + ' — REX TV';

    // Load taxonomies quietly
    Api.fetchTaxonomies().catch(function(){});

    _item = { id: postId, postId: postId, title: title || 'Sin título', type: type, embedUrl: '', isLive: false };

    // Fetch full item data
    Api.fetchPlayer(postId).then(function(raw) {
      if (raw) {
        var normalized = Api.normalizeItem ? Api.normalizeItem(raw, type) : raw;
        for (var key in normalized) {
          if (normalized.hasOwnProperty(key)) {
            _item[key] = normalized[key];
          }
        }
        _item.postId = postId;
        _item.type = type;
      }
      _fillDetail(_item);
      document.getElementById('watch-right').style.display = 'block';

      var embed = Api.extractEmbed(raw);
      if (embed) _item.embedUrl = embed;
      _buildServers(raw);

      document.getElementById('w-loading').style.display = 'none';
      document.getElementById('player').classList.add('open');

      if (season !== null && episode !== null && (type === 'tvshows' || type === 'anime')) {
        Api.fetchEpisodes(postId).then(function(epData) {
          if (epData && epData.seasons && epData.seasons.size) {
            _seasonsMap = epData.seasons;
            var seasonNums = [];
            _seasonsMap.forEach(function(val, key) { seasonNums.push(key); });
            seasonNums.sort(function(a, b){ return a - b; });
            
            var sKey = seasonNums[0];
            for (var i = 0; i < seasonNums.length; i++) {
              if (seasonNums[i] === season) { sKey = seasonNums[i]; break; }
            }
            
            var eps = _seasonsMap.get(sKey) || [];
            var idx = 0;
            for (var j = 0; j < eps.length; j++) {
              if (eps[j].number === episode || eps[j].episode === episode) { idx = j; break; }
            }
            Player.openEpisode(_item, eps, idx, _seasonsMap);
          } else {
            Player.open(_item);
          }
        }).catch(function() { Player.open(_item); });
      } else {
        Player.open(_item);
      }

      if (type === 'tvshows' || type === 'anime') {
        _loadEpisodes(season);
      }
      _loadRelated(type);

    }).catch(function(err) {
      console.error("WatchPage Init Error:", err);
      Player.open(_item);
      _el('w-loading').style.display = 'none';
    });
  }

  function _fillDetail(item) {
    document.getElementById('wd-title').textContent = item.title || '';
    document.getElementById('wd-desc').textContent  = item.desc  || item.overview || '';

    var castEl = document.getElementById('wd-cast');
    castEl.innerHTML = item.cast ? '<span>Reparto:</span> ' + item.cast : '';

    var posterSrc = item.backdrop || item.poster || item.img || '';
    var posterEl = document.getElementById('wd-poster');
    if (posterSrc) { 
      posterEl.src = posterSrc; 
      posterEl.style.display = 'block'; 
    }

    var meta = document.getElementById('wd-meta');
    var metaHtml = [];
    if (item.rating) metaHtml.push('<span class="rating">★ ' + item.rating + '</span><span class="sep"></span>');
    if (item.year) metaHtml.push('<span>' + item.year + '</span><span class="sep"></span>');
    if (item.genre) metaHtml.push('<span>' + item.genre + '</span>');
    if (item.dur) metaHtml.push('<span class="sep"></span><span>' + item.dur + '</span>');
    metaHtml.push('<span class="qual">HD</span>');
    meta.innerHTML = metaHtml.join('');

    var tagsEl = document.getElementById('wd-tags');
    tagsEl.innerHTML = '';
    var tags = item.tags || [item.genre].filter(Boolean);
    for (var i = 0; i < Math.min(tags.length, 6); i++) {
      var s = document.createElement('span');
      s.className = 'wd-tag';
      s.textContent = tags[i];
      tagsEl.appendChild(s);
    }
  }

  function _buildServers(data) {
    var servers = Api.extractPlayerSources(data);
    if (!servers || !servers.length) return;

    var tabsWrap = document.getElementById('watch-server-tabs');
    tabsWrap.innerHTML = '';
    for (var i = 0; i < servers.length; i++) {
      (function(idx) {
        var s = servers[idx];
        var b = document.createElement('div');
        b.className = 'server-tab' + (idx === 0 ? ' active' : '');
        b.textContent = s.name || s.server || s.label || 'Srv ' + (idx + 1);
        b.onclick = function() {
          var tabs = tabsWrap.querySelectorAll('.server-tab');
          for (var k = 0; k < tabs.length; k++) tabs[k].classList.remove('active');
          b.classList.add('active');
          var url = s.url || s.embed || s.embed_url || s.iframe || s.file || '';
          if (url) {
            var newItem = {};
            for (var key in _item) newItem[key] = _item[key];
            newItem.embedUrl = url;
            Player.open(newItem);
          }
        };
        tabsWrap.appendChild(b);
      })(i);
    }
    document.getElementById('watch-servers').style.display = 'block';
  }

  function _loadEpisodes(activeSeason) {
    var container = document.getElementById('w-episodes');
    var wrap = document.getElementById('watch-eps-wrap');

    container.innerHTML = '<div style="padding:10px 0;color:var(--text3);font-size:12px;display:flex;gap:6px;align-items:center"><div class="mini-spinner"></div> Cargando episodios...</div>';
    wrap.style.display = 'block';

    Api.fetchEpisodes(_item.postId).then(function(data) {
      if (!data || !data.seasons || !data.seasons.size) {
        container.innerHTML = '<div style="padding:10px 0;color:var(--text3);font-size:12px">No se encontraron episodios.</div>';
        return;
      }

      _seasonsMap = data.seasons;
      var seasonNums = [];
      _seasonsMap.forEach(function(val, key) { seasonNums.push(key); });
      seasonNums.sort(function(a, b) { return a - b; });
      
      _currentSeason = seasonNums[0];
      if (activeSeason) {
        for (var i = 0; i < seasonNums.length; i++) {
          if (seasonNums[i] === activeSeason) { _currentSeason = activeSeason; break; }
        }
      }

      var sel = document.getElementById('w-season-select');
      if (seasonNums.length > 1) {
        sel.innerHTML = seasonNums.map(function(sn) {
          return '<option value="' + sn + '"' + (sn === _currentSeason ? ' selected' : '') + '>' + 'Temporada ' + sn + '</option>';
        }).join('');
        sel.style.display = 'block';
      }

      _renderEps(_currentSeason);
    }).catch(function() {
      container.innerHTML = '<div style="padding:10px 0;color:var(--text3);font-size:12px">Error al cargar episodios.</div>';
    });
  }

  function _renderEps(seasonNum) {
    var container = document.getElementById('w-episodes');
    var heading   = document.getElementById('w-eps-heading');
    var eps = _seasonsMap.get(Number(seasonNum)) || [];

    heading.textContent = (_seasonsMap.size > 1 ? 'Temporada ' + seasonNum : 'Episodios') + ' · ' + eps.length + ' eps.';

    container.innerHTML = '';
    var list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:3px';

    for (var i = 0; i < eps.length; i++) {
      (function(idx) {
        var ep = eps[idx];
        var num   = ep.number || ep.episode || idx + 1;
        var thumb = Api.imgUrl ? Api.imgUrl(ep.thumbnail || ep.thumb || ep.image || (ep.images ? ep.images.poster : '') || '') : '';
        var dur   = ep.runtime ? ep.runtime + 'min' : '';

        var row = document.createElement('div');
        row.className = 'ep-row';
        row.tabIndex = 0;
        row.innerHTML = 
          '<div class="ep-num">' + num + '</div>' +
          '<div class="ep-thumb">' +
            (thumb ? '<img src="' + thumb + '" alt="">' : '') + '<div class="ep-play-icon">▶</div>' +
          '</div>' +
          '<div class="ep-info">' +
            '<div class="ep-title">' + (ep.title || 'Episodio ' + num) + '</div>' +
            '<div class="ep-desc">' + (ep.overview || ep.description || '') + '</div>' +
          '</div>' +
          '<div class="ep-dur">' + dur + '</div>';

        row.onclick = function() {
          // Update URL without reload if possible, but for TV we just play
          Player.openEpisode(_item, eps, idx, _seasonsMap);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        list.appendChild(row);
      })(i);
    }
    container.appendChild(list);
  }

  function _loadRelated(type) {
    var postType = type === 'tvshows' ? 'tvshows' : type === 'anime' ? 'animes' : 'movies';
    Api.fetchListing(postType, 1, 8).then(function(raw) {
      var items = [];
      for (var i = 0; i < raw.length; i++) {
        var it = Api.normalizeItem(raw[i], postType);
        if (it.postId !== _item.postId) items.push(it);
      }
      items = items.slice(0, 6);
      if (!items.length) return;

      var wrap = document.getElementById('w-related');
      var row  = document.getElementById('w-related-row');
      document.getElementById('w-related-title').textContent =
        type === 'tvshows' ? 'Más series' : type === 'anime' ? 'Más anime' : 'Más películas';

      row.innerHTML = '';
      for (var j = 0; j < items.length; j++) {
        (function(it) {
          var card = document.createElement('div');
          card.className = 'card';
          var img = it.backdrop || it.poster || '';
          card.innerHTML = 
            '<div class="card-thumb" style="aspect-ratio:16/9">' +
              (img ? '<img src="' + img + '" alt="' + (it.title||'') + '" style="width:100%;height:100%;object-fit:cover">' : '<div class="card-placeholder" style="display:flex"><span>' + (it.title||'?')[0] + '</span></div>') +
            '</div>' +
            '<div class="card-info"><div class="card-name">' + (it.title||'') + '</div></div>';
          card.onclick = function() {
            window.location.href = 'detallecontenido.html?id=' + it.postId + '&type=' + it.type + '&title=' + encodeURIComponent(it.title||'');
          };
          row.appendChild(card);
        })(items[j]);
      }
      wrap.style.display = 'block';
    }).catch(function(){});
  }

  function changeSeason(val) {
    _currentSeason = Number(val);
    _renderEps(_currentSeason);
  }

  function _showError(msg) {
    var el = document.getElementById('w-loading');
    if (el) {
      el.innerHTML = '<div style="color:#e50914; font-weight:bold">' + msg + '</div>';
    }
  }

  return {
    init: init,
    changeSeason: changeSeason
  };
})();

document.addEventListener('DOMContentLoaded', WatchPage.init);
