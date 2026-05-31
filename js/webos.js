"use strict";
// ══════════════════════════════════════════════════
//  WEBOS — LG TV adaptations
// ══════════════════════════════════════════════════
(function initWebOS() {
  const isWebOS =
    navigator.userAgent.includes('Web0S')    ||
    navigator.userAgent.includes('WebOS')    ||
    navigator.userAgent.includes('SmartTV')  ||
    typeof window.webOS !== 'undefined';

  if (!isWebOS) return;

  console.log('[WebOS] LG TV adaptations active');

  // Fixed 1920×1080 viewport — shrink cards slightly
  document.documentElement.style.setProperty('--card-w', '200px');

  // Remote BACK button
  document.addEventListener('keydown', e => {
    const isBack = e.keyCode === 461 ||
                   e.key === 'GoBack' ||
                   e.key === 'XF86Back';
    if (!isBack) return;

    if (document.getElementById('player').classList.contains('open')) {
      Player.close(); e.preventDefault();
    } else if (document.getElementById('detail').classList.contains('open')) {
      Detail.close(); e.preventDefault();
    } else if (document.getElementById('search-view').classList.contains('open')) {
      Search.close(); e.preventDefault();
    }
  });

  // OK/Enter on focused card
  document.addEventListener('keydown', e => {
    if (e.keyCode === 13 && e.target.classList.contains('card')) {
      e.target.click();
    }
  });

  // D-pad: auto-assign tabindex to cards as they're inserted
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.card:not([tabindex])').forEach(c => {
      c.tabIndex = 0;
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Magic remote pointer scroll simulation (optional smooth scrolling)
  document.querySelectorAll('.row-scroll').forEach(el => {
    el.style.scrollSnapType = 'x mandatory';
  });
})();
