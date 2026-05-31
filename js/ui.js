"use strict";
const UI = /* @__PURE__ */ (() => {
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3500);
  }
  function addList() {
    toast("\u2713 Agregado a Mi Lista");
  }
  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href);
    toast("\u{1F517} Enlace copiado");
  }
  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }
  return { toast, addList, copyLink, fmt };
})();
