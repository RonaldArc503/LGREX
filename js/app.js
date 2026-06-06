"use strict";
var App = (function() {
  var currentSection = "home";
  function switchSection(section, el, options) {
    if (!options) options = {};
    var links = document.querySelectorAll(".nav-link");
    for (var i = 0; i < links.length; i++) {
      links[i].classList.remove("active");
    }
    if (el) el.classList.add("active");
    else {
      for (var j = 0; j < links.length; j++) {
        if (links[j].getAttribute("data-section") === section) links[j].classList.add("active");
      }
    }
    currentSection = section;
    var hero = document.getElementById("hero");
    if (hero) hero.style.display = section === "home" ? "flex" : "none";
    var wraps = document.querySelectorAll(".rows-wrap");
    for (var k = 0; k < wraps.length; k++) {
      wraps[k].style.display = "none";
    }
    var row = document.getElementById("rows-" + section);
    if (row) row.style.display = "block";
    var main = document.getElementById("main");
    if (main) main.scrollTop = 0;
    if (section === "home") {
      if (window.Sections) Sections.loadHome();
    } else if (section === "channels") {
      if (window.Sections) Sections.loadChannels();
    } else if (section === "football") {
      if (window.Sections) Sections.loadFootball();
    } else {
      if (window.Sections) Sections.loadSection(section);
    }
    if (window.Navigation) Navigation.recordSection(section, options);
  }
  function goHome() {
    switchSection("home");
  }
  function onScroll(el) {
    var nav = document.getElementById("nav");
    if (nav) nav.classList.toggle("solid", el.scrollTop > 40);
  }
  document.addEventListener("keydown", function(e) {
    if (window.TVFocus && TVFocus.handleKeydown(e)) return;
    var p = document.getElementById("player");
    var playerOpen = p && p.classList.contains("open");
    var d = document.getElementById("detail");
    var detailOpen = d && d.classList.contains("open");
    var s = document.getElementById("search-view");
    var searchOpen = s && s.classList.contains("open");
    if (window.Navigation && Navigation.isBackKey(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      Navigation.handleBack();
      return;
    }
    if (playerOpen) {
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (window.Player) Player.togglePlay();
          break;
        case "ArrowRight":
          if (window.Player) Player.skip(10);
          break;
        case "ArrowLeft":
          if (window.Player) Player.skip(-10);
          break;
        case "ArrowUp": {
          var v = document.getElementById("video-el");
          if (v) v.volume = Math.min(1, v.volume + 0.1);
          break;
        }
        case "ArrowDown": {
          var v = document.getElementById("video-el");
          if (v) v.volume = Math.max(0, v.volume - 0.1);
          break;
        }
        case "Escape":
          e.preventDefault();
          if (window.Navigation) Navigation.handleBack();
          break;
        case "f":
        case "F":
          if (window.Player) Player.toggleFS();
          break;
      }
    } else if (detailOpen) {
      if (e.key === "Escape") { if (window.Detail) Detail.close(); }
    } else if (searchOpen) {
      if (e.key === "Escape") { if (window.Search) Search.close(); }
    }
  });
  window.addEventListener("DOMContentLoaded", function() {
    switchSection("home", null, { replace: true });
    var h = document.getElementById("hero");
    if (h) h.style.display = "flex";
    if (window.Navigation) Navigation.init();
  });
  function getCurrentSection() {
    return currentSection;
  }
  return { switchSection: switchSection, goHome: goHome, onScroll: onScroll, currentSection: getCurrentSection };
})();
