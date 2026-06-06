"use strict";

/* ══════════════════════════════════════
   FOOTBALL — agenda de partidos en vivo
   Fuente: futbol-libre.su/agenda/
   ══════════════════════════════════════ */
var Football = (function() {
  var TARGET = 'https://futbol-libre.su/agenda/';

  function _fetchAgenda() {
    var proxies = [
      function(url) { return "https://corsproxy.io/?" + encodeURIComponent(url); },
      function(url) { return "https://api.allorigins.win/get?url=" + encodeURIComponent(url); },
      function(url) { return "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(url); }
    ];
    var p = Promise.resolve(null);
    proxies.forEach(function(mkProxy) {
      p = p.then(function(res) {
        if (res) return res;
        return fetch(mkProxy(TARGET)).then(function(r) {
          if (!r.ok) return null;
          return r.text().then(function(text) {
            if (text.trim().indexOf('{') === 0) {
              try {
                var j = JSON.parse(text);
                if (j.contents) return j.contents;
              } catch(_) {}
            }
            if (text.indexOf('<li') >= 0 || text.indexOf('<ul') >= 0) return text;
            return null;
          });
        }).catch(function() { return null; });
      });
    });
    return p;
  }

  function _parseMatches(html) {
    var matches = [];
    var liBlockRe = /<li class="(?!subitem)([^"]+)">([\s\S]*?)<\/li>\s*(?=<li|<\/ul>|<center|$)/gi;
    var liMatch;
    while ((liMatch = liBlockRe.exec(html)) !== null) {
      var liClass = liMatch[1].trim();
      var liBody  = liMatch[2];
      var mainAnchorRe = /<a[^>]*>([\s\S]*?)<\/a>/i;
      var mainAnchorM  = mainAnchorRe.exec(liBody);
      if (!mainAnchorM) continue;
      var anchorHtml = mainAnchorM[1];
      var timeM = anchorHtml.match(/<span[^>]*class="t"[^>]*>([^<]+)<\/span>/i);
      var time  = timeM ? timeM[1].trim() : '';
      var matchText = anchorHtml.replace(/<[^>]+>/g, '').trim();
      if (!matchText || matchText.length < 4) continue;
      var channels = [];
      var chRe = /<li[^>]*class="subitem[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      var chM;
      while ((chM = chRe.exec(liBody)) !== null) {
        var href    = chM[1].trim();
        var chHtml  = chM[2];
        var qualM   = chHtml.match(/<span[^>]*>([^<]+)<\/span>/i);
        var quality = qualM ? qualM[1].trim() : '';
        var chName  = chHtml.replace(/<[^>]+>/g, '').trim();
        if (href && chName) {
          channels.push({ name: chName, quality: quality, url: href });
        }
      }
      matches.push({ time: time, text: matchText, comp: _classToLeague(liClass), channels: channels, liClass: liClass });
    }
    return matches;
  }

  function _parseMatchesFallback(html) {
    var matches = [];
    var re = /([A-ZÁÉÍÓÚÑ][^\n<]{3,40})\s+(?:vs\.?|–|-)\s+([A-ZÁÉÍÓÚÑ][^\n<]{3,40})/gi;
    var m;
    while ((m = re.exec(html)) !== null && matches.length < 30) {
      matches.push({
        time: '', text: m[0].trim(), comp: '⚽ Partido',
        channels: [{ name: 'Ver en futbol-libre', quality: '', url: TARGET }],
        liClass: ''
      });
    }
    return matches;
  }

  var LEAGUE_MAP = {
    FIFA:'Mundial / Amistoso', LC:'Champions', VEN:'Venezuela', COL:'Colombia',
    MEX:'México', ES:'España', PE:'Perú', CAT:'Cataluña', ENG:'Premier League',
    FRA:'Francia', USA:'MLS', JA:'Japón', IT:'Italia', BRA:'Brasil', ALE:'Bundesliga',
    POR:'Portugal', CH:'Chile', ECUA:'Ecuador', URU:'Uruguay', EURO:'Europa',
    AR:'Argentina', AMERICA:'Sudamérica', INDY:'Indycar', NBA:'NBA',
    CHA:'Champions', UFC:'UFC', MOTOGP:'MotoGP', F1:'Fórmula 1', MMA:'MMA',
    WWE:'WWE', FUT:'Fútbol', SUD:'Sudamérica', CICLI:'Ciclismo',
    LIB:'Libertadores', BAS:'Básquetbol', TE:'Tenis', BOX:'Boxeo', NFL:'NFL',
    MLB:'MLB', CON:'Conmebol', VOLEY:'Vóley', RUG:'Rugby', NAT:'Natación',
    CONGOLD:'Copa de Oro', CONCACAFCHA:'Concacaf', OLY:'Olimpiadas',
    EUROCOPA:'Eurocopa', HOL:'Holanda', PAR:'Paraguay', BOL:'Bolivia',
    PARA:'Paraguay', SUPERCUP:'Supercopa'
  };

  function _classToLeague(cls) {
    var parts = cls.toUpperCase().split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (LEAGUE_MAP[p]) return LEAGUE_MAP[p];
    }
    return cls || '⚽';
  }

  function _buildMatchCard(match) {
    var div = document.createElement('div');
    div.className = 'football-card';
    var channelsHtml = '';
    if (match.channels.length) {
      channelsHtml = '<div class="fc-channels">';
      for (var i = 0; i < Math.min(match.channels.length, 5); i++) {
        var ch = match.channels[i];
        channelsHtml += 
          '<button class="fc-ch-btn" ' +
            'data-url="' + encodeURIComponent(ch.url) + '" ' +
            'data-name="' + encodeURIComponent(ch.name) + '" ' +
            'data-match="' + encodeURIComponent(match.text) + '">' +
            '<span class="fc-ch-icon">▶</span>' +
            '<span class="fc-ch-name">' + _esc(ch.name) + '</span>' +
            (ch.quality ? '<span class="fc-ch-qual">' + _esc(ch.quality) + '</span>' : '') +
          '</button>';
      }
      channelsHtml += '</div>';
    } else {
      channelsHtml = '<a class="fc-ext-link" href="' + TARGET + '" target="_blank" rel="noopener">Ver en futbol-libre ›</a>';
    }
    div.innerHTML = 
      '<div class="fc-top">' +
        '<span class="fc-comp">' + _esc(match.comp) + '</span>' +
        (match.time ? '<span class="fc-time">🕐 ' + _esc(match.time) + '</span>' : '') +
      '</div>' +
      '<div class="fc-match-text">' + _esc(match.text) + '</div>' +
      channelsHtml;

    var btns = div.querySelectorAll('.fc-ch-btn');
    for (var j = 0; j < btns.length; j++) {
      (function(btn) {
        btn.onclick = function() {
          _playChannel(
            decodeURIComponent(btn.getAttribute("data-url")),
            decodeURIComponent(btn.getAttribute("data-name")),
            decodeURIComponent(btn.getAttribute("data-match"))
          );
        };
      })(btns[j]);
    }
    return div;
  }

  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _playChannel(url, channelName, matchTitle) {
    var item = {
      title: matchTitle || channelName,
      embedUrl: url,
      isLive: true,
      sources: [url],
      postId: null
    };
    if (window.Player && typeof Player.open === 'function') {
      Player.open(item);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  function _buildStyle() {
    if (document.getElementById('football-style')) return;
    var s = document.createElement('style');
    s.id = 'football-style';
    s.textContent = 
      '#rows-football { padding-bottom: 40px; }' +
      '#rows-football .section-heading {' +
        'padding: 32px 60px 12px;' +
        'font-size: 22px;' +
        'font-weight: 700;' +
      '}' +
      '.football-date-label {' +
        'display: block;' +
        'padding: 0 60px 18px;' +
        'font-size: 13px;' +
        'color: var(--text3);' +
      '}' +
      '.football-grid {' +
        'display: grid;' +
        'grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));' +
        'gap: 12px;' +
        'padding: 0 60px 40px;' +
      '}' +
      '.football-card {' +
        'background: var(--bg3);' +
        'border: 1px solid rgba(255,255,255,.07);' +
        'border-radius: 12px;' +
        'padding: 14px 16px;' +
        'transition: border-color .2s, transform .15s;' +
      '}' +
      '.football-card:hover {' +
        'border-color: rgba(229,9,20,.4);' +
        'transform: translateY(-2px);' +
      '}' +
      '.fc-top {' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: space-between;' +
        'margin-bottom: 8px;' +
        'gap: 8px;' +
      '}' +
      '.fc-comp {' +
        'font-size: 10px;' +
        'font-weight: 700;' +
        'color: var(--accent);' +
        'text-transform: uppercase;' +
        'letter-spacing: 1.2px;' +
        'white-space: nowrap;' +
        'overflow: hidden;' +
        'text-overflow: ellipsis;' +
      '}' +
      '.fc-time {' +
        'font-size: 11px;' +
        'color: var(--text3);' +
        'white-space: nowrap;' +
        'flex-shrink: 0;' +
        'background: rgba(255,255,255,.06);' +
        'padding: 2px 8px;' +
        'border-radius: 20px;' +
      '}' +
      '.fc-match-text {' +
        'font-size: 14px;' +
        'font-weight: 600;' +
        'color: var(--text);' +
        'line-height: 1.4;' +
        'margin-bottom: 12px;' +
      '}' +
      '.fc-channels { display: flex; flex-direction: column; gap: 5px; }' +
      '.fc-ch-btn {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 8px;' +
        'background: rgba(229,9,20,.1);' +
        'border: 1px solid rgba(229,9,20,.2);' +
        'border-radius: 7px;' +
        'padding: 7px 10px;' +
        'cursor: pointer;' +
        'transition: background .15s, border-color .15s;' +
        'width: 100%;' +
        'text-align: left;' +
        'color: var(--text);' +
      '}' +
      '.fc-ch-btn:hover {' +
        'background: rgba(229,9,20,.25);' +
        'border-color: rgba(229,9,20,.5);' +
      '}' +
      '.fc-ch-icon { font-size: 10px; color: var(--accent); flex-shrink: 0; }' +
      '.fc-ch-name {' +
        'flex: 1;' +
        'font-size: 12px;' +
        'font-weight: 600;' +
        'white-space: nowrap;' +
        'overflow: hidden;' +
        'text-overflow: ellipsis;' +
      '}' +
      '.fc-ch-qual {' +
        'font-size: 10px;' +
        'color: var(--text3);' +
        'border: 1px solid rgba(255,255,255,.2);' +
        'border-radius: 3px;' +
        'padding: 1px 5px;' +
        'flex-shrink: 0;' +
      '}' +
      '.fc-ext-link {' +
        'font-size: 12px;' +
        'color: var(--accent);' +
        'text-decoration: none;' +
        'font-weight: 600;' +
      '}' +
      '.fc-ext-link:hover { text-decoration: underline; }' +
      '.football-empty {' +
        'padding: 60px;' +
        'color: var(--text3);' +
        'font-size: 14px;' +
        'text-align: center;' +
        'line-height: 1.8;' +
      '}' +
      '.football-link-btn {' +
        'display: inline-block;' +
        'margin-top: 16px;' +
        'padding: 10px 24px;' +
        'background: var(--accent);' +
        'color: #fff;' +
        'border-radius: 6px;' +
        'text-decoration: none;' +
        'font-size: 13px;' +
        'font-weight: 600;' +
      '}' +
      '.football-iframe-wrap {' +
        'padding: 0 60px 40px;' +
      '}' +
      '.football-iframe-wrap iframe {' +
        'width: 100%;' +
        'height: 80vh;' +
        'border: none;' +
        'border-radius: 10px;' +
        'background: #fff;' +
      '}';
    document.head.appendChild(s);
  }

  function load() {
    return __async(this, null, function* () {
      if (typeof Store !== 'undefined' && Store.isLoaded && Store.isLoaded('football')) return;
      if (typeof Store !== 'undefined' && Store.markLoaded) Store.markLoaded('football');
      _buildStyle();
      var c = document.getElementById('rows-football');
      if (!c) return;
      var h = document.createElement('h2');
      h.className = 'section-heading';
      h.innerHTML = '⚽ Agenda de Fútbol';
      c.appendChild(h);
      var spinner = document.createElement('div');
      spinner.className = 'row-spinner';
      spinner.innerHTML = '<div class="mini-spinner"></div> Cargando agenda de partidos...';
      c.appendChild(spinner);
      var html = yield _fetchAgenda();
      spinner.remove();
      if (!html) {
        _showIframeFallback(c);
        return;
      }
      var matches = _parseMatches(html);
      if (!matches.length) {
        matches = _parseMatchesFallback(html);
      }
      var dateM = html.match(/<b>(Agenda[^<]*\d{4}[^<]*)<\/b>/i) || html.match(/Agenda[^<\n]{5,60}(?:\d{4})/i);
      if (dateM) {
        var label = document.createElement('span');
        label.className = 'football-date-label';
        label.textContent = dateM[1] || dateM[0];
        c.appendChild(label);
      }
      if (!matches.length) {
        _showIframeFallback(c);
        return;
      }
      var grid = document.createElement('div');
      grid.className = 'football-grid';
      matches.forEach(function(m) { grid.appendChild(_buildMatchCard(m)); });
      c.appendChild(grid);
    });
  }

  function _showIframeFallback(c) {
    c.insertAdjacentHTML('beforeend', 
      '<div class="football-iframe-wrap">' +
        '<p style="padding:0 0 10px;font-size:13px;color:var(--text3)">Cargando agenda desde futbol-libre.su...</p>' +
        '<iframe src="https://futbol-libre.su/agenda/" title="Agenda Fútbol Libre" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>' +
        '<p style="padding:10px 0 0;font-size:12px;color:var(--text3);text-align:center">Si no carga, <a href="https://futbol-libre.su/agenda/" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">abre en nueva pestaña ›</a></p>' +
      '</div>'
    );
  }

  return { load: load };
})();
window.Football = Football;