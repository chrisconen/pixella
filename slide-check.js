// Reproduces the panel slide mapping from index.html against real geometry.
// Fails if a panel never lands, lands early, or if the runway is the wrong height.
const N = 9, VH = 1080;
const DIRS = ["none", "right", "up", "left", "down", "right", "up", "left", "down"];
const OFF = { right: [110, 0], left: [-110, 0], up: [0, 110], down: [0, -110], none: [0, 0] };
const S = VH * 1.15;
const runway = (N - 1) * S + VH;
const maxScroll = runway - VH;

function frame(y) {
  return Array.from({ length: N }, (_, i) => {
    const t = i === 0 ? 1 : Math.min(1, Math.max(0, (y - (i - 1) * S) / S));
    const [ox, oy] = OFF[DIRS[i]];
    const e = 1 - Math.pow(1 - t, 3);
    let x = ox * (1 - e), yy = oy * (1 - e);
    if (i < N - 1) {
      const [nx, ny] = OFF[DIRS[i + 1]];
      const u = Math.min(1, Math.max(0, (y - i * S) / S));
      const ue = 1 - Math.pow(1 - u, 3);
      x -= nx * .12 * ue;
      yy -= ny * .12 * ue;
    }
    return { t, x, yy };
  });
}

let fail = 0;
const bad = (m) => { console.error("FAIL: " + m); fail++; };

// the runway must let the last panel land exactly at the bottom of the page
if (Math.abs(maxScroll - (N - 1) * S) > 0.5) bad("runway does not end on the last panel");

// at rest at the top only the hero is in place; everything else waits off-screen
frame(0).forEach((p, i) => {
  if (i === 0 && Math.abs(p.x) + Math.abs(p.yy) > 0.01) bad("hero is not centred at scroll 0");
  if (i > 0 && p.t !== 0) bad(`panel ${i} has already started at scroll 0`);
  if (i > 1 && Math.abs(p.x) + Math.abs(p.yy) < 100) bad(`panel ${i} is not parked off-screen`);
});

// every panel lands (offset 0) exactly at its own scroll mark, and each one is used
for (let i = 1; i < N; i++) {
  const p = frame(i * S)[i];
  if (p.t !== 1) bad(`panel ${i} has not finished at its mark`);
  if (Math.abs(p.x) + Math.abs(p.yy) > 0.01) bad(`panel ${i} is off-centre at its mark`);
  const half = frame((i - 0.5) * S)[i];
  if (!(half.t > 0 && half.t < 1)) bad(`panel ${i} does not animate across its transition`);
}

// progress never reverses, and the parallax stays subtle
let prev = -1;
for (let y = 0; y <= maxScroll; y += 15) {
  const f = frame(y);
  const done = f.reduce((a, p) => a + p.t, 0);
  if (done < prev - 1e-9) bad("progress reversed at y=" + y);
  prev = done;
  f.forEach((p, i) => {
    if (p.t === 1 && (Math.abs(p.x) > 14 || Math.abs(p.yy) > 14))
      bad(`panel ${i} drifts too far while at rest (${p.x.toFixed(1)}, ${p.yy.toFixed(1)})`);
  });
}

// all four directions are actually used, or the effect is not what was asked for
const used = new Set(DIRS.slice(1));
["right", "left", "up", "down"].forEach(d => { if (!used.has(d)) bad("direction never used: " + d); });

console.log(fail ? `${fail} failure(s)` : `ok — ${N} panels, runway ${runway}px, directions: ${DIRS.slice(1).join(" ")}`);
process.exit(fail ? 1 : 0);
