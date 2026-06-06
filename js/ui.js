"use strict";
var UI = (function() {
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function() { t.classList.remove("show"); }, 3500);
  }
  function addList() {
    toast("✓ Agregado a Mi Lista");
  }
  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href);
    toast("🔗 Enlace copiado");
  }
  function fmt(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }
  return { toast: toast, addList: addList, copyLink: copyLink, fmt: fmt };
})();
