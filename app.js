function sakuraClearCountdown() {}

const STORAGE_KEY = 'sakura_progreso_v1';

function loadWatchedFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveWatchedToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedEpisodes));
  } catch(e) {}
}

const watchedEpisodes = loadWatchedFromStorage();

let catalogoFlat = [];
function buildCatalogoFlat() {
  catalogoFlat = [];
  series.forEach(s => {
    if (s.temporadas && s.temporadas.length > 0) {
      s.temporadas.forEach((t, tIdx) => {
        catalogoFlat.push({
          Nombre: t.tituloPortada || (s.Nombre + ' — ' + (t.nombre || ('T' + (tIdx + 1)))),
          portada: t.portada || s.portada,
          descripcion: s.descripcion,
          tag: s.tag,
          generos: s.generos,
          destacada: tIdx === 0 ? s.destacada : false,
          _serieRef: s,
          _temporadaIdx: tIdx
        });
      });
    } else {
      catalogoFlat.push(s);
    }
  });
}

function markWatched(seriesNombre, temporadaIdx, epIdx, currentTime, duration) {
  if (!watchedEpisodes[seriesNombre]) watchedEpisodes[seriesNombre] = {};
  const prev = watchedEpisodes[seriesNombre][temporadaIdx] || {};
  watchedEpisodes[seriesNombre][temporadaIdx] = {
    epIdx: epIdx,
    currentTime: currentTime !== undefined ? currentTime : (prev.currentTime || 0),
    duration: duration !== undefined ? duration : (prev.duration || 0),
    watchedAt: Date.now()   // ← timestamp para ordenar por último visto
  };
  saveWatchedToStorage();
  renderContinueRow();
}

function renderContinueRow() {
  const continueRow = document.getElementById('continue-row');
  if (!continueRow) return;

  const watched = catalogoFlat.filter(entry => {
    const ref = entry._serieRef || entry;
    const tIdx = entry._temporadaIdx !== undefined ? entry._temporadaIdx : 0;
    const info = watchedEpisodes[ref.Nombre];
    return info && info[tIdx] !== undefined;
  });

  if (watched.length === 0) {
    continueRow.innerHTML = '<p style="color:var(--muted);padding:20px 0;font-size:.85rem">Aquí aparecerán las series que estés viendo.</p>';
    return;
  }


  watched.sort((a, b) => {
    const refA = a._serieRef || a;
    const refB = b._serieRef || b;
    const tA   = a._temporadaIdx !== undefined ? a._temporadaIdx : 0;
    const tB   = b._temporadaIdx !== undefined ? b._temporadaIdx : 0;
    const infoA = watchedEpisodes[refA.Nombre]?.[tA] || {};
    const infoB = watchedEpisodes[refB.Nombre]?.[tB] || {};
    return (infoB.watchedAt || 0) - (infoA.watchedAt || 0);
  });

  continueRow.innerHTML = watched.map(entry => {
    const i = catalogoFlat.indexOf(entry);
    const ref = entry._serieRef || entry;
    const tIdx = entry._temporadaIdx !== undefined ? entry._temporadaIdx : 0;
    const info = watchedEpisodes[ref.Nombre][tIdx];
    const eIdx = info.epIdx !== undefined ? info.epIdx : (typeof info === 'number' ? info : 0);
    const eps = getEpisodiosFromRef(ref, tIdx);
    const ep = eps[eIdx];

    let prog = 0;
    if (info.duration && info.duration > 0) {
      const epProgress = Math.min(100, Math.round((info.currentTime / info.duration) * 100));
      if (eps.length > 1) {
        const baseProgress = (eIdx / eps.length) * 100;
        const epShare = (1 / eps.length) * 100;
        prog = Math.round(baseProgress + (epProgress / 100) * epShare);
      } else {
        prog = epProgress;
      }
    } else if (eps.length > 1) {
      prog = Math.round((eIdx / (eps.length - 1)) * 100);
    } else {
      prog = 100;
    }

    let metaText = ep ? ep.titulo : '';
    if (info.duration && info.duration > 0) {
      const remaining = Math.max(0, info.duration - info.currentTime);
      const mins = Math.floor(remaining / 60);
      if (mins > 0) metaText = `Ep. ${eIdx + 1} · ${mins} min restantes`;
    }

    return `<div class="card" onclick="openModalFlat(catalogoFlat[${i}], true)">
<img src="${entry.portada}" alt="${entry.Nombre}" loading="lazy">
<div class="card-overlay"></div>
<div class="play-icon"><svg width="18" height="18" fill="#111" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></div>
<div class="card-info">
  <div class="tag">${entry.tag}</div>
  <div class="card-title">${entry.Nombre}</div>
  <div class="card-meta"><span>${metaText}</span></div>
  <div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div>
</div>
</div>`;
  }).join('');

  setTimeout(() => initScrollWrap('continue-row', 'continue-scroll-wrap', 6), 0);
}

function cardHTMLTop(entry, i, rank) {
  const totalEps = getEpisodiosFromRef(entry._serieRef || entry, entry._temporadaIdx || 0).length;
  return `<div class="card" onclick="openModalFlat(catalogoFlat[${i}])">
<img src="${entry.portada}" alt="${entry.Nombre}" loading="lazy">
<div class="card-overlay"></div>
<div class="play-icon"><svg width="18" height="18" fill="#111" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></div>
<div class="card-rank">${rank}</div>
<div class="card-info">
  <div class="tag">${entry.tag}</div>
  <div class="card-title">${entry.Nombre}</div>
  <div class="card-meta">
    <span>${entry.generos[0]}</span>
    <span>${totalEps} ep.</span>
  </div>
</div>
</div>`;
}

function cardHTMLFlat(entry, i) {
  const totalEps = getEpisodiosFromRef(entry._serieRef || entry, entry._temporadaIdx || 0).length;
  return `<div class="card" onclick="openModalFlat(catalogoFlat[${i}])">
<img src="${entry.portada}" alt="${entry.Nombre}" loading="lazy">
<div class="card-overlay"></div>
<div class="play-icon"><svg width="18" height="18" fill="#111" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></div>
<div class="card-info">
  <div class="tag">${entry.tag}</div>
  <div class="card-title">${entry.Nombre}</div>
  <div class="card-meta">
    <span>${entry.generos[0]}</span>
    <span>${totalEps} ep.</span>
  </div>
</div>
</div>`;
}

function getEpisodiosFromRef(s, temporadaIdx) {
  let eps;
  if (s.temporadas && s.temporadas.length > 0) {
    eps = s.temporadas[temporadaIdx] ? s.temporadas[temporadaIdx].episodios : [];
  } else {
    eps = s.episodios || [];
  }

  return eps.filter(e => e && e.url && e.url.trim() !== '');
}

function countAllEps(s) {
  if (s.episodios) return s.episodios.length;
  if (s.temporadas) return s.temporadas.reduce((acc, t) => acc + t.episodios.length, 0);
  return 0;
}

function getEpisodios(s, temporadaIdx) {
  return getEpisodiosFromRef(s, temporadaIdx);
}

function generateThumbnail(url, imgEl, spinnerEl) {

  if (isEmbedUrl(url)) {
    if (spinnerEl) spinnerEl.remove();
    return;
  }
  const vid = document.createElement('video');
  vid.crossOrigin = 'anonymous';
  vid.preload = 'metadata';
  vid.muted = true;
  vid.src = url;
  vid.addEventListener('loadeddata', () => { vid.currentTime = 2; });
  vid.addEventListener('seeked', () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 640;
      canvas.height = vid.videoHeight || 360;
      canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
      imgEl.src = canvas.toDataURL('image/jpeg', 0.85);
      imgEl.style.display = 'block';
      if (spinnerEl) spinnerEl.remove();
    } catch(e) {
      if (spinnerEl) spinnerEl.remove();
    }
    vid.src = '';
  });
  vid.addEventListener('error', () => {
    if (spinnerEl) spinnerEl.remove();
    vid.src = '';
  });
}

let currentSeries = null;
let currentTemporadaIdx = 0;

let playerState = {
  playing: false,
  currentEpIndex: 0,
  series: null,
  volume: 1
};

function openModalFlat(entry, resume) {
  const s = entry._serieRef || entry;
  const tIdx = entry._temporadaIdx !== undefined ? entry._temporadaIdx : 0;
  openModalWith(s, tIdx, resume ? entry : null);
}

function openModal(s) {
  openModalWith(s, 0, null);
}

function openModalWith(s, tIdx, resumeEntry) {
  currentSeries = s;
  currentTemporadaIdx = tIdx;
  playerState.series = s;

  document.getElementById('modal-tag-el').textContent = s.tag;
  document.getElementById('modal-title').textContent = s.Nombre;
  document.getElementById('modal-tags').innerHTML = s.generos.map(g => `<span class="modal-tag">${g}</span>`).join('');
  document.getElementById('modal-desc').textContent = s.descripcion;

  const playerArea = document.getElementById('modal-player-area');
  playerArea.innerHTML = '';

  const savedInfo = watchedEpisodes[s.Nombre] && watchedEpisodes[s.Nombre][tIdx];
  const shouldResume = resumeEntry && savedInfo && savedInfo.epIdx !== undefined;

  const firstEps = getEpisodios(s, tIdx);

  if (shouldResume) {
    const resumeEpIdx = savedInfo.epIdx;
    const resumeTime  = savedInfo.currentTime || 0;
    const resumeEp    = firstEps[resumeEpIdx];

    if (resumeEp && resumeEp.url) {
      renderSeasonTabs(s, tIdx);
      renderEpisodeList(s, tIdx);
      document.getElementById('modal').classList.add('open');

      buildCustomPlayer(resumeEp.url, resumeEpIdx, false);
      playerState.currentEpIndex = resumeEpIdx;

      const vid = document.getElementById('sakura-video');
      if (vid && resumeTime > 0) {
        const seekOnReady = () => {
          vid.currentTime = resumeTime;
          vid.removeEventListener('loadedmetadata', seekOnReady);
        };
        if (vid.readyState >= 1) {
          vid.currentTime = resumeTime;
        } else {
          vid.addEventListener('loadedmetadata', seekOnReady);
        }
      }

      document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('ep-active'));
      const epItem = document.getElementById(`ep-item-${resumeEpIdx}`);
      if (epItem) epItem.classList.add('ep-active');

      const playBtn = document.getElementById('modal-play-btn');
      if (playBtn) playBtn.onclick = () => {
        const eps = getEpisodios(s, currentTemporadaIdx);
        if (eps.length > 0) playEpisode(eps[resumeEpIdx], null);
      };
      return;
    }
  }

  if (firstEps.length > 0) {
    buildCustomPlayer(firstEps[0].url, 0, false);
    playerState.currentEpIndex = 0;
  }

  const playBtn = document.getElementById('modal-play-btn');
  playBtn.onclick = () => {
    const eps = getEpisodios(s, currentTemporadaIdx);
    if (eps.length > 0) playEpisode(eps[0], null);
  };

  renderSeasonTabs(s, tIdx);
  renderEpisodeList(s, tIdx);

  document.getElementById('modal').classList.add('open');
}

function renderSeasonTabs(s, activeTIdx) {
  const selector = document.getElementById('season-selector');
  const tabs = document.getElementById('season-tabs');

  if (!s.temporadas || s.temporadas.length <= 1) {
    selector.style.display = 'none';
    return;
  }

  selector.style.display = 'block';
  tabs.innerHTML = s.temporadas.map((t, i) => `
    <button class="season-tab${i === activeTIdx ? ' active-season' : ''}"
      onclick="switchSeason(${i})" data-season="${i}">
      ${t.nombre || ('Temporada ' + (i + 1))}
    </button>`).join('');
}

function switchSeason(idx) {
  currentTemporadaIdx = idx;

  document.querySelectorAll('.season-tab').forEach((tab, i) => {
    tab.classList.toggle('active-season', i === idx);
  });

  renderEpisodeList(currentSeries, idx);

  const eps = getEpisodios(currentSeries, idx);
  const playerArea = document.getElementById('modal-player-area');
  const existingVideo = document.getElementById('sakura-video');
  if (existingVideo) {
    existingVideo.pause();
    existingVideo.src = '';
    playerArea.innerHTML = '';
  }
  if (eps.length > 0) {
    buildCustomPlayer(eps[0].url, 0, false);
    playerState.currentEpIndex = 0;
  }

  playerState.series = currentSeries;
  playerState.currentEpIndex = 0;
}

function renderEpisodeList(s, temporadaIdx) {
  const epList = document.getElementById('modal-eps');
  const eps = getEpisodios(s, temporadaIdx);

  epList.innerHTML = eps.map((e, i) => `
    <div class="ep-item" id="ep-item-${i}" onclick="onEpItemClick(${i})">
      <div class="ep-num">${i + 1}</div>
      <div class="ep-thumb-wrap" id="ep-thumb-${i}">
        <div class="thumb-loading"><div class="thumb-spinner"></div></div>
        <img class="ep-thumb-img" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;inset:0" src="" alt="">
        <div class="ep-thumb-overlay">
          <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
      <div class="ep-info">
        <div class="ep-name">${e.titulo}</div>
        <div class="ep-dur">Tap para reproducir</div>
      </div>
    </div>`).join('');

  eps.forEach((e, i) => {
    setTimeout(() => {
      const wrap = document.getElementById(`ep-thumb-${i}`);
      if (!wrap) return;
      const img = wrap.querySelector('.ep-thumb-img');
      const spinner = wrap.querySelector('.thumb-loading');
      generateThumbnail(e.url, img, spinner);
    }, i * 300);
  });
}

function onEpItemClick(idx) {
  const existingVideo = document.getElementById('sakura-video');
  const eps = getEpisodios(currentSeries, currentTemporadaIdx);
  if (existingVideo) {
    switchEpisode(idx, false, eps);
  } else {
    playEpisode(eps[idx], document.getElementById(`ep-item-${idx}`));
  }
}

function showMainThumbnail(ep, container, onPlayClick) {
  const serieName = (currentSeries && currentSeries.Nombre) ? currentSeries.Nombre : '';
  const nameHTML = serieName
    ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:12px 14px 52px;background:linear-gradient(0deg,rgba(0,0,0,.75) 0%,transparent 100%);pointer-events:none;z-index:2;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:2px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8);line-height:1.1;">${serieName}</div>
       </div>`
    : '';


  if (isEmbedUrl(ep.url)) {
    const posterSrc = (currentSeries && currentSeries.portada) ? currentSeries.portada : '';
    container.innerHTML = `
      <img id="main-thumb-img" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" src="${posterSrc}" alt="">
      ${nameHTML}
      <div class="thumb-play-btn" id="main-play-overlay">
        <div class="thumb-play-circle">
          <svg width="26" height="26" fill="#111" viewBox="0 0 24 24" style="margin-left:3px"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>`;
    container.style.position = 'relative';
    document.getElementById('main-play-overlay').addEventListener('click', onPlayClick);
    return;
  }

  container.innerHTML = `
    <div class="thumb-loading" style="position:absolute;inset:0"><div class="thumb-spinner" style="width:36px;height:36px;border-width:3px"></div></div>
    <img id="main-thumb-img" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;inset:0" src="" alt="">
    ${nameHTML}
    <div class="thumb-play-btn" id="main-play-overlay">
      <div class="thumb-play-circle">
        <svg width="26" height="26" fill="#111" viewBox="0 0 24 24" style="margin-left:3px"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
    </div>`;

  container.style.position = 'relative';

  const img = document.getElementById('main-thumb-img');
  const spinner = container.querySelector('.thumb-loading');
  const overlay = document.getElementById('main-play-overlay');

  generateThumbnail(ep.url, img, spinner);
  overlay.addEventListener('click', onPlayClick);
}

function closeModal(e) {
  if (e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('open');
    currentSeries = null;
    closePlayer();
  }
}

function setPlayerPoster(epIndex) {
  const poster = document.getElementById('player-poster');
  if (!poster || !playerState.series) return;

  const posterOverlay = document.getElementById('player-poster-overlay');
  function _syncOverlay(visible) {
    if (posterOverlay) posterOverlay.style.display = visible ? 'flex' : 'none';
  }

  const eps = getEpisodios(playerState.series, currentTemporadaIdx);
  const ep = eps[epIndex];
  if (!ep) return;

  const thumbWrap = document.getElementById(`ep-thumb-${epIndex}`);
  if (thumbWrap) {
    const thumbImg = thumbWrap.querySelector('.ep-thumb-img');
    if (thumbImg && thumbImg.src && thumbImg.style.display !== 'none') {
      poster.src = thumbImg.src;
      poster.style.display = 'block';
      _syncOverlay(true);
      return;
    }
  }

  poster.style.display = 'none';
  _syncOverlay(false);
  const vid = document.createElement('video');
  vid.crossOrigin = 'anonymous';
  vid.preload = 'metadata';
  vid.muted = true;
  vid.src = ep.url;
  vid.addEventListener('loadeddata', () => { vid.currentTime = 2; });
  vid.addEventListener('seeked', () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 640;
      canvas.height = vid.videoHeight || 360;
      canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
      poster.src = canvas.toDataURL('image/jpeg', 0.85);
      poster.style.display = 'block';
      _syncOverlay(true);
    } catch(e) {}
    vid.src = '';
  });
  vid.addEventListener('error', () => { vid.src = ''; });
}

function _sakuraLoadScript(src, onload, onerror) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) { onload(); return; }
  const s = document.createElement('script');
  s.src = src;
  s.onload  = onload;
  s.onerror = onerror || onload;
  document.head.appendChild(s);
}

function _sakuraDestroyPlayer(video) {
  if (video._hlsInstance) {
    try { video._hlsInstance.destroy(); } catch(e) {}
    video._hlsInstance = null;
  }
  if (video._mpegtsInstance) {
    try { video._mpegtsInstance.pause(); video._mpegtsInstance.unload();
          video._mpegtsInstance.detachMediaElement(); video._mpegtsInstance.destroy(); } catch(e) {}
    video._mpegtsInstance = null;
  }
}

function resolveEmbedSrc(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^<iframe/i.test(trimmed)) {
    const match = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : null;
  }
  try {
    const u = new URL(trimmed);
    if (/streamtape\.(com|to|cc|me|net)/i.test(u.hostname)) return trimmed;
    if (/\/e\/|\/embed\/|\/player\//i.test(u.pathname)) return trimmed;
  } catch(e) {}
  return null;
}

function isEmbedUrl(raw) {
  return resolveEmbedSrc(raw) !== null;
}

function sakuraLoadVideoSrc(video, url, onReady) {
  if (!url) return;
  _sakuraDestroyPlayer(video);

  const cleanUrl  = url.split('?')[0].toLowerCase();
  const isM3u8    = cleanUrl.endsWith('.m3u8');
  const isRawTs   = cleanUrl.endsWith('.ts');
  if (!isM3u8 && !isRawTs) {
    video.src = url;
    video.load();
    if (onReady) onReady();
    return;
  }
  if (isM3u8) {
    function _attachHls() {
      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { if (onReady) onReady(); });
        hls.on(Hls.Events.ERROR, (ev, data) => {
          if (data.fatal) console.warn('[Sakura HLS] error fatal:', data.type, data.details);
        });
        video._hlsInstance = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url; video.load(); if (onReady) onReady();
      } else {
        video.src = url; video.load(); if (onReady) onReady();
      }
    }
    if (window.Hls) { _attachHls(); return; }
    _sakuraLoadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js',
      _attachHls,
      () => { video.src = url; video.load(); if (onReady) onReady(); }
    );
    return;
  }

  function _attachMpegts() {
    if (window.mpegts && mpegts.isSupported()) {
      const player = mpegts.createPlayer({
        type: 'mpegts',
        url:  url,
        isLive: false,
        cors: true,
        withCredentials: false,
      }, {
        enableWorker: false,
        lazyLoad: false,
        seekType: 'range',
      });
      player.attachMediaElement(video);
      player.load();
      player.on(mpegts.Events.ERROR, (errType, errDetail) => {
        console.warn('[Sakura mpegts] error:', errType, errDetail);
      });
      video._mpegtsInstance = player;
      if (onReady) onReady();
    } else {
      video.src = url; video.load(); if (onReady) onReady();
    }
  }

  if (window.mpegts) { _attachMpegts(); return; }
  _sakuraLoadScript(
    'https://cdn.jsdelivr.net/npm/mpegts.js@1.8.0/dist/mpegts.min.js',
    _attachMpegts,
    () => { video.src = url; video.load(); if (onReady) onReady(); }
  );
}

function buildCustomPlayer(url, epIndex, autoplay) {
  const playerArea = document.getElementById('modal-player-area');
  const eps = getEpisodios(playerState.series, currentTemporadaIdx);
  const ep = eps[epIndex];


  const embedSrc = resolveEmbedSrc(url);
  if (embedSrc) {
    playerArea.innerHTML = `
      <iframe
        id="sakura-embed-frame"
        src="${embedSrc}"
        width="100%" height="100%"
        allowfullscreen
        allowtransparency
        allow="autoplay; fullscreen"
        scrolling="no"
        frameborder="0"
        style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;">
      </iframe>
      <div class="custom-controls" id="custom-controls" style="pointer-events:none;opacity:0;"></div>`;

    // Mark as watched immediately (no timeupdate available for iframes)
    if (playerState.series) {
      markWatched(playerState.series.Nombre, currentTemporadaIdx, epIndex, 0, 0);
    }

    // Highlight the active episode in the list
    document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('ep-active'));
    const epItem = document.getElementById(`ep-item-${epIndex}`);
    if (epItem) epItem.classList.add('ep-active');

    playerState.currentEpIndex = epIndex;
    sakuraClearCountdown(true);
    return;
  }


  const tieneCalidades = ep && ep.calidades && Object.keys(ep.calidades).length > 0;

  const calidadesHTML = tieneCalidades
    ? `<div class="ctrl-quality-wrap">
        <button class="ctrl-btn ctrl-quality-btn" id="ctrl-quality-btn" title="Calidad">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-11h2v2h-2zm0 4h2v4h-2z"/></svg>
          HD
        </button>
        <div class="ctrl-quality-menu" id="ctrl-quality-menu">
          <div class="ctrl-quality-label">Calidad</div>
          ${Object.keys(ep.calidades).map(k => `<div class="ctrl-quality-opt" data-quality="${k}" data-url="${ep.calidades[k]}">${k}</div>`).join('')}
        </div>
      </div>`
    : `<button class="ctrl-btn" id="ctrl-quality-btn" title="Calidad (auto)" disabled style="opacity:.4;cursor:default">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-11h2v2h-2zm0 4h2v4h-2z"/></svg>
        Auto
      </button>`;

  playerArea.innerHTML = `
    <video id="sakura-video" preload="auto" style="width:100%;height:100%;object-fit:contain;background:#000;display:block">
    </video>
    <img id="player-poster" src="" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;pointer-events:none;">
    <div id="player-poster-overlay" style="position:absolute;inset:0;display:none;flex-direction:column;justify-content:flex-end;padding:0 18px 58px;background:linear-gradient(0deg,rgba(0,0,0,.72) 0%,transparent 55%);pointer-events:none;z-index:1;">
      <div id="player-poster-title" style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8);line-height:1.1;"></div>
    </div>
    <div id="mobile-center-playpause" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:15;pointer-events:auto;">
      <button id="mobile-pp-btn" style="background:rgba(0,0,0,.45);border:none;border-radius:50%;width:68px;height:68px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px);">
        <svg id="mobile-icon-play" width="28" height="28" fill="#fff" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        <svg id="mobile-icon-pause" width="28" height="28" fill="#fff" viewBox="0 0 24 24" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      </button>
    </div>
    <div class="custom-controls" id="custom-controls">
      <div class="ctrl-progress-wrap">
        <div class="ctrl-progress-bg" id="ctrl-progress-bg">
          <div class="ctrl-progress-fill" id="ctrl-progress-fill"></div>
          <div class="ctrl-progress-thumb" id="ctrl-progress-thumb"></div>
        </div>
      </div>
      <div class="ctrl-bar">
        <div class="ctrl-left">
          <button class="ctrl-btn" id="ctrl-play-pause" title="Play / Pausa">
            <svg id="icon-play" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
            <svg id="icon-pause" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <div class="ctrl-vol-wrap">
            <button class="ctrl-btn ctrl-vol-btn" id="ctrl-vol-btn" title="Volumen">
              <svg id="icon-vol-on" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
              <svg id="icon-vol-off" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:none"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            </button>
            <div class="ctrl-vol-slider-wrap">
              <input type="range" class="ctrl-vol-slider" id="ctrl-vol-slider" min="0" max="1" step="0.05" value="1">
            </div>
          </div>
          <span class="ctrl-time" id="ctrl-time">0:00 / 0:00</span>
        </div>
        <div class="ctrl-right">
          <div class="ctrl-speed-wrap">
            <button class="ctrl-btn ctrl-speed-btn" id="ctrl-speed-btn" title="Velocidad">1×</button>
            <div class="ctrl-speed-menu" id="ctrl-speed-menu">
              ${[0.5,0.75,1,1.25,1.5,2].map(s=>`<div class="ctrl-speed-opt${s===1?' active':''}" data-speed="${s}">${s}×</div>`).join('')}
            </div>
          </div>
          ${calidadesHTML}
          <div class="ctrl-ep-wrap">
            <button class="ctrl-btn ctrl-ep-btn" id="ctrl-ep-btn" title="Episodios">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="2"/><rect x="3" y="11" width="18" height="2"/><rect x="3" y="17" width="18" height="2"/></svg>
              Episodios
            </button>
            <div class="ctrl-ep-menu" id="ctrl-ep-menu"></div>
          </div>
          <button class="ctrl-btn" id="ctrl-pip" title="Pantalla en Pantalla" style="display:none">
            <svg id="icon-pip-enter" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z"/></svg>
            <svg id="icon-pip-exit" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:none"><path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14zm-10-7h6v4h-6v-4z"/></svg>
          </button>
          <button class="ctrl-btn" id="ctrl-fullscreen" title="Pantalla completa">
            <svg id="icon-expand" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 4h-4v2h6v-6h-2v4z"/></svg>
            <svg id="icon-compress" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="display:none"><path d="M9 3H7v4H3v2h6V3zm6 0h2v4h4v2h-6V3zM3 15h4v4h2v-6H3v2zm14 4v-4h4v-2h-6v6h2z"/></svg>
          </button>
        </div>
      </div>
    </div>`;

  const video = document.getElementById('sakura-video');
  const controls = document.getElementById('custom-controls');
  const poster = document.getElementById('player-poster');
  const posterOverlay = document.getElementById('player-poster-overlay');
  const posterTitle   = document.getElementById('player-poster-title');


  sakuraLoadVideoSrc(video, url);


  if (posterTitle && playerState.series) {
    posterTitle.textContent = playerState.series.Nombre;
  }

  function _showPoster() {
    poster.style.display = 'block';
    if (posterOverlay) posterOverlay.style.display = 'flex';
  }
  function _hidePoster() {
    poster.style.display = 'none';
    if (posterOverlay) posterOverlay.style.display = 'none';
  }

  video.volume = playerState.volume;

  poster.style.display = 'none';
  if (posterOverlay) posterOverlay.style.display = 'none';

  poster.style.cursor = 'pointer';
  poster.addEventListener('click', () => {
    poster.style.display = 'none';
    if (posterOverlay) posterOverlay.style.display = 'none';
    video.play().catch(() => {});
  });

  video.addEventListener('playing', () => {
    poster.style.display = 'none';
    if (posterOverlay) posterOverlay.style.display = 'none';
  });
  video.addEventListener('pause', () => {
    if (video.currentTime === 0) {
      poster.style.display = 'none';
      if (posterOverlay) posterOverlay.style.display = 'none';
    }
  });

  video.addEventListener('contextmenu', e => e.preventDefault());
  playerArea.addEventListener('contextmenu', e => e.preventDefault());

  const btnPlayPause = document.getElementById('ctrl-play-pause');
  const iconPlay  = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  function updatePlayIcon() {
    iconPlay.style.display  = video.paused ? '' : 'none';
    iconPause.style.display = video.paused ? 'none' : '';
  }

  btnPlayPause.addEventListener('click', () => {
    if (video.paused) { _hidePoster(); video.play(); }
    else video.pause();
  });
  video.addEventListener('play', updatePlayIcon);
  video.addEventListener('pause', updatePlayIcon);
  video.addEventListener('click', () => {
    const isMobile = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
    if (isMobile) {
      if (video.paused && video.currentTime < 1) {
        _hidePoster();
        video.play();
      } else {
        showControls();
      }
    } else {
      if (video.paused) { _hidePoster(); video.play(); }
      else video.pause();
    }
  });

  const progressBg    = document.getElementById('ctrl-progress-bg');
  const progressFill  = document.getElementById('ctrl-progress-fill');
  const progressThumb = document.getElementById('ctrl-progress-thumb');
  const timeLabel     = document.getElementById('ctrl-time');

  function fmt(s) {
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width  = pct + '%';
    progressThumb.style.left  = pct + '%';
    timeLabel.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
    if (playerState.series) {
      const nowSec = Math.floor(video.currentTime);
      if (!video._lastSavedSec || Math.abs(nowSec - video._lastSavedSec) >= 5) {
        video._lastSavedSec = nowSec;
        markWatched(
          playerState.series.Nombre,
          currentTemporadaIdx,
          playerState.currentEpIndex,
          video.currentTime,
          video.duration
        );
      }
    }
  });

  function seekTo(e) {
    const rect = progressBg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
  }

  let dragging = false;
  progressBg.addEventListener('mousedown', e => { dragging = true; seekTo(e); });
  document.addEventListener('mousemove',  e => { if (dragging) seekTo(e); });
  document.addEventListener('mouseup',    () => { dragging = false; });

  progressBg.addEventListener('touchstart', e => { e.preventDefault(); seekTo(e); }, { passive: false });
  progressBg.addEventListener('touchmove',  e => { e.preventDefault(); seekTo(e); }, { passive: false });

  const volBtn    = document.getElementById('ctrl-vol-btn');
  const volSlider = document.getElementById('ctrl-vol-slider');
  const iconVolOn = document.getElementById('icon-vol-on');
  const iconVolOff= document.getElementById('icon-vol-off');

  function updateVolIcon() {
    iconVolOn.style.display  = video.muted || video.volume === 0 ? 'none' : '';
    iconVolOff.style.display = video.muted || video.volume === 0 ? '' : 'none';
  }

  volBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    volSlider.value = video.muted ? 0 : video.volume;
    updateVolIcon();
  });

  volSlider.addEventListener('input', () => {
    const val = parseFloat(volSlider.value);
    video.volume = val;
    video.muted = val === 0;
    playerState.volume = val;
    updateVolIcon();
  });

  video.addEventListener('volumechange', () => {
    volSlider.value = video.muted ? 0 : video.volume;
    updateVolIcon();
  });

  const speedBtn  = document.getElementById('ctrl-speed-btn');
  const speedMenu = document.getElementById('ctrl-speed-menu');

  speedBtn.addEventListener('click', e => {
    e.stopPropagation();
    speedMenu.classList.toggle('open');
    closeOtherMenus('ctrl-speed-menu');
  });

  speedMenu.querySelectorAll('.ctrl-speed-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const spd = parseFloat(opt.dataset.speed);
      video.playbackRate = spd;
      speedBtn.textContent = spd + '×';
      speedMenu.querySelectorAll('.ctrl-speed-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      speedMenu.classList.remove('open');
    });
  });

  if (tieneCalidades) {
    const qualityBtn  = document.getElementById('ctrl-quality-btn');
    const qualityMenu = document.getElementById('ctrl-quality-menu');

    qualityBtn.addEventListener('click', e => {
      e.stopPropagation();
      qualityMenu.classList.toggle('open');
      closeOtherMenus('ctrl-quality-menu');
    });

    const opts = qualityMenu.querySelectorAll('.ctrl-quality-opt');
    if (opts.length > 0) opts[0].classList.add('active');

    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        const currentTime = video.currentTime;
        const wasPaused = video.paused;
        video.src = opt.dataset.url;
        video.load();
        video.currentTime = currentTime;
        if (!wasPaused) video.play().catch(() => {});
        opts.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        qualityMenu.classList.remove('open');
      });
    });
  }

  const epBtn  = document.getElementById('ctrl-ep-btn');
  const epMenu = document.getElementById('ctrl-ep-menu');
  const epsForMenu = getEpisodios(playerState.series, currentTemporadaIdx);

  if (epsForMenu.length > 1) {
    epMenu.innerHTML = epsForMenu.map((ep, i) => `
      <div class="ctrl-ep-opt${i === epIndex ? ' active' : ''}" data-index="${i}">
        <span class="ctrl-ep-num">${i+1}</span>
        <span class="ctrl-ep-name">${ep.titulo}</span>
      </div>`).join('');

    epMenu.querySelectorAll('.ctrl-ep-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const idx = parseInt(opt.dataset.index);
        epMenu.classList.remove('open');
        switchEpisode(idx, false, epsForMenu);
      });
    });

    epBtn.addEventListener('click', e => {
      e.stopPropagation();
      epMenu.classList.toggle('open');
      closeOtherMenus('ctrl-ep-menu');
    });
  } else {
    epBtn.style.display = 'none';
  }

  document.addEventListener('click', () => {
    speedMenu.classList.remove('open');
    epMenu.classList.remove('open');
    const qm = document.getElementById('ctrl-quality-menu');
    if (qm) qm.classList.remove('open');
  });

  const btnFs       = document.getElementById('ctrl-fullscreen');
  const iconExpand  = document.getElementById('icon-expand');
  const iconCompress= document.getElementById('icon-compress');
  const mobileCenterPP = document.getElementById('mobile-center-playpause');
  const mobilePPBtn    = document.getElementById('mobile-pp-btn');
  const mobileIconPlay = document.getElementById('mobile-icon-play');
  const mobileIconPause= document.getElementById('mobile-icon-pause');

  function isMobileDevice() {
    return window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  }

  function updateMobilePPIcon() {
    if (!mobileIconPlay || !mobileIconPause) return;
    mobileIconPlay.style.display  = video.paused ? '' : 'none';
    mobileIconPause.style.display = video.paused ? 'none' : '';
  }

  if (mobilePPBtn) {
    mobilePPBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (video.paused) { _hidePoster(); video.play(); }
      else video.pause();
    });
  }

  video.addEventListener('play',  updateMobilePPIcon);
  video.addEventListener('pause', updateMobilePPIcon);


  const btnPip       = document.getElementById('ctrl-pip');
  const iconPipEnter = document.getElementById('icon-pip-enter');
  const iconPipExit  = document.getElementById('icon-pip-exit');

  if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
    btnPip.style.display = '';

    btnPip.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('[Sakura PiP] Error:', err);
      }
    });

    video.addEventListener('enterpictureinpicture', () => {
      iconPipEnter.style.display = 'none';
      iconPipExit.style.display  = '';
      btnPip.title = 'Salir de Pantalla en Pantalla';
    });
    video.addEventListener('leavepictureinpicture', () => {
      iconPipEnter.style.display = '';
      iconPipExit.style.display  = 'none';
      btnPip.title = 'Pantalla en Pantalla';
    });
  }

  btnFs.addEventListener('click', async () => {
    if (!document.fullscreenElement) {
      await playerArea.requestFullscreen();
      if (isMobileDevice() && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    iconExpand.style.display   = isFs ? 'none' : '';
    iconCompress.style.display = isFs ? '' : 'none';
    if (mobileCenterPP) {
      if (isFs && isMobileDevice()) {
        mobileCenterPP.style.display = 'block';
        mobileCenterPP.style.opacity = '0';
        mobileCenterPP.style.pointerEvents = 'none';
        mobileCenterPP.style.transition = 'opacity .25s';
      } else {
        mobileCenterPP.style.display = 'none';
      }
    }
    if (!isFs && isMobileDevice() && screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  });

  let hideTimer;
  function showControls() {
    controls.classList.add('visible');
    if (mobileCenterPP && mobileCenterPP.style.display !== 'none') {
      mobileCenterPP.style.opacity = '1';
      mobileCenterPP.style.pointerEvents = 'auto';
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!video.paused) {
        controls.classList.remove('visible');
        if (mobileCenterPP) {
          mobileCenterPP.style.opacity = '0';
          mobileCenterPP.style.pointerEvents = 'none';
        }
      }
    }, 2800);
  }
  playerArea.addEventListener('mousemove',  showControls);
  playerArea.addEventListener('mouseenter', showControls);
  playerArea.addEventListener('mouseleave', () => {
    if (!video.paused) {
      controls.classList.remove('visible');
      if (mobileCenterPP) {
        mobileCenterPP.style.opacity = '0';
        mobileCenterPP.style.pointerEvents = 'none';
      }
    }
  });
  video.addEventListener('pause', () => {
    controls.classList.add('visible');
    if (mobileCenterPP && mobileCenterPP.style.display !== 'none') {
      mobileCenterPP.style.opacity = '1';
      mobileCenterPP.style.pointerEvents = 'auto';
    }
  });
  video.addEventListener('play', () => showControls());

  controls.classList.add('visible');

  if (autoplay) video.play().catch(() => {});
  playerState.currentEpIndex = epIndex;
}

function closeOtherMenus(keepId) {
  ['ctrl-speed-menu','ctrl-ep-menu','ctrl-quality-menu'].forEach(id => {
    if (id !== keepId) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('open');
    }
  });
}

function switchEpisode(idx, autoplay, eps) {
  if (!playerState.series) return;
  const episodios = eps || getEpisodios(playerState.series, currentTemporadaIdx);
  const ep = episodios[idx];

  markWatched(playerState.series.Nombre, currentTemporadaIdx, idx);

  document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('ep-active'));
  const epItem = document.getElementById(`ep-item-${idx}`);
  if (epItem) epItem.classList.add('ep-active');

  const existingEmbed = document.getElementById('sakura-embed-frame');
  const existingVideo = document.getElementById('sakura-video');

  if (isEmbedUrl(ep.url) || existingEmbed) {
    if (existingVideo) {
      existingVideo.pause();
      _sakuraDestroyPlayer(existingVideo);
      existingVideo.src = '';
    }
    buildCustomPlayer(ep.url, idx, autoplay);
    return;
  }

  if (existingVideo) {
    existingVideo.pause();
    existingVideo._sakuraLoading = true;

    const _pipActiveOnSwitch = !!document.pictureInPictureElement;

    sakuraLoadVideoSrc(existingVideo, ep.url, (autoplay || _pipActiveOnSwitch) ? () => {
      existingVideo._sakuraLoading = false;
      const poster   = document.getElementById('player-poster');
      const posterOv = document.getElementById('player-poster-overlay');
      if (poster)   poster.style.display   = 'none';
      if (posterOv) posterOv.style.display = 'none';
      existingVideo.play().catch(() => {});
    } : () => { existingVideo._sakuraLoading = false; });

    document.querySelectorAll('.ctrl-ep-opt').forEach(o => o.classList.remove('active'));
    const activeOpt = document.querySelector(`.ctrl-ep-opt[data-index="${idx}"]`);
    if (activeOpt) activeOpt.classList.add('active');

    const fill  = document.getElementById('ctrl-progress-fill');
    const thumb = document.getElementById('ctrl-progress-thumb');
    if (fill)  fill.style.width = '0%';
    if (thumb) thumb.style.left = '0%';

    const iconPlay  = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    if (iconPlay)  iconPlay.style.display  = '';
    if (iconPause) iconPause.style.display = 'none';

    playerState.currentEpIndex = idx;
  } else {
    buildCustomPlayer(ep.url, idx, autoplay);
  }
}

function playEpisode(ep, itemEl) {
  const eps = getEpisodios(playerState.series, currentTemporadaIdx);
  const idx = eps.indexOf(ep);

  document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('ep-active'));
  if (itemEl) itemEl.classList.add('ep-active');

  if (playerState.series) {
    markWatched(playerState.series.Nombre, currentTemporadaIdx, idx);
  }

  const existingVideo = document.getElementById('sakura-video');
  const existingEmbed = document.getElementById('sakura-embed-frame');
  if (existingVideo || existingEmbed) {
    switchEpisode(idx, true, eps);
  } else {
    buildCustomPlayer(ep.url, idx, true);
  }
}

function closePlayer() {
  const video = document.getElementById('sakura-video');
  if (video) {
    video.pause();
    _sakuraDestroyPlayer(video);
    video.src = '';
  }

  const embedFrame = document.getElementById('sakura-embed-frame');
  if (embedFrame) {
    embedFrame.src = 'about:blank';
    embedFrame.remove();
  }
  sakuraClearCountdown();
  document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('ep-active'));
  if (currentSeries) {
    const playerArea = document.getElementById('modal-player-area');
    if (playerArea) {
      const eps = getEpisodios(currentSeries, 0);
      if (eps.length > 0) {
        showMainThumbnail(eps[0], playerArea, () => {
          playEpisode(eps[0], null);
        });
      }
    }
  }
}

let _heroFeatured = [];
let _heroIndex = 0;
let _heroInterval = null;

function _renderHero(featured) {
  const hero = document.querySelector('.hero');
  if (hero) hero.classList.add('hero-fade-out');

  setTimeout(() => {
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) heroBg.src = featured.portada;

    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = featured.Nombre;

    const heroMeta = document.querySelector('.hero-meta');
    if (heroMeta) {
      const ref = featured._serieRef || featured;
      const tIdx = featured._temporadaIdx || 0;
      const total = getEpisodios(ref, tIdx).length;
      heroMeta.innerHTML = `<span>${featured.generos.join(' / ')}</span><span>·</span><span>${total} Episodio${total !== 1 ? 's' : ''}</span>`;
    }

    const heroDesc = document.querySelector('.hero-desc');
    if (heroDesc) heroDesc.textContent = featured.descripcion;

    const heroBtn = document.querySelector('.hero-actions .btn-primary');
    if (heroBtn) {
      heroBtn.onclick = (e) => { e.preventDefault(); openModalFlat(featured); };
    }

    if (hero) hero.classList.remove('hero-fade-out');
  }, 400);
}

function _buildHeroDots() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  let dotsEl = hero.querySelector('.hero-dots');
  if (!dotsEl) {
    dotsEl = document.createElement('div');
    dotsEl.className = 'hero-dots';
    hero.appendChild(dotsEl);
  }
  dotsEl.innerHTML = _heroFeatured.map((_, i) =>
    `<button class="hero-dot${i === _heroIndex ? ' active' : ''}" onclick="_heroGoTo(${i})"></button>`
  ).join('');
}

function _updateHeroDots() {
  const dots = document.querySelectorAll('.hero-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === _heroIndex));
}

function _heroGoTo(i) {
  if (_heroInterval) clearInterval(_heroInterval);
  _heroIndex = i;
  _renderHero(_heroFeatured[_heroIndex]);
  if (_heroFeatured.length > 1) {
    _heroInterval = setInterval(() => {
      _heroIndex = (_heroIndex + 1) % _heroFeatured.length;
      _renderHero(_heroFeatured[_heroIndex]);
      _updateHeroDots();
    }, 7000);
  }
}

function setupHero() {
  _heroFeatured = catalogoFlat.filter(e => e.destacada);
  if (_heroFeatured.length === 0) _heroFeatured = catalogoFlat.slice(0, 1);
  if (_heroFeatured.length === 0) return;

  _heroIndex = 0;
  _renderHero(_heroFeatured[_heroIndex]);
  _buildHeroDots();

  if (_heroInterval) clearInterval(_heroInterval);

  if (_heroFeatured.length > 1) {
    _heroInterval = setInterval(() => {
      _heroIndex = (_heroIndex + 1) % _heroFeatured.length;
      _renderHero(_heroFeatured[_heroIndex]);
      _updateHeroDots();
    }, 7000);
  }
}

function renderSearch(query) {
  const q = query.trim().toLowerCase();
  const overlay = document.getElementById('search-overlay');
  const grid    = document.getElementById('search-grid');
  const label   = document.getElementById('search-label');

  if (!q) { overlay.classList.remove('open'); return; }
  document.getElementById('category-overlay').classList.remove('open');

  overlay.classList.add('open');
  label.textContent = `Resultados para "${query}"`;
  const filtered = catalogoFlat.filter(entry =>
    entry.Nombre.toLowerCase().includes(q)
  );
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-results" style="display:block">No se encontraron series.</div>';
  } else {
    grid.innerHTML = filtered.map(entry => {
      const i = catalogoFlat.indexOf(entry);
      return cardHTMLFlat(entry, i);
    }).join('');
  }
}

function showCategoryOverlay(genero, titulo) {
  const overlay = document.getElementById('category-overlay');
  const titleEl = document.getElementById('category-overlay-title');
  const grid    = document.getElementById('category-grid');
  const noRes   = document.getElementById('category-no-results');
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('search-input').value = '';

  titleEl.textContent = titulo || genero;

  let filtered;
  if (genero === 'all') {
    filtered = [...catalogoFlat].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
  } else if (genero === 'novedades') {
    filtered = catalogoFlat.slice().reverse();
  } else if (genero === 'destacadas') {
    filtered = catalogoFlat.filter(e => e.destacada);
  } else {
    const g = genero.toLowerCase();
    filtered = catalogoFlat.filter(e =>
      (e.generos && e.generos.some(sg => sg.toLowerCase() === g)) ||
      (e.tag && e.tag.toLowerCase() === g)
    );
  }
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-results" style="display:block">No hay series en esta categoría.</div>';
  } else {
    grid.innerHTML = filtered.map(entry => {
      const i = catalogoFlat.indexOf(entry);
      return cardHTMLFlat(entry, i);
    }).join('');
  }

  overlay.classList.add('open');
  closeCatMenu();
}

function showAllSeries(e) {
  if (e) e.preventDefault();
  document.getElementById('category-overlay').classList.remove('open');
}

function filterCategory(e, value) {
  if (e) e.preventDefault();
  const labels = { all: 'Ver Todo (A–Z)', novedades: 'Novedades', destacadas: 'Destacadas' };
  showCategoryOverlay(value, labels[value] || value);
}

function toggleCatMenu(e) {
  if (e) e.stopPropagation();
  document.getElementById('cat-mega-menu').classList.toggle('open');
}

function closeCatMenu() {
  document.getElementById('cat-mega-menu').classList.remove('open');
}

function buildGenreGrid() {
  const genresSet = new Set();
  catalogoFlat.forEach(e => {
    e.generos.forEach(g => genresSet.add(g));
    genresSet.add(e.tag);
  });

  const genresGrid = document.getElementById('cat-genres-grid');
  if (!genresGrid) return;

  genresGrid.innerHTML = [...genresSet].sort().map(g => `
    <button class="cat-genre-btn" onclick="filterCategory(event,'${g.replace(/'/g,"\\'")}')">
      ${g}
    </button>`).join('');
}

function topListItemHTML(entry, i, rank) {
  const ref = entry._serieRef || entry;
  const tIdx = entry._temporadaIdx !== undefined ? entry._temporadaIdx : 0;
  const eps = getEpisodiosFromRef(ref, tIdx);
  const rankClass = rank <= 3 ? 'top-list-rank rank-top3' : 'top-list-rank';
  return `<div class="top-list-item" onclick="openModalFlat(catalogoFlat[${i}])">
  <div class="${rankClass}">${rank}</div>
  <img class="top-list-poster" src="${entry.portada}" alt="${entry.Nombre}" loading="lazy">
  <div class="top-list-info">
    <div class="top-list-name">${entry.Nombre}</div>
    <div class="top-list-meta">${eps.length} episodio${eps.length !== 1 ? 's' : ''}</div>
    <div class="top-list-tags">
      <span class="top-list-tag">${entry.tag}</span>
      ${entry.generos.slice(0,2).map(g => `<span class="top-list-tag">${g}</span>`).join('')}
    </div>
  </div>
  <div class="top-list-chevron">›</div>
</div>`;
}

function showTopVistosOverlay(e) {
  showVerTodo(e, 'top');
}

function closeTopOverlay() { closeVerTodo(); }

function showNewOverlay(e) {
  showVerTodo(e, 'new');
}

function closeNewOverlay() { closeVerTodo(); }

function showTopVistosOverlay_old() {}
function showVerTodo(e, tipo) {
  if (e) e.preventDefault();
  const page    = document.getElementById('ver-todo-page');
  const content = document.getElementById('ver-todo-content');
  const title   = document.getElementById('ver-todo-title');
  const mainHome = document.getElementById('main-home');

  if (tipo === 'top') {
    title.textContent = '🏆 Top Más Vistos';
    const topVistos = (typeof getTopVistos === 'function') ? getTopVistos() : catalogoFlat.slice(0, 10);
    content.innerHTML = '<div class="top-list">' + topVistos.map((entry, rank) => {
      const i = catalogoFlat.indexOf(entry);
      return topListItemHTML(entry, i, rank + 1);
    }).join('') + '</div>';
  } else {
    title.textContent = 'Nuevos Episodios';
    content.innerHTML = '<div class="grid grid-large">' +
      catalogoFlat.map((entry, i) => cardHTMLFlat(entry, i)).join('') + '</div>';
  }

  mainHome.style.display = 'none';
  document.querySelector('.hero').style.display = 'none';
  page.classList.add('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeVerTodo() {
  const page    = document.getElementById('ver-todo-page');
  const mainHome = document.getElementById('main-home');
  page.classList.remove('open');
  mainHome.style.display = '';
  document.querySelector('.hero').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateScrollArrows(wrap, row) {
  if (!wrap || !row) return;
  const scrolled = row.scrollLeft > 10;
  const atEnd    = row.scrollLeft + row.clientWidth >= row.scrollWidth - 10;
  wrap.classList.toggle('scrolled', scrolled);
  wrap.classList.toggle('at-end', atEnd);
}

function scrollRow(id, dir) {
  const el   = document.getElementById(id);
  const wrap = el ? el.closest('.scroll-wrap') : null;
  if (!el) return;
  const amount = el.clientWidth * 0.75;
  el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  setTimeout(() => updateScrollArrows(wrap, el), 350);
}

function initScrollWrap(rowId, wrapId, minItems) {
  const row  = document.getElementById(rowId);
  const wrap = document.getElementById(wrapId);
  if (!row || !wrap) return;
  const cards = row.querySelectorAll('.card');
  if (minItems && cards.length <= minItems) {
    wrap.querySelectorAll('.scroll-arrow').forEach(a => a.style.display = 'none');
    return;
  }

  updateScrollArrows(wrap, row);
  row.addEventListener('scroll', () => updateScrollArrows(wrap, row), { passive: true });
}

function goHome() {
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('category-overlay').classList.remove('open');
  document.getElementById('modal').classList.remove('open');
  closeVerTodo();
  document.getElementById('search-input').value = '';
  closeCatMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleProfileMenu(e) {
  if (e) e.stopPropagation();
  document.getElementById('profile-menu').classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  buildCatalogoFlat();

  if (!catalogoFlat || catalogoFlat.length === 0) {
    document.querySelectorAll('.grid, .row-scroll').forEach(el => {
      el.innerHTML = '<p style="color:var(--muted);padding:20px 0">No hay series en el catálogo aún.</p>';
    });
    return;
  }

  setupHero();
  buildGenreGrid();

  const topGrid     = document.getElementById('top-grid');
  const newGrid     = document.getElementById('new-grid');
  const topVistos = (typeof getTopVistos === 'function') ? getTopVistos() : catalogoFlat.slice(0, 8);
  topGrid.innerHTML = topVistos.map((e, rank) => {
    const i = catalogoFlat.indexOf(e);
    return cardHTMLTop(e, i, rank + 1);
  }).join('');
  renderContinueRow();
  newGrid.innerHTML = catalogoFlat.map((e, i) => cardHTMLFlat(e, i)).join('');

  initScrollWrap('top-grid',      'top-scroll-wrap',      0);
  initScrollWrap('new-grid',      'new-scroll-wrap',      0);
  initScrollWrap('continue-row',  'continue-scroll-wrap', 6);

  const searchInput = document.getElementById('search-input');

  searchInput.addEventListener('input', e => {
    const val = e.target.value;
    if (val.trim() === '') {
      document.getElementById('search-overlay').classList.remove('open');
    } else {
      renderSearch(val);
    }
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      document.getElementById('search-overlay').classList.remove('open');
      searchInput.blur();
    }
  });

  document.getElementById('search-overlay-close').addEventListener('click', () => {
    searchInput.value = '';
    document.getElementById('search-overlay').classList.remove('open');
  });

  document.getElementById('category-overlay-close').addEventListener('click', () => {
    document.getElementById('category-overlay').classList.remove('open');
  });

  document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('modal').classList.remove('open');
    currentSeries = null;
    closePlayer();
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('cat-mega-menu');
    const nav  = document.getElementById('nav-categorias');
    if (menu && nav && !nav.contains(e.target)) menu.classList.remove('open');

    const profileMenu = document.getElementById('profile-menu');
    const profileWrap = document.querySelector('.profile-wrap');
    if (profileMenu && profileWrap && !profileWrap.contains(e.target)) profileMenu.classList.remove('open');
  });
});
