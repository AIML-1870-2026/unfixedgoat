// Creates Web Workers from an inline blob so we stay single-origin / no extra files needed

const workerCode = `
self.onmessage = function(e) {
  const { width, startY, endY, totalHeight, centerX, centerY, scale, cReal, cImag, maxIter, palette, id } = e.data;

  const rows = endY - startY;
  const buf = new Uint8ClampedArray(width * rows * 4);

  for (let py = startY; py < endY; py++) {
    for (let px = 0; px < width; px++) {
      let zr = centerX + (px - width / 2) * scale;
      let zi = centerY + (py - totalHeight / 2) * scale;

      let iter = 0;
      let zr2 = zr * zr;
      let zi2 = zi * zi;

      while (zr2 + zi2 <= 4 && iter < maxIter) {
        zi = 2 * zr * zi + cImag;
        zr = zr2 - zi2 + cReal;
        zr2 = zr * zr;
        zi2 = zi * zi;
        iter++;
      }

      const idx = ((py - startY) * width + px) * 4;

      if (iter === maxIter) {
        buf[idx] = 5;
        buf[idx + 1] = 5;
        buf[idx + 2] = 15;
        buf[idx + 3] = 255;
      } else {
        // Smooth coloring with modular cycling for visible bands at all zoom levels
        const smooth = iter + 1 - Math.log2(Math.log2(zr2 + zi2));
        const t = smooth / 25; // cycle every ~25 iterations for vivid color bands
        const colors = getColor(t, palette);
        buf[idx] = colors[0];
        buf[idx + 1] = colors[1];
        buf[idx + 2] = colors[2];
        buf[idx + 3] = 255;
      }
    }
  }

  self.postMessage({ buf, width, startY, endY, rows, id }, [buf.buffer]);
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getColor(t, palette) {
  const stops = PALETTES[palette] || PALETTES.neonNights;
  const len = stops.length;
  // t is already smooth iteration / 25, use fractional part to cycle
  const wrapped = ((t % 1) + 1) % 1; // ensure 0..1
  const pos = wrapped * len;
  const idx = Math.floor(pos);
  const frac = pos - idx;
  const c0 = stops[idx % len];
  const c1 = stops[(idx + 1) % len];
  return [
    Math.floor(lerp(c0[0], c1[0], frac)),
    Math.floor(lerp(c0[1], c1[1], frac)),
    Math.floor(lerp(c0[2], c1[2], frac))
  ];
}

const PALETTES = {
  neonNights: [
    [255, 45, 149],   // pink
    [180, 30, 220],   // purple-pink
    [0, 240, 255],    // cyan
    [20, 20, 80],     // dark
    [176, 38, 255],   // purple
    [255, 100, 200],  // light pink
  ],
  sunsetBoulevard: [
    [255, 45, 100],   // hot pink
    [255, 107, 43],   // orange
    [255, 200, 50],   // golden
    [180, 40, 20],    // dark red
    [255, 150, 0],    // amber
    [255, 60, 120],   // magenta
  ],
  electricGrid: [
    [0, 100, 255],    // blue
    [0, 220, 220],    // teal
    [200, 240, 255],  // white-blue
    [10, 20, 80],     // dark blue
    [0, 180, 255],    // sky
    [100, 255, 220],  // mint
  ],
};
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerURL = URL.createObjectURL(blob);
window.__fractalWorkerURL = workerURL;
