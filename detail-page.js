let _detailSeries       = null;
let _detailTemporadaIdx = 0;
let _detailSortAsc      = true;

function _detailGetEps(s, tIdx) {
  return getEpisodiosFromRef(s, tIdx);
}

function openDetailPage(entry, resume) {
  const s    = entry._serieRef || entry;
  const tIdx = entry._temporadaIdx !== undefined ? entry._temporadaIdx : 0;

  _detailSeries       = s;
  _detailTemporadaIdx = tIdx;
  _detailSortAsc      = true;

  document.getElementById('main-home').style.display   = 'none';
  document.querySelector('.hero').style.display        = 'none';
  document.getElementById('ver-todo-page').classList.remove('open');
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('category-overlay').classList.remove('open');
  document.getElementById('modal').classList.remove('open');

  _detailRenderHero(s, tIdx);
  _detailRenderSeasonHeader(s, tIdx);
  _detailRenderEpGrid(s, tIdx);

  const pw = document.getElementById('detail-player-wrap');
  pw.classList.remove('open');
  document.getElementById('detail-player-area').innerHTML = '';

  const page = document.getElementById('detail-page');
  page.classList.add('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const savedInfo    = watchedEpisodes[s.Nombre] && watchedEpisodes[s.Nombre][tIdx];
  const shouldResume = resume && savedInfo && savedInfo.epIdx !== undefined;
  if (shouldResume) {
    setTimeout(() => {
      _detailOpenPlayer(savedInfo.epIdx, true, savedInfo.currentTime || 0);
    }, 150);
  }
}

function _detailRenderHero(s, tIdx) {
  const eps = _detailGetEps(s, tIdx);

  document.getElementById('detail-hero-bg').src = s.portada || '';

  const ratingEl = document.querySelector('.detail-rating');
  if (ratingEl) ratingEl.style.display = 'none';

  document.getElementById('detail-title-el').textContent = s.Nombre;

  const generosHTML = (s.generos || []).map((g, i, arr) =>
    `<span class="genre-link" onclick="filterCategory(event,'${g.replace(/'/g,"\\'")}')">${g}</span>${i < arr.length - 1 ? ', ' : ''}`
  ).join('');

  document.getElementById('detail-meta-row').innerHTML = `
    <span>${s.tag || 'Serie'}</span>
    <span class="dot">◆</span>
    ${generosHTML}
  `;

  const descEl    = document.getElementById('detail-desc-el');
  const descFull  = s.descripcion || '';
  const wordCount = descFull.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 40) {
    let corte = 240;
    while (corte < descFull.length && descFull[corte] !== ' ') corte++;
    const descShort = descFull.slice(0, corte).trimEnd() + '...';
    descEl.innerHTML =
      '<span class="desc-short">' + descShort + ' <a class="mas-detalles" href="#" onclick="_detailToggleDesc(event)">MAS DETALLES</a></span>' +
      '<span class="desc-full" style="display:none">' + descFull + ' <a class="mas-detalles" href="#" onclick="_detailToggleDesc(event)">MENOS</a></span>';
  } else {
    descEl.innerHTML = descFull;
  }

  const langRow = document.querySelector('.detail-lang-row');
  if (langRow) langRow.style.display = 'none';

  const playBtn = document.getElementById('detail-hero-play-btn');
  if (eps.length > 0) {
    playBtn.style.display = '';
    playBtn.onclick = () => _detailOpenPlayer(0, true);
    playBtn.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
      COMENZAR A VER E1`;
  } else {
    playBtn.style.display = 'none';
  }
}

function _detailRenderSeasonHeader(s, tIdx) {
  const label = document.getElementById('detail-season-label');
  if (s.temporadas && s.temporadas.length > 1) {
    label.textContent = s.temporadas[tIdx]
      ? (s.temporadas[tIdx].nombre || `Temporada ${tIdx + 1}`)
      : `Temporada ${tIdx + 1}`;
  } else {
    label.textContent = 'Temporada 1';
  }

  const tabsWrap = document.getElementById('detail-season-tabs');
  if (s.temporadas && s.temporadas.length > 1) {
    tabsWrap.innerHTML = s.temporadas.map((t, i) =>
      `<button class="detail-season-tab${i === tIdx ? ' active' : ''}"
         onclick="_detailSwitchSeason(${i})">
         ${t.nombre || ('Temporada ' + (i + 1))}
       </button>`
    ).join('');
  } else {
    tabsWrap.innerHTML = `<button class="detail-season-tab active">Temporada 1</button>`;
  }
}

function _detailSwitchSeason(idx) {
  _detailTemporadaIdx = idx;
  _detailRenderSeasonHeader(_detailSeries, idx);
  _detailRenderEpGrid(_detailSeries, idx);
  const pw = document.getElementById('detail-player-wrap');
  if (pw.classList.contains('open')) {
    pw.classList.remove('open');
    document.getElementById('detail-player-area').innerHTML = '';
    const heroEl = document.querySelector('.detail-hero');
    if (heroEl) heroEl.style.display = '';
    closePlayer();
  }
}

function _detailRenderEpGrid(s, tIdx) {
  const eps    = _detailGetEps(s, tIdx);
  const sorted = _detailSortAsc ? [...eps] : [...eps].reverse();
  const grid   = document.getElementById('detail-ep-grid');
  const sName  = s.Nombre;

  if (eps.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);padding:20px 0;font-size:.85rem">No hay episodios disponibles.</p>';
    return;
  }

  grid.innerHTML = sorted.map((ep, sortedIdx) => {
    const realIdx = _detailSortAsc ? sortedIdx : (eps.length - 1 - sortedIdx);
    const hasDuration = ep.duracion && ep.duracion > 0;
    const durationBadge = hasDuration
      ? `<div class="detail-ep-duration" id="detail-ep-dur-${realIdx}">${_fmtDuration(ep.duracion)}</div>`
      : `<div class="detail-ep-duration" id="detail-ep-dur-${realIdx}" style="display:none"></div>`;
    return `
      <div class="detail-ep-card" id="detail-ep-card-${realIdx}" onclick="_detailOpenPlayer(${realIdx}, true)">
        <div class="detail-ep-thumb">
          <div class="detail-ep-spinner" id="detail-ep-spinner-${realIdx}">
            <div class="detail-ep-spinner-ring"></div>
          </div>
          <img id="detail-ep-img-${realIdx}"
               style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
               src="" alt="Ep ${realIdx + 1}">
          ${durationBadge}
          <div class="detail-ep-play-overlay">
            <svg width="36" height="36" fill="white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <div class="detail-ep-series-name">${sName.toUpperCase()}</div>
        <div class="detail-ep-title">E${realIdx + 1} – ${ep.titulo}</div>
        <div class="detail-ep-sub">
          <button class="three-dots" onclick="event.stopPropagation()">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  const _thumbObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card    = entry.target;
      const realIdx = parseInt(card.dataset.epIdx, 10);
      const ep      = eps[realIdx];
      if (!ep) return;
      obs.unobserve(card);
      const imgEl     = document.getElementById(`detail-ep-img-${realIdx}`);
      const spinnerEl = document.getElementById(`detail-ep-spinner-${realIdx}`);
      if (!imgEl) return;
      if (ep.portada) {
        imgEl.onload  = () => { imgEl.style.display = 'block'; if (spinnerEl) spinnerEl.remove(); };
        imgEl.onerror = () => { if (spinnerEl) spinnerEl.remove(); };
        imgEl.src     = ep.portada;
        if (imgEl.complete && imgEl.naturalWidth) {
          imgEl.style.display = 'block';
          if (spinnerEl) spinnerEl.remove();
        }
      } else {
        generateThumbnail(ep.url, imgEl, spinnerEl);
      }
    });
  }, { rootMargin: '200px 0px', threshold: 0 });

  eps.forEach((ep, realIdx) => {
    _detailSetAudioBadge(realIdx);
  });

  eps.forEach((ep, realIdx) => {
    const card = document.getElementById(`detail-ep-card-${realIdx}`);
    if (card) {
      card.dataset.epIdx = realIdx;
      _thumbObserver.observe(card);
    }
  });

  eps.forEach((ep, realIdx) => {
    if (!ep.url) return;
    if (ep.duracion && ep.duracion > 0) return;
    _detailLoadDuration(ep, realIdx);
  });
}

function _fmtDuration(secs) {
  if (!secs || secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60) || 1;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function _detailLoadDuration(ep, realIdx) {
  const badge = document.getElementById(`detail-ep-dur-${realIdx}`);
  if (!badge) return;

  const vid = document.createElement('video');
  vid.preload = 'metadata';
  vid.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(vid);

  const cleanup = () => { try { document.body.removeChild(vid); } catch(e) {} };

  vid.addEventListener('loadedmetadata', () => {
    const dur = vid.duration;
    cleanup();
    if (dur && isFinite(dur) && dur > 0) {
      ep.duracion = dur;
      badge.textContent = _fmtDuration(dur);
      badge.style.display = '';
    }
  }, { once: true });

  vid.addEventListener('error', cleanup, { once: true });
  setTimeout(cleanup, 15000);

  vid.src = ep.url;
}

function _detailToggleSortMenu() {
  document.getElementById('detail-sort-menu').classList.toggle('open');
}

function _detailSetSort(asc) {
  _detailSortAsc = asc;
  document.getElementById('detail-sort-label').textContent = asc ? 'LO MÁS ANTIGUO' : 'LO MÁS RECIENTE';
  document.getElementById('detail-sort-menu').classList.remove('open');
  document.querySelectorAll('.detail-sort-opt').forEach(o => {
    o.classList.toggle('active', o.dataset.sort === (asc ? 'asc' : 'desc'));
  });
  _detailRenderEpGrid(_detailSeries, _detailTemporadaIdx);
}

function _detailOpenPlayer(epIdx, autoplay, resumeTime) {
  const s    = _detailSeries;
  const tIdx = _detailTemporadaIdx;
  const eps  = _detailGetEps(s, tIdx);
  const ep   = eps[epIdx];
  if (!ep) return;

  currentSeries              = s;
  currentTemporadaIdx        = tIdx;
  playerState.series         = s;
  playerState.currentEpIndex = epIdx;

  const heroEl = document.querySelector('.detail-hero');
  if (heroEl) heroEl.style.display = 'none';

  const pw = document.getElementById('detail-player-wrap');
  pw.classList.add('open');
  const detailArea = document.getElementById('detail-player-area');
  detailArea.innerHTML = '';

  const realModalArea = document.getElementById('modal-player-area');
  const hiddenId = '_modal-player-area-hidden';
  if (realModalArea) realModalArea.id = hiddenId;
  detailArea.id = 'modal-player-area';

  buildCustomPlayer(ep.url, epIdx, autoplay !== false);

  detailArea.id = 'detail-player-area';
  if (realModalArea) realModalArea.id = 'modal-player-area';

  if (resumeTime && resumeTime > 0) {
    const checkInterval = setInterval(() => {
      const vid = document.getElementById('sakura-video');
      if (vid && vid.readyState >= 1) {
        vid.currentTime = resumeTime;
        clearInterval(checkInterval);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 6000);
  }

  document.querySelectorAll('.detail-ep-card').forEach(c => c.classList.remove('ep-playing'));
  const activeCard = document.getElementById(`detail-ep-card-${epIdx}`);
  if (activeCard) activeCard.classList.add('ep-playing');

  pw.scrollIntoView({ behavior: 'smooth', block: 'start' });

  markWatched(s.Nombre, tIdx, epIdx, 0, 0);
}

function closeDetailPage() {
  const vid = document.getElementById('sakura-video');
  if (vid) { vid.pause(); vid.src = ''; }
  const frame = document.getElementById('sakura-embed-frame');
  if (frame) { frame.src = 'about:blank'; frame.remove(); }

  document.getElementById('detail-page').classList.remove('open');
  document.getElementById('detail-player-wrap').classList.remove('open');
  document.getElementById('detail-player-area').innerHTML = '';

  const heroEl = document.querySelector('.detail-hero');
  if (heroEl) heroEl.style.display = '';

  document.getElementById('main-home').style.display = '';
  document.querySelector('.hero').style.display      = '';
  _detailSeries = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.openModalFlat = function(entry, resume) {
  openDetailPage(entry, !!resume);
};
window.openModal = function(s) {
  openDetailPage({ _serieRef: s, _temporadaIdx: 0 }, false);
};

const _origGoHome = window.goHome;
window.goHome = function() {
  if (document.getElementById('detail-page').classList.contains('open')) {
    closeDetailPage();
  }
  if (_origGoHome) _origGoHome();
};

const _origSwitchEpisode = window.switchEpisode;
window.switchEpisode = function(idx, autoplay, epsArr) {
  if (_detailSeries && document.getElementById('detail-page').classList.contains('open')) {
    const pipWasActive = !!document.pictureInPictureElement;
    if (pipWasActive) {
      document.exitPictureInPicture().catch(() => {}).finally(() => {
        _detailOpenPlayer(idx, autoplay !== false);
        _detailReenterPip();
      });
    } else {
      _detailOpenPlayer(idx, autoplay !== false);
    }
    return;
  }
  if (_origSwitchEpisode) _origSwitchEpisode(idx, autoplay, epsArr);
};

function _detailReenterPip() {
  const MAX_WAIT = 5000;
  const INTERVAL = 150;
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed += INTERVAL;
    const vid = document.getElementById('sakura-video');
    if (vid && document.pictureInPictureEnabled && !vid.disablePictureInPicture) {
      clearInterval(timer);
      const tryPip = () => { vid.requestPictureInPicture().catch(() => {}); };
      if (vid.readyState >= 1) { tryPip(); }
      else { vid.addEventListener('loadedmetadata', tryPip, { once: true }); }
      return;
    }
    if (elapsed >= MAX_WAIT) clearInterval(timer);
  }, INTERVAL);
}

const _origClosePlayer = window.closePlayer;
window.closePlayer = function() {
  const vid = document.getElementById('sakura-video');
  if (vid) { vid.pause(); _sakuraDestroyPlayer(vid); vid.src = ''; }
  const frame = document.getElementById('sakura-embed-frame');
  if (frame) { frame.src = 'about:blank'; frame.remove(); }
  if (document.getElementById('modal').classList.contains('open') && currentSeries) {
    const playerArea = document.getElementById('modal-player-area');
    if (playerArea) {
      const eps = getEpisodios(currentSeries, 0);
      if (eps.length > 0) {
        showMainThumbnail(eps[0], playerArea, () => { playEpisode(eps[0], null); });
      }
    }
  }
};

function _detailToggleDesc(e) {
  e.preventDefault();
  const descEl = document.getElementById('detail-desc-el');
  if (!descEl) return;
  const shortEl = descEl.querySelector('.desc-short');
  const fullEl  = descEl.querySelector('.desc-full');
  if (!shortEl || !fullEl) return;
  const showingShort = shortEl.style.display !== 'none';
  shortEl.style.display = showingShort ? 'none' : '';
  fullEl.style.display  = showingShort ? ''     : 'none';
}

const _AUDIO_KEY = 'sakura_audio_v1';

function _audioStorage() {
  try { return JSON.parse(localStorage.getItem(_AUDIO_KEY) || '{}'); } catch(e) { return {}; }
}
function _audioSave(store) {
  try { localStorage.setItem(_AUDIO_KEY, JSON.stringify(store)); } catch(e) {}
}
function _audioKeyFor(epIdx) {
  const s    = _detailSeries;
  const tIdx = _detailTemporadaIdx;
  if (!s) return null;
  return `${s.Nombre}|${tIdx}|${epIdx}`;
}
function _detailGetAudio(epIdx) {
  const key   = _audioKeyFor(epIdx);
  if (!key) return 'sub';
  const store = _audioStorage();
  return store[key] || 'sub';
}
function _detailSetAudioBadge(epIdx) {
  const badge = document.getElementById(`detail-ep-audio-${epIdx}`);
  if (!badge) return;
  const val = _detailGetAudio(epIdx);
  if (val === 'dob') {
    badge.textContent = 'Doblado';
    badge.style.color = '#f4a261';
  } else {
    badge.textContent = 'Subtitulado';
    badge.style.color = '';
  }
}
function _detailToggleAudio(epIdx) {
  const key   = _audioKeyFor(epIdx);
  if (!key) return;
  const store = _audioStorage();
  store[key]  = (store[key] === 'dob') ? 'sub' : 'dob';
  _audioSave(store);
  _detailSetAudioBadge(epIdx);
}

document.addEventListener('click', e => {
  const btn  = document.getElementById('detail-sort-btn');
  const menu = document.getElementById('detail-sort-menu');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('open');
  }
});
