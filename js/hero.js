"use strict";
var Hero = (function() {
  var items = [];
  var idx = 0;
  var timer = null;

  function setItems(arr) {
    items = arr;
    idx = 0;
  }
  function render(item) {
    if (!item) return;
    document.getElementById("hero-title").textContent = item.title;
    document.getElementById("hero-year").textContent = item.year || "";
    document.getElementById("hero-genre").textContent = item.genre || "";
    document.getElementById("hero-dur").textContent = item.dur || "";
    document.getElementById("hero-rating").textContent = item.rating ? "★ " + item.rating : "";
    document.getElementById("hero-desc").textContent = item.desc || "";
    document.getElementById("hero-source").textContent = "★ ALLCALIDAD";
    var bd = document.getElementById("hero-backdrop");
    var src = item.backdrop || item.poster || "";
    if (src) {
      bd.style.opacity = "0";
      bd.onload = function() { bd.style.opacity = "1"; };
      bd.src = src;
    }
  }
  function buildDots(n) {
    var c = document.getElementById("hero-dots");
    if (!c) return;
    c.innerHTML = "";
    for (var i = 0; i < n; i++) {
      (function(index) {
        var d = document.createElement("div");
        d.className = "hero-dot" + (index === 0 ? " active" : "");
        d.onclick = function() { go(index); };
        c.appendChild(d);
      })(i);
    }
  }
  function go(i) {
    idx = i;
    render(items[i]);
    var dots = document.querySelectorAll(".hero-dot");
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.toggle("active", j === i);
    }
  }
  function startAuto() {
    clearInterval(timer);
    timer = setInterval(function() {
      idx = (idx + 1) % items.length;
      go(idx);
    }, 7e3);
  }
  /* ▶ Reproducir → go to watch.html directly */
  function play() {
    if (items[idx]) _goDetail(items[idx], true);
  }
  /* ℹ Más info → go to detallecontenido.html */
  function openDetail() {
    if (items[idx]) _goDetail(items[idx], false);
  }
  function _goDetail(item, autoplay) {
    if (window.Cards && Cards._goDetail) {
      Cards._goDetail(item, autoplay);
    } else {
      var target = autoplay ? 'watch.html' : 'detallecontenido.html';
      var url = target + '?id=' + encodeURIComponent(item.postId) + 
                '&type=' + encodeURIComponent(item.type || 'movie') + 
                '&title=' + encodeURIComponent(item.title || '');
      window.location.href = url;
    }
  }
  return { setItems: setItems, render: render, buildDots: buildDots, go: go, startAuto: startAuto, play: play, openDetail: openDetail };
})();
