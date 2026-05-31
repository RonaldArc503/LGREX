"use strict";
(function () {
  try { console.log('[share-modal] script url=', document.currentScript && document.currentScript.src); } catch(e){}
  function init() {
    try { console.log('[share-modal] init'); } catch(e){}
    const openButtons = [
      '#share-btn',
      '.share-btn',
      '[data-action="share"]',
      '[title="Compartir"]',
    ];

    const panel = document.getElementById('share-modal') || document.getElementById('share-panel');
    const closeBtn = panel && panel.querySelector ? panel.querySelector('[data-close], .close, .btn-close') : null;

    function safeAddListener(selector, eventName, handler) {
      try {
        const el = document.querySelector(selector);
        if (el) el.addEventListener(eventName, handler);
      } catch (e) {
        // ignore
      }
    }

    function open() {
      if (!panel) return;
      panel.classList.add('open');
      panel.style.display = 'block';
    }

    function close() {
      if (!panel) return;
      panel.classList.remove('open');
      panel.style.display = 'none';
    }

    openButtons.forEach((selector) => {
      safeAddListener(selector, 'click', open);
    });

    if (closeBtn) {
      try {
        closeBtn.addEventListener('click', close);
      } catch (e) {}
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    window.ShareModal = { open, close };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  // Global error hook to help diagnose where the addEventListener error originates
  try {
    window.addEventListener('error', function (ev) {
      try {
        console.warn('[share-modal] window error caught', ev && ev.message, ev && ev.filename, ev && ev.lineno, ev && ev.colno);
      } catch (e) {}
    });
  } catch (e) {}
})();
