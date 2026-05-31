"use strict";
// ══════════════════════════════════════════════════
//  HERO
// ══════════════════════════════════════════════════
const Hero = (() => {
  let items  = [];
  let idx    = 0;
  let timer  = null;

  function setItems(arr) {
    items = arr;
    idx   = 0;
  }

  function render(item) {
    if (!item) return;
    document.getElementById('hero-title').textContent  = item.title;
    document.getElementById('hero-year').textContent   = item.year  || '';
    document.getElementById('hero-genre').textContent  = item.genre || '';
    document.getElementById('hero-dur').textContent    = item.dur   || '';
    document.getElementById('hero-rating').textContent = item.rating ? '★ ' + item.rating : '';
    document.getElementById('hero-desc').textContent   = item.desc  || '';
    document.getElementById('hero-source').textContent = '★ ALLCALIDAD';

    const bd  = document.getElementById('hero-backdrop');
    const src = item.backdrop || item.poster || '';
    if (src) {
      bd.style.opacity = '0';
      bd.onload = () => { bd.style.opacity = '1'; };
      bd.src = src;
    }
  }

  function buildDots(n) {
    const c = document.getElementById('hero-dots');
    c.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'hero-dot' + (i === 0 ? ' active' : '');
      d.onclick   = () => go(i);
      c.appendChild(d);
    }
  }

  function go(i) {
    idx = i;
    render(items[i]);
    document.querySelectorAll('.hero-dot')
            .forEach((d, j) => d.classList.toggle('active', j === i));
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => {
      idx = (idx + 1) % items.length;
      go(idx);
    }, 7000);
  }

  function play()       { if (items[idx]) Player.open(items[idx]); }
  function openDetail() { if (items[idx]) Detail.open(items[idx]); }

  return { setItems, render, buildDots, go, startAuto, play, openDetail };
})();
