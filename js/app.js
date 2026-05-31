"use strict";
// ══════════════════════════════════════════════════
//  APP — navigation + keyboard + init
// ══════════════════════════════════════════════════
const App = (() => {
  let currentSection = 'home';

  function switchSection(section, el) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');
    else {
      document.querySelectorAll('.nav-link').forEach(l => {
        if (l.dataset.section === section) l.classList.add('active');
      });
    }

    currentSection = section;
    document.getElementById('hero').style.display =
      section === 'home' ? 'flex' : 'none';
    document.querySelectorAll('.rows-wrap').forEach(r => r.style.display = 'none');
    document.getElementById('rows-' + section).style.display = 'block';
    document.getElementById('main').scrollTop = 0;

    if (section === 'home')         Sections.loadHome();
    else if (section === 'channels') Sections.loadChannels();
    else                             Sections.loadSection(section);
  }

  function goHome() {
    switchSection('home');
  }

  function onScroll(el) {
    document.getElementById('nav').classList.toggle('solid', el.scrollTop > 40);
  }

  // ── Keyboard shortcuts ──────────────────────────
  document.addEventListener('keydown', e => {
    const playerOpen = document.getElementById('player').classList.contains('open');
    const detailOpen = document.getElementById('detail').classList.contains('open');
    const searchOpen = document.getElementById('search-view').classList.contains('open');

    if (playerOpen) {
      switch (e.key) {
        case ' ':         e.preventDefault(); Player.togglePlay(); break;
        case 'ArrowRight': Player.skip(10);   break;
        case 'ArrowLeft':  Player.skip(-10);  break;
        case 'ArrowUp':
          { const v = document.getElementById('video-el');
            if (v) v.volume = Math.min(1, v.volume + .1); break; }
        case 'ArrowDown':
          { const v = document.getElementById('video-el');
            if (v) v.volume = Math.max(0, v.volume - .1); break; }
        case 'Escape':     Player.close();    break;
        case 'f':
        case 'F':          Player.toggleFS(); break;
      }
    } else if (detailOpen) {
      if (e.key === 'Escape') Detail.close();
    } else if (searchOpen) {
      if (e.key === 'Escape') Search.close();
    }
  });

  // ── Init ────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    switchSection('home');
    document.getElementById('hero').style.display = 'flex';
  });

  return { switchSection, goHome, onScroll };
})();
