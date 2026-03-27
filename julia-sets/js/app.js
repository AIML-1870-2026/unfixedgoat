/* ======================================
   Julia Set Explorer - Application Logic
   ====================================== */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    cReal: -0.75,
    cImag: 0.11,
    maxIter: 200,
    palette: 'neonNights',
    centerX: 0,
    centerY: 0,
    zoom: 1,
    baseScale: 3.5,

    ambientActive: false,
    ambientSpeed: 1,
    ambientAngle: 0,
    djMode: false,

    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCenterX: 0,
    dragCenterY: 0,

    renderID: 0,
    lowRes: false,
  };

  // ---- DOM Elements ----
  const canvas = document.getElementById('fractal-canvas');
  const ctx = canvas.getContext('2d');
  const gridCanvas = document.getElementById('grid-bg');
  const gridCtx = gridCanvas.getContext('2d');

  const sliderReal = document.getElementById('slider-real');
  const sliderImag = document.getElementById('slider-imag');
  const sliderIter = document.getElementById('slider-iter');
  const sliderSpeed = document.getElementById('slider-speed');
  const valReal = document.getElementById('val-real');
  const valImag = document.getElementById('val-imag');
  const valIter = document.getElementById('val-iter');

  const hudC = document.getElementById('hud-c');
  const hudZoom = document.getElementById('hud-zoom');
  const hudIter = document.getElementById('hud-iter');

  const infoC = document.getElementById('info-c');
  const infoZoom = document.getElementById('info-zoom');
  const infoCenter = document.getElementById('info-center');
  const infoIter = document.getElementById('info-iter');
  const infoClassification = document.getElementById('info-classification');
  const infoNamed = document.getElementById('info-named');

  const drawerToggle = document.getElementById('drawer-toggle');
  const controlsDrawer = document.getElementById('controls-drawer');
  const infoToggle = document.getElementById('info-toggle');
  const infoPanel = document.getElementById('info-panel');

  const btnAmbient = document.getElementById('btn-ambient');
  const btnDJ = document.getElementById('btn-dj');
  const btnReset = document.getElementById('btn-reset');

  const mandelbrotMinimap = document.getElementById('mandelbrot-minimap');
  const mandelbrotCanvas = document.getElementById('mandelbrot-canvas');
  const mandelbrotCtx = mandelbrotCanvas.getContext('2d');
  const minimapCrosshair = document.getElementById('minimap-crosshair');

  // ---- Multi-Worker Pool ----
  const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 8);
  const workers = [];
  let pendingChunks = 0;
  let currentRenderID = 0;
  let renderImageData = null;

  for (let i = 0; i < NUM_WORKERS; i++) {
    const w = new Worker(window.__fractalWorkerURL);
    w.onmessage = onWorkerDone;
    workers.push(w);
  }

  function onWorkerDone(e) {
    const { buf, width, startY, rows, id } = e.data;
    if (id !== currentRenderID) return; // stale

    // Draw this strip immediately (progressive rendering)
    const stripData = new ImageData(new Uint8ClampedArray(buf), width, rows);

    if (state.lowRes) {
      // For low-res, accumulate into renderImageData then draw scaled when all done
      if (renderImageData && renderImageData.width === width) {
        const dest = renderImageData.data;
        const offset = startY * width * 4;
        for (let i = 0; i < buf.length; i++) {
          dest[offset + i] = buf[i];
        }
      }
      pendingChunks--;
      if (pendingChunks === 0 && renderImageData) {
        const offscreen = document.createElement('canvas');
        offscreen.width = renderImageData.width;
        offscreen.height = renderImageData.height;
        offscreen.getContext('2d').putImageData(renderImageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // For full-res, draw each strip as it arrives
      ctx.putImageData(stripData, 0, startY);
      pendingChunks--;
    }
  }

  // ---- Render ----
  function render(lowRes) {
    state.lowRes = !!lowRes;
    const factor = lowRes ? 0.25 : 1;
    const w = Math.floor(canvas.width * factor);
    const h = Math.floor(canvas.height * factor);
    const scale = (state.baseScale / state.zoom) / w;

    currentRenderID++;
    const id = currentRenderID;

    renderImageData = ctx.createImageData(w, h);

    // Split into horizontal strips, one per worker
    const stripHeight = Math.ceil(h / NUM_WORKERS);
    pendingChunks = 0;

    for (let i = 0; i < NUM_WORKERS; i++) {
      const startY = i * stripHeight;
      const endY = Math.min(startY + stripHeight, h);
      if (startY >= h) break;

      pendingChunks++;
      workers[i].postMessage({
        width: w,
        startY,
        endY,
        totalHeight: h,
        centerX: state.centerX,
        centerY: state.centerY,
        scale,
        cReal: state.cReal,
        cImag: state.cImag,
        maxIter: state.maxIter,
        palette: state.palette,
        id,
      });
    }
  }

  let fullResTimer = null;

  function renderInteractive() {
    render(true);
    clearTimeout(fullResTimer);
    fullResTimer = setTimeout(() => render(false), 200);
  }

  function renderFull() {
    render(false);
  }

  // ---- Resize ----
  function resizeCanvas() {
    // Don't multiply by DPR - keeps pixel count manageable for computation
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;
    drawGrid();
    renderFull();
  }

  // ---- Background Grid ----
  function drawGrid() {
    const w = gridCanvas.width;
    const h = gridCanvas.height;
    gridCtx.clearRect(0, 0, w, h);

    const horizon = h * 0.55;
    const vanishX = w / 2;

    gridCtx.strokeStyle = 'rgba(176, 38, 255, 0.12)';
    gridCtx.lineWidth = 1;

    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const y = horizon + (h - horizon) * Math.pow(t, 1.5);
      gridCtx.beginPath();
      gridCtx.moveTo(0, y);
      gridCtx.lineTo(w, y);
      gridCtx.stroke();
    }

    for (let i = -20; i <= 20; i++) {
      const spread = (i / 20) * w * 1.5;
      gridCtx.beginPath();
      gridCtx.moveTo(vanishX, horizon);
      gridCtx.lineTo(vanishX + spread, h);
      gridCtx.stroke();
    }

    gridCtx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    gridCtx.lineWidth = 2;
    gridCtx.beginPath();
    gridCtx.moveTo(0, horizon);
    gridCtx.lineTo(w, horizon);
    gridCtx.stroke();
  }

  // ---- UI Updates ----
  function updateUI() {
    const cr = state.cReal.toFixed(3);
    const sign = state.cImag >= 0 ? '+' : '-';
    const cStr = `${cr} ${sign} ${Math.abs(state.cImag).toFixed(3)}i`;

    hudC.textContent = cStr;
    hudZoom.textContent = state.zoom.toFixed(2) + 'x';
    hudIter.textContent = state.maxIter;

    infoC.textContent = cStr;
    infoZoom.textContent = state.zoom.toFixed(2) + 'x';
    infoCenter.textContent = `${state.centerX.toFixed(3)} + ${state.centerY.toFixed(3)}i`;
    infoIter.textContent = state.maxIter;

    valReal.textContent = state.cReal.toFixed(3);
    valImag.textContent = state.cImag.toFixed(3);
    valIter.textContent = state.maxIter;

    updateClassification();
    updateNamedSet();
  }

  function updateClassification() {
    const result = isInMandelbrot(state.cReal, state.cImag, 200);
    if (result === 'inside') {
      infoClassification.textContent = 'Connected Julia Set \u2014 c is inside the Mandelbrot set.';
    } else if (result === 'boundary') {
      infoClassification.textContent = 'Near the boundary \u2014 highly intricate fractal structure (dendrite or near-connected).';
    } else {
      infoClassification.textContent = 'Disconnected (Fatou Dust) \u2014 c is outside the Mandelbrot set.';
    }
  }

  function isInMandelbrot(cr, ci, maxIter) {
    let zr = 0, zi = 0;
    for (let i = 0; i < maxIter; i++) {
      const zr2 = zr * zr;
      const zi2 = zi * zi;
      if (zr2 + zi2 > 4) {
        return i > maxIter * 0.6 ? 'boundary' : 'outside';
      }
      zi = 2 * zr * zi + ci;
      zr = zr2 - zi2 + cr;
    }
    return 'inside';
  }

  const NAMED_SETS = [
    { name: 'Dendrite', real: 0, imag: 1, desc: 'Tree-like branching structure. A classic Julia set at c = i.' },
    { name: 'Spiral', real: -0.75, imag: 0.11, desc: 'Beautiful spiral arm patterns emerging from the main body.' },
    { name: 'Douady Rabbit', real: -0.123, imag: 0.745, desc: 'Three-lobed "rabbit" shape named after mathematician Adrien Douady.' },
    { name: 'San Marco', real: -0.75, imag: 0, desc: 'Cathedral-like bilateral symmetry resembling the Basilica di San Marco.' },
    { name: 'Dragons', real: -0.8, imag: 0.156, desc: 'Dragon curve-like patterns swirling through the plane.' },
    { name: 'Starfish', real: -0.4, imag: 0.6, desc: 'Five-armed starfish pattern with delicate tentacle detail.' },
    { name: 'Lightning', real: -1.25, imag: 0, desc: 'Electric bolt patterns \u2014 a dendrite near the tip of the Mandelbrot set.' },
  ];

  function updateNamedSet() {
    for (const s of NAMED_SETS) {
      if (Math.hypot(state.cReal - s.real, state.cImag - s.imag) < 0.02) {
        infoNamed.innerHTML = `<strong>${s.name}</strong> \u2014 ${s.desc}`;
        return;
      }
    }
    infoNamed.textContent = 'Not near a named preset. Explore freely!';
  }

  // ---- Slider Events ----
  function onSliderInput() {
    state.cReal = parseFloat(sliderReal.value);
    state.cImag = parseFloat(sliderImag.value);
    state.maxIter = parseInt(sliderIter.value, 10);
    updateUI();
    renderInteractive();
  }

  sliderReal.addEventListener('input', onSliderInput);
  sliderImag.addEventListener('input', onSliderInput);
  sliderIter.addEventListener('input', onSliderInput);
  sliderSpeed.addEventListener('input', function () {
    state.ambientSpeed = parseFloat(this.value);
  });

  // ---- Preset Buttons ----
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cReal = parseFloat(btn.dataset.real);
      state.cImag = parseFloat(btn.dataset.imag);
      sliderReal.value = state.cReal;
      sliderImag.value = state.cImag;
      state.ambientActive = false;
      btnAmbient.classList.remove('active');
      updateUI();
      renderInteractive();
    });
  });

  // ---- Palette Buttons ----
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.palette = btn.dataset.palette;
      renderFull();
    });
  });

  // ---- Drawer Toggle ----
  let drawerOpen = false;
  drawerToggle.addEventListener('click', () => {
    drawerOpen = !drawerOpen;
    controlsDrawer.classList.toggle('open', drawerOpen);
    drawerToggle.classList.toggle('open', drawerOpen);
    drawerToggle.innerHTML = drawerOpen ? '&#x25BC; CONTROLS' : '&#x25B2; CONTROLS';
    drawerToggle.style.bottom = drawerOpen ? controlsDrawer.offsetHeight + 'px' : '0';
  });

  // ---- Info Panel Toggle ----
  let infoPanelOpen = false;
  infoToggle.addEventListener('click', () => {
    infoPanelOpen = !infoPanelOpen;
    infoPanel.classList.toggle('open', infoPanelOpen);
  });

  // ---- Smooth Zoom ----
  let zoomSettleTimer = null;
  let zoomAccum = 1;
  let zoomFixedOriginX = 0;
  let zoomFixedOriginY = 0;
  let zoomStarted = false;

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    // Lock the CSS transform origin to the cursor position at the START of
    // a zoom gesture. Use clientX/Y directly (viewport coords = CSS coords
    // since canvas is position:fixed at 0,0 filling the viewport).
    const mx = e.clientX;
    const my = e.clientY;

    if (!zoomStarted) {
      zoomStarted = true;
      zoomAccum = 1;
      zoomFixedOriginX = mx;
      zoomFixedOriginY = my;
      canvas.style.transformOrigin = `${mx}px ${my}px`;
    }

    // Update logical state using the fixed origin (untransformed coords)
    const scale = (state.baseScale / state.zoom) / canvas.width;
    const wx = state.centerX + (zoomFixedOriginX - canvas.width / 2) * scale;
    const wy = state.centerY + (zoomFixedOriginY - canvas.height / 2) * scale;

    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    state.zoom = Math.max(0.5, Math.min(state.zoom * factor, 1e8));

    const newScale = (state.baseScale / state.zoom) / canvas.width;
    state.centerX = wx - (zoomFixedOriginX - canvas.width / 2) * newScale;
    state.centerY = wy - (zoomFixedOriginY - canvas.height / 2) * newScale;

    // Accumulate CSS scale for instant visual feedback
    zoomAccum *= factor;
    canvas.style.transform = `scale(${zoomAccum})`;

    updateUI();

    // Debounce: re-render when scrolling stops
    clearTimeout(zoomSettleTimer);
    zoomSettleTimer = setTimeout(() => {
      canvas.style.transform = 'none';
      zoomAccum = 1;
      zoomStarted = false;
      renderFull();
    }, 250);
  }, { passive: false });

  // ---- Pan ----
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragCenterX = state.centerX;
    state.dragCenterY = state.centerY;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.dragging) return;
    const scale = (state.baseScale / state.zoom) / canvas.width;
    state.centerX = state.dragCenterX - (e.clientX - state.dragStartX) * scale;
    state.centerY = state.dragCenterY - (e.clientY - state.dragStartY) * scale;
    updateUI();
    renderInteractive();
  });

  window.addEventListener('mouseup', () => {
    if (state.dragging) {
      state.dragging = false;
      canvas.style.cursor = 'crosshair';
      renderFull();
    }
  });

  // ---- Touch ----
  let lastTouchDist = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      state.dragging = true;
      state.dragStartX = e.touches[0].clientX;
      state.dragStartY = e.touches[0].clientY;
      state.dragCenterX = state.centerX;
      state.dragCenterY = state.centerY;
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && state.dragging) {
      const scale = (state.baseScale / state.zoom) / canvas.width;
      state.centerX = state.dragCenterX - (e.touches[0].clientX - state.dragStartX) * scale;
      state.centerY = state.dragCenterY - (e.touches[0].clientY - state.dragStartY) * scale;
      updateUI();
      renderInteractive();
    } else if (e.touches.length === 2 && lastTouchDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      state.zoom = Math.max(0.5, Math.min(state.zoom * (dist / lastTouchDist), 1e8));
      lastTouchDist = dist;
      updateUI();
      renderInteractive();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    state.dragging = false;
    lastTouchDist = 0;
    renderFull();
  });

  // ---- Reset View ----
  btnReset.addEventListener('click', () => {
    state.centerX = 0;
    state.centerY = 0;
    state.zoom = 1;
    updateUI();
    renderFull();
  });

  // ---- Ambient Drift ----
  btnAmbient.addEventListener('click', () => {
    state.ambientActive = !state.ambientActive;
    btnAmbient.classList.toggle('active', state.ambientActive);
    if (state.ambientActive) {
      state.ambientAngle = Math.atan2(state.cImag, state.cReal);
    }
  });

  function ambientStep(dt) {
    if (!state.ambientActive) return;

    state.ambientAngle += dt * state.ambientSpeed * 0.3;
    const t = state.ambientAngle;

    // Main cardioid boundary: c = (e^it)/2 - (e^2it)/4
    const r = 0.5;
    const wobble = 0.05 * Math.sin(t * 3.7);
    state.cReal = r * Math.cos(t) - r * r * Math.cos(2 * t) / 2 + wobble * Math.cos(t * 1.3);
    state.cImag = r * Math.sin(t) - r * r * Math.sin(2 * t) / 2 + wobble * Math.sin(t * 2.1);

    sliderReal.value = state.cReal;
    sliderImag.value = state.cImag;
    updateUI();
    renderInteractive();
  }

  // ---- DJ Mode ----
  btnDJ.addEventListener('click', () => {
    state.djMode = !state.djMode;
    btnDJ.classList.toggle('active', state.djMode);
    mandelbrotMinimap.classList.toggle('hidden', !state.djMode);
    if (state.djMode) renderMandelbrot();
  });

  function renderMandelbrot() {
    const w = mandelbrotCanvas.width;
    const h = mandelbrotCanvas.height;
    const imgData = mandelbrotCtx.createImageData(w, h);
    const data = imgData.data;
    const xMin = -2.2, xMax = 0.8, yMin = -1.2, yMax = 1.2;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const cr = xMin + (px / w) * (xMax - xMin);
        const ci = yMin + (py / h) * (yMax - yMin);
        let zr = 0, zi = 0, iter = 0;
        while (zr * zr + zi * zi <= 4 && iter < 100) {
          const tmp = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = tmp;
          iter++;
        }
        const idx = (py * w + px) * 4;
        if (iter === 100) {
          data[idx] = 15; data[idx + 1] = 10; data[idx + 2] = 30;
        } else {
          const t = iter / 100;
          data[idx] = Math.floor(t * 204);
          data[idx + 1] = Math.floor(t * 45);
          data[idx + 2] = Math.floor(t * 149);
        }
        data[idx + 3] = 255;
      }
    }
    mandelbrotCtx.putImageData(imgData, 0, 0);
  }

  let djDragging = false;

  function handleDJClick(e) {
    const rect = mandelbrotCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const xMin = -2.2, xMax = 0.8, yMin = -1.2, yMax = 1.2;

    state.cReal = xMin + (px / rect.width) * (xMax - xMin);
    state.cImag = yMin + (py / rect.height) * (yMax - yMin);
    sliderReal.value = state.cReal;
    sliderImag.value = state.cImag;

    minimapCrosshair.style.display = 'block';
    minimapCrosshair.style.left = (px + 4) + 'px';
    minimapCrosshair.style.top = (py + 22) + 'px';

    updateUI();
    renderInteractive();
  }

  mandelbrotCanvas.addEventListener('mousedown', (e) => { djDragging = true; handleDJClick(e); });
  mandelbrotCanvas.addEventListener('mousemove', (e) => { if (djDragging) handleDJClick(e); });
  window.addEventListener('mouseup', () => { djDragging = false; });

  // ---- Animation Loop ----
  let lastTime = 0;

  function animate(time) {
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if (dt < 0.5) ambientStep(dt);
    requestAnimationFrame(animate);
  }

  // ---- Init ----
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  updateUI();
  requestAnimationFrame(animate);
})();
