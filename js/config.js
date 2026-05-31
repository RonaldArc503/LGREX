"use strict";
const ALLCALIDAD = "https://allcalidad.re";
const API = "https://allcalidad.re/api/rest";
const IMG_BASE = "https://allcalidad.re";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_BACK = "https://image.tmdb.org/t/p/w1280";
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = "07a2f9f121ce6f9371fd05194a0fb7e3";
const TMDB_READ_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwN2EyZjlmMTIxY2U2ZjkzNzFmZDA1MTk0YTBmYjdlMyIsIm5iZiI6MTczMzM3MTk0OS41Mzc5OTk5LCJzdWIiOiI2NzUxMjgyZDkwM2YzMGU3M2I0MzNjN2YiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.XJ5KKACIjWUnEH6k-r5FMupxxADBY0NuQp72r1MCqzA";
const AUTOPLAY_DELAY = 10;
const ALLOW_IFRAME_FALLBACK = true;
const GENRE_MAP = {};
const YEAR_MAP = {};
Object.assign(GENRE_MAP, {
  135: "Acci\xF3n",
  136: "Comedia",
  137: "Drama",
  138: "Sci-Fi",
  139: "Terror",
  140: "Romance",
  141: "Animaci\xF3n",
  142: "Documental",
  143: "Aventura",
  144: "Crimen",
  145: "Misterio",
  146: "Fantas\xEDa",
  147: "Suspense",
  148: "B\xE9lica",
  149: "Familia",
  150: "Musical",
  151: "Historia",
  152: "Western",
  153: "Biogr\xE1fica",
  154: "Deportes",
  155: "Thriller",
  156: "Drama",
  157: "Misterio",
  158: "Biopic",
  295: "Crimen"
});
const CHANNELS = [
  {
    id: "ch1",
    title: "Canal 4",
    type: "channel",
    genre: "Nacional",
    dur: "En Vivo",
    isLive: true,
    img: "https://assets-jpcust.jwpsrv.com/thumbnails/WTdHpl8I-720.jpg",
    sources: ["https://cdn.jwplayer.com/live/broadcast/D3kaa3Ky.m3u8"],
    desc: "Canal 4 de El Salvador \u2014 se\xF1al nacional en vivo."
  },
  {
    id: "ch2",
    title: "Canal 2",
    type: "channel",
    genre: "Nacional",
    dur: "En Vivo",
    isLive: true,
    img: "https://assets-jpcust.jwpsrv.com/thumbnails/dx6qHNrT-720.jpg",
    sources: ["https://cdn.jwplayer.com/live/broadcast/48WUA30M.m3u8"],
    desc: "Canal 2 de El Salvador \u2014 se\xF1al oficial en vivo."
  },
  {
    id: "ch3",
    title: "Canal 10",
    type: "channel",
    genre: "Nacional",
    dur: "En Vivo",
    isLive: true,
    img: "https://yt3.googleusercontent.com/463ZErwFd6NkeWDpIew5J5DCHsFe3_jnN4Z7a923LfPOFSSYXaU8qC4yz3-XkLLJMYBx7j-rKA=s900-c-k-c0x00ffffff-no-rj",
    sources: ["https://streamingcws30.com/tves/videotves/chunks.m3u8"],
    desc: "Canal 10 TVES de El Salvador en vivo."
  },
  {
    id: "ch4",
    title: "Canal 12",
    type: "channel",
    genre: "Nacional",
    dur: "En Vivo",
    isLive: true,
    img: "https://i.ytimg.com/vi/u-IHi7fXqyU/maxresdefault.jpg",
    sources: ["https://signal.teleon.live/stream/sv8_canal12.m3u8?token=free"],
    desc: "Canal 12 de El Salvador en vivo."
  },
  {
    id: "ch5",
    title: "Telemundo",
    type: "channel",
    genre: "Entretenimiento",
    dur: "En Vivo",
    isLive: true,
    img: "https://www.brandemia.org/wp-content/uploads/2012/06/logo_principal_telemundo.jpg",
    sources: ["https://nbculocallive.akamaized.net/hls/live/2037499/puertorico/stream1/master.m3u8"],
    desc: "Telemundo en vivo."
  },
  {
    id: "ch6",
    title: "Canal 10 CR",
    type: "channel",
    genre: "Costa Rica",
    dur: "En Vivo",
    isLive: true,
    img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEifrYu2VhqPlQPQxzW-R2AY6Ab86FqjoUQLhc0ohWqKDTivR8b50cI-GEV3ronDrPlJD6i2AYf4ElymF2_PE0B-acRpuz9lFF8f7VFWKeIZWfvBrrrncC3ORGSz2bRHwy-Q_5HR2_SDEUyNAyKuJgYw-X57gOeF6K5SMXemEoCYvm2Sh9gwL6tuw7JQh_k/s400/14.png",
    sources: ["https://acceso.mediosdecostarica.com:3606/hybrid/play.m3u8"],
    desc: "Canal 10 de Costa Rica en vivo."
  }
];
