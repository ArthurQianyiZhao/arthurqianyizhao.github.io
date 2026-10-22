(() => {
  'use strict';
  const canvas = document.getElementById('visitor-globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const place = document.getElementById('visitor-place');
  const motionButton = document.getElementById('globe-motion');
  const focusButton = document.getElementById('globe-focus');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rad = Math.PI / 180;
  const home = { lat: -37.81, lon: 144.96 };
  let visitor = null, dots = [], coasts = [], grid = [], arc = [];
  let yaw = 125 * rad, tilt = -18 * rad;
  let paused = reducedMotion.matches, visible = false, dragging = false;
  let width = 600, radius = 222, center = 300, animation = 0, previous = 0;
  let pointerX = 0, pointerY = 0, geoStarted = false;

  const point = (lon, lat) => {
    const a = lon * rad, b = lat * rad;
    return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
  };
  const project = (p) => {
    const x = p[0] * Math.cos(yaw) - p[2] * Math.sin(yaw);
    const z = p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
    const y = p[1] * Math.cos(tilt) - z * Math.sin(tilt);
    return [center + x * radius, center - y * radius, p[1] * Math.sin(tilt) + z * Math.cos(tilt)];
  };

  // The connecting arc links only this browser's approximate location to Melbourne.
  // There are no simulated visitor markers, totals, or stored IP addresses.
  function makeArc() {
    arc = [];
    if (!visitor) return;
    const a = point(home.lon, home.lat), b = point(visitor.lon, visitor.lat);
    const dot = Math.max(-1, Math.min(1, a.reduce((n, v, i) => n + v * b[i], 0)));
    const angle = Math.acos(dot), sine = Math.sin(angle);
    if (angle < 0.02 || Math.abs(sine) < 0.001) return;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const u = Math.sin((1 - t) * angle) / sine, v = Math.sin(t * angle) / sine;
      const lift = 1 + Math.sin(Math.PI * t) * 0.13;
      arc.push(a.map((n, k) => (n * u + b[k] * v) * lift));
    }
  }
  function strokeLine(points, color, thickness) {
    ctx.beginPath();
    let connected = false;
    for (const p of points) {
      const [x, y, z] = project(p);
      if (z <= 0) { connected = false; continue; }
      if (connected) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      connected = true;
    }
    ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.stroke();
  }
  function marker(location, color, t, name) {
    const [x, y, z] = project(point(location.lon, location.lat));
    if (z <= 0.03) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, z * 3);
    const pulse = paused || reducedMotion.matches ? 0.35 : (t % 2200) / 2200;
    ctx.beginPath(); ctx.arc(x, y, 5 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.globalAlpha *= (1 - pulse) * 0.65; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = Math.min(1, z * 3); ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    if (z > 0.25) {
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = '#e1ede1'; ctx.fillText(name, x + 10, y - 9);
    }
    ctx.restore();
  }
  function render(t = 0) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, width);
    const halo = ctx.createRadialGradient(center, center, radius * .8, center, center, radius * 1.2);
    halo.addColorStop(0, 'rgba(95,190,155,.10)'); halo.addColorStop(1, 'rgba(95,190,155,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, width, width);
    ctx.beginPath(); ctx.arc(center, center, radius * 1.11, 0, Math.PI * 2);
    ctx.strokeStyle = '#31554b'; ctx.lineWidth = .7; ctx.setLineDash([2, 7]); ctx.stroke(); ctx.setLineDash([]);
    const globe = ctx.createRadialGradient(center - radius * .45, center - radius * .5, 0, center, center, radius);
    globe.addColorStop(0, '#245247'); globe.addColorStop(.75, '#14392f'); globe.addColorStop(1, '#0b211e');
    ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = globe; ctx.fill(); ctx.strokeStyle = '#528372'; ctx.lineWidth = .8; ctx.stroke();
    for (const line of grid) strokeLine(line, '#71938325', .55);
    for (const ring of coasts) strokeLine(ring, '#91c8a756', .55);
    for (const p of dots) {
      const [x, y, z] = project(p);
      if (z <= 0) continue;
      ctx.fillStyle = `rgba(155,207,168,${.22 + z * .63})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(.6, radius / 175) * (.55 + .45 * z), 0, Math.PI * 2); ctx.fill();
    }
    if (arc.length) strokeLine(arc, '#dfbd7d', 1.1);
    marker(home, '#93e8bc', t, 'MELBOURNE');
    if (visitor) marker(visitor, '#efc779', t + 450, 'YOU');
  }
  function tick(t) {
    animation = 0;
    if (!visible || document.hidden) { previous = 0; return; }
    if (previous && t - previous < 32) { animation = requestAnimationFrame(tick); return; }
    const delta = previous ? Math.min(t - previous, 100) : 0;
    previous = t;
    if (!paused && !dragging) yaw += delta * 0.000055;
    render(t);
    if (!paused && !dragging) animation = requestAnimationFrame(tick);
  }
  function start() {
    if (!animation && visible && !document.hidden) { previous = 0; animation = requestAnimationFrame(tick); }
  }
  function syncMotion() {
    motionButton.textContent = paused ? 'Resume rotation' : 'Pause rotation';
    motionButton.setAttribute('aria-pressed', String(paused));
    start();
  }
  function resize() {
    width = Math.max(200, canvas.getBoundingClientRect().width);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(width * scale);
    ctx?.setTransform(scale, 0, 0, scale, 0, 0);
    center = width / 2; radius = width * .37; render();
  }

  for (let lat = -60; lat <= 60; lat += 30) {
    const line = []; for (let lon = -180; lon <= 180; lon += 3) line.push(point(lon, lat)); grid.push(line);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const line = []; for (let lat = -90; lat <= 90; lat += 3) line.push(point(lon, lat)); grid.push(line);
  }
  if (ctx) {
    new ResizeObserver(resize).observe(canvas);
    fetch('/assets/earth-land.json').then(r => { if (!r.ok) throw new Error('Map unavailable'); return r.json(); })
      .then(data => { dots = data.dots.map(p => point(p[0], p[1])); coasts = data.coasts.map(r => r.map(p => point(p[0], p[1]))); render(); })
      .catch(() => { canvas.setAttribute('aria-label', 'Earth outline. Geographic detail is temporarily unavailable.'); });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      dragging = true; pointerX = event.clientX; pointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!dragging) return;
      yaw -= (event.clientX - pointerX) * .008;
      tilt = Math.max(-1.3, Math.min(1.3, tilt + (event.clientY - pointerY) * .005));
      pointerX = event.clientX; pointerY = event.clientY; render();
    });
    const release = () => { dragging = false; start(); };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); paused = true;
      if (event.key === 'ArrowLeft') yaw -= .16;
      if (event.key === 'ArrowRight') yaw += .16;
      if (event.key === 'ArrowUp') tilt = Math.min(1.3, tilt + .1);
      if (event.key === 'ArrowDown') tilt = Math.max(-1.3, tilt - .1);
      render(); syncMotion();
    });
    motionButton.addEventListener('click', () => { paused = !paused; syncMotion(); });
    focusButton.addEventListener('click', () => {
      if (!visitor) return;
      yaw = visitor.lon * rad; tilt = visitor.lat * rad; paused = true; render(); syncMotion();
    });
    reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; syncMotion(); });
    document.addEventListener('visibilitychange', start);
    syncMotion();
  } else {
    canvas.hidden = true; motionButton.hidden = true; focusButton.hidden = true;
  }

  async function locate() {
    if (geoStarted) return;
    geoStarted = true;
    if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') {
      place.textContent = 'Location lookup disabled by your privacy preference.';
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Location unavailable');
      const data = await response.json();
      const lat = Number(data.latitude), lon = Number(data.longitude);
      if (data.latitude == null || data.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !data.country) throw new Error('No location');
      // Keep only rounded coordinates and a display label in page memory.
      visitor = { lat: Math.round(lat), lon: Math.round(lon) };
      place.textContent = [data.city, data.country].filter(Boolean).join(', ');
      document.getElementById('visitor-legend').hidden = false;
      focusButton.disabled = false;
      yaw = visitor.lon * rad; tilt = Math.max(-.7, Math.min(.7, visitor.lat * rad));
      makeArc(); render(); start();
    } catch (_) {
      place.textContent = 'Location unavailable — welcome, wherever you are.';
    } finally { clearTimeout(timeout); }
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { locate(); start(); }
  }, { rootMargin: '160px' }).observe(canvas.parentElement);

  const map = document.getElementById('visitor-map');
  const mapNote = document.getElementById('visitor-map-note');
  const retryMap = document.getElementById('visitor-map-retry');
  const mapCaption = mapNote.textContent;
  const mapSource = map.src;
  let mapAttempts = 0;
  let mapTimer;
  function loadMap() {
    clearTimeout(mapTimer);
    retryMap.hidden = true;
    mapNote.textContent = 'Loading visitor map…';
    map.src = mapSource + '?retry=' + Date.now();
  }
  function mapLoaded() {
    clearTimeout(mapTimer);
    map.hidden = false;
    retryMap.hidden = true;
    mapNote.textContent = mapCaption;
    mapAttempts = 0;
  }
  function mapFailed() {
    map.hidden = true;
    if (mapAttempts < 2) {
      mapAttempts += 1;
      mapNote.textContent = 'Reconnecting to the visitor map…';
      clearTimeout(mapTimer);
      mapTimer = setTimeout(loadMap, mapAttempts * 2000);
    } else {
      retryMap.hidden = false;
      mapNote.textContent = 'The external visitor map could not load. Your network or a content blocker may be preventing access to Flag Counter. Retry below or use View stats. The globe works independently.';
    }
  }
  map.addEventListener('load', mapLoaded);
  map.addEventListener('error', mapFailed);
  retryMap.addEventListener('click', () => { mapAttempts = 0; loadMap(); });
  window.addEventListener('online', () => { if (map.hidden) { mapAttempts = 0; loadMap(); } });
  // Handle cached results that completed before these listeners were registered.
  if (map.complete) {
    if (map.naturalWidth > 0) mapLoaded();
    else mapFailed();
  }
})();
