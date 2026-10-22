(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const waves = document.getElementById('wave-lines');
  for (let line = 0; line < 42; line++) {
    const path = document.createElementNS(ns, 'path');
    const points = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240 * Math.PI * 2;
      const phase = line / 42 * Math.PI * 2;
      const radius = 145 + 36 * Math.cos(t * 3 + phase);
      const x = 280 + radius * Math.cos(t) + 30 * Math.cos(phase);
      const y = 270 + radius * Math.sin(t) * 1.06 + 28 * Math.sin(phase);
      points.push((i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2));
    }
    path.setAttribute('d', points.join(' ') + 'Z');
    path.setAttribute('stroke-width', '.65');
    path.setAttribute('opacity', '.48');
    waves.appendChild(path);
  }
  const constellation = document.getElementById('constellation');
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let n = 0; n < 20; n++) {
        const a = n * 2.39996 + x + y;
        const r = Math.sqrt(n) * 2.1;
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', (120 + x * 60 + Math.cos(a) * r).toFixed(2));
        dot.setAttribute('cy', (40 + y * 53 + Math.sin(a) * r).toFixed(2));
        dot.setAttribute('r', n === 0 ? '2.1' : '1.15');
        dot.setAttribute('fill', '#b9dfaa');
        dot.setAttribute('opacity', n === 0 ? '1' : '.45');
        constellation.appendChild(dot);
      }
    }
  }
  document.getElementById('year').textContent = new Date().getFullYear();
  // Keep links shared from the previous homepage working.
  const legacyAnchors = {'honors--awards':'experience','honors-and-awards':'experience','news':'publications','experiences':'experience','research-experiences':'research','educations':'experience'};
  const oldId = location.hash.slice(1);
  if (legacyAnchors[oldId]) document.getElementById(legacyAnchors[oldId]).scrollIntoView();
})();
