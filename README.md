# REX TV — LG WebOS App

Aplicación estilo Netflix para LG TV (WebOS) que consume el catálogo de AllCalidad.

## Estructura del Proyecto

```
rextv/
├── index.html          ← Punto de entrada
├── appinfo.json        ← Manifiesto WebOS IPK
├── assets/
│   ├── icon.png        ← 80×80 px  (requerido)
│   ├── icon_large.png  ← 130×130 px (recomendado)
│   └── splash.png      ← 1920×1080 px (recomendado)
├── css/
│   ├── base.css        ← Variables, reset, layout
│   ├── nav.css         ← Barra de navegación
│   ├── hero.css        ← Banner principal
│   ├── cards.css       ← Tarjetas de contenido
│   ├── detail.css      ← Panel de detalle / episodios
│   ├── player.css      ← Reproductor + autoplay overlay
│   └── search.css      ← Vista de búsqueda
└── js/
    ├── config.js       ← URLs API, canales, géneros
    ├── api.js          ← Fetch helpers, normalización
    ├── store.js        ← Estado global / caché
    ├── ui.js           ← Toast, utils
    ├── hero.js         ← Banner rotativo
    ├── cards.js        ← Constructores de tarjetas y filas
    ├── detail.js       ← Panel info + selector temporadas
    ├── player.js       ← Reproductor HLS + autoplay episodios
    ├── search.js       ← Búsqueda con debounce
    ├── sections.js     ← Loaders de cada sección
    ├── app.js          ← Navegación + teclado + init
    └── webos.js        ← Adaptaciones control remoto LG
```

## Características

- 🎬 Películas, Series, Anime y Canales en Vivo
- 📺 Series estilo Netflix: selector de temporada + lista de episodios
- ⏭ Autoplay automático al siguiente episodio (configurable)
- ⏮⏭ Botones Prev/Next episodio en el reproductor
- 🎯 Reproducción HLS directa con fallback a iframe
- 🔍 Búsqueda con debounce
- 📡 Canales salvadoreños/regionales en vivo
- 🎮 Soporte completo control remoto LG (D-pad, Back, OK)

## Empaquetar como IPK

### Requisitos
- Node.js + `@webosose/ares-cli`

```bash
npm install -g @webosose/ares-cli
```

### Crear el IPK
```bash
cd rextv
ares-package . -o ../output
```

Esto genera: `../output/com.rextv.app_1.0.0_all.ipk`

### Instalar en el TV (Developer Mode)
```bash
# Conectar TV al mismo WiFi, activar Dev Mode en el TV
ares-setup-device        # agregar el TV
ares-install com.rextv.app_1.0.0_all.ipk
ares-launch com.rextv.app
```

### Probar en navegador
Abre `index.html` directamente en Chrome/Firefox.
En WebOS el User-Agent activa automáticamente las adaptaciones del control remoto.

## Agregar íconos
Coloca en `assets/`:
- `icon.png`       — 80×80 px
- `icon_large.png` — 130×130 px  
- `splash.png`     — 1920×1080 px (fondo de carga)

## Configurar API
Edita `js/config.js` para cambiar:
- `ALLCALIDAD` / `API` — dominio del backend
- `CHANNELS` — canales en vivo
- `AUTOPLAY_DELAY` — segundos antes del autoplay (default: 10)
