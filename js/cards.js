"use strict";
const Cards = /* @__PURE__ */ (() => {
  function buildCard(item, portrait = false, isChannel = false) {
    const card = document.createElement("div");
    card.className = isChannel ? "card channel-card" : "card" + (portrait ? " portrait" : "");
    const imgSrc = isChannel ? item.img || "" : portrait ? item.poster || item.backdrop || "" : item.backdrop || item.poster || "";
    const safeTitle = (item.title || "?").replace(/"/g, "&quot;");
    const firstChar = (item.title || "?")[0] || "?";
    card.innerHTML = `
      <div class="card-thumb">
        ${imgSrc ? `<img src="${imgSrc}" alt="${safeTitle}" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ""}
        <div class="card-placeholder" style="${imgSrc ? "display:none" : "display:flex"}">
          <span>${firstChar}</span>
        </div>
        <div class="card-overlay">
          <div class="card-quick">
            <div class="cq-btn play-btn"
                 onclick="event.stopPropagation();Player.open(Store.get('${item.id}'))">\u25B6</div>
            ${!isChannel ? `<div class="cq-btn" onclick="event.stopPropagation();UI.addList()">\uFF0B</div>` : ""}
            <div class="cq-btn"
                 onclick="event.stopPropagation();Detail.open(Store.get('${item.id}'))">\u2304</div>
          </div>
          ${item.match ? `<div class="card-match">${item.match}% match</div>` : ""}
          ${item.isLive ? `<div class="live-pulse">EN VIVO</div>` : ""}
        </div>
      </div>
      <div class="card-info">
        <div class="card-name">${item.title || ""}</div>
        <div class="card-sub">
          ${item.match ? `<span class="m">${item.match}%</span>` : ""}
          ${item.year ? `<span>${item.year}</span>` : ""}
          ${item.isLive ? `<span class="live-pulse">EN VIVO</span>` : ""}
          <span>${item.dur || ""}</span>
        </div>
      </div>`;
    card.onclick = () => Detail.open(item);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card._item = item;
    const imgEl = card.querySelector(".card-thumb img");
    if (imgEl && !portrait && !isChannel) {
      imgEl.addEventListener("load", () => {
        if (!imgEl.naturalWidth || !imgEl.naturalHeight) return;
        const isVertical = imgEl.naturalHeight > imgEl.naturalWidth;
        card.classList.toggle("landscape-vertical-src", isVertical);
      });
    }
    return card;
  }
  function buildRow(containerId, title, items, portrait = false, isChannel = false) {
    if (!items.length) return;
    const container = document.getElementById(containerId);
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div class="row-title">${title} <span class="row-more">Ver todo \u203A</span></div>`;
    const scroll = document.createElement("div");
    scroll.className = "row-scroll";
    items.forEach((item) => scroll.appendChild(buildCard(item, portrait, isChannel)));
    row.appendChild(scroll);
    container.appendChild(row);
  }
  return { buildCard, buildRow };
})();
