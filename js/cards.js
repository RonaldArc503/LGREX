"use strict";
var Cards = (function() {
  /* Navigate directly to detallecontenido.html or watch.html */
  function _goDetail(item, autoplay) {
    if (!item || !item.postId) return;
    var target = autoplay ? 'watch.html' : 'detallecontenido.html';
    var url = target + '?id=' + encodeURIComponent(item.postId) + 
              '&type=' + encodeURIComponent(item.type || 'movie') + 
              '&title=' + encodeURIComponent(item.title || '');
    if (item.isLive) url += '&isLive=true'; 
    window.location.href = url;
  }

  function buildCard(item, portrait, isChannel) {
    var card = document.createElement("div");
    card.className = isChannel ? "card channel-card" : "card" + (portrait ? " portrait" : "");
    var imgSrc = isChannel ? item.img || "" : portrait ? item.poster || item.backdrop || "" : item.backdrop || item.poster || "";
    var safeTitle = (item.title || "?").replace(/"/g, "&quot;");
    var firstChar = (item.title || "?")[0] || "?";
    card.innerHTML = 
      '<div class="card-thumb">' +
        (imgSrc ? '<img src="' + imgSrc + '" alt="' + safeTitle + '" loading="lazy" ' +
            'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : "") +
        '<div class="card-placeholder" style="' + (imgSrc ? "display:none" : "display:flex") + '">' +
          '<span>' + firstChar + '</span>' +
        '</div>' +
        '<div class="card-overlay">' +
          '<div class="card-quick">' +
            '<div class="cq-btn play-btn" ' +
                 'onclick="event.stopPropagation();Cards._goDetail(Store.get(\'' + item.id + '\') || ' + JSON.stringify({postId:item.postId,type:item.type||'movie',title:item.title||''}) + ', true)">▶</div>' +
            (!isChannel ? '<div class="cq-btn" onclick="event.stopPropagation();UI.addList()">＋</div>' : "") +
          '</div>' +
          (item.match ? '<div class="card-match">' + item.match + '% match</div>' : "") +
          (item.isLive ? '<div class="live-pulse">EN VIVO</div>' : "") +
        '</div>' +
      '</div>' +
      '<div class="card-info">' +
        '<div class="card-name">' + (item.title || "") + '</div>' +
        '<div class="card-sub">' +
          (item.match ? '<span class="m">' + item.match + '%</span>' : "") +
          (item.year ? '<span>' + item.year + '</span>' : "") +
          (item.isLive ? '<span class="live-pulse">EN VIVO</span>' : "") +
          '<span>' + (item.dur || "") + '</span>' +
        '</div>' +
      '</div>';

    // Whole card click → go to detail page
    card.onclick = function() { _goDetail(item); };
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card._item = item;

    var imgEl = card.querySelector(".card-thumb img");
    if (imgEl && !portrait && !isChannel) {
      imgEl.addEventListener("load", function() {
        if (!imgEl.naturalWidth || !imgEl.naturalHeight) return;
        var isVertical = imgEl.naturalHeight > imgEl.naturalWidth;
        card.classList.toggle("landscape-vertical-src", isVertical);
      });
    }
    return card;
  }

  function buildRow(containerId, title, items, portrait, isChannel) {
    if (!items || !items.length) return;
    var container = document.getElementById(containerId);
    if (!container) return;
    var row = document.createElement("div");
    row.className = "row";
    row.innerHTML = '<div class="row-title">' + title + ' <span class="row-more">Ver todo ›</span></div>';
    var scroll = document.createElement("div");
    scroll.className = "row-scroll";
    items.forEach(function(item) { scroll.appendChild(buildCard(item, portrait, isChannel)); });
    row.appendChild(scroll);
    container.appendChild(row);
  }

  return { buildCard: buildCard, buildRow: buildRow, _goDetail: _goDetail };
})();
