const video = document.querySelector("#camera");
const canvas = document.querySelector("#analysisCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const appShell = document.querySelector(".app-shell");
const scanner = document.querySelector(".scanner");
const startButton = document.querySelector("#startButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const zoomInButton = document.querySelector("#zoomInButton");
const zoomValue = document.querySelector("#zoomValue");
const scanZoomOutButton = document.querySelector("#scanZoomOutButton");
const scanZoomInButton = document.querySelector("#scanZoomInButton");
const scanZoomValue = document.querySelector("#scanZoomValue");
const menuToggle = document.querySelector("#menuToggle");
const menuToggleIcon = document.querySelector("#menuToggleIcon");
const menuToggleText = document.querySelector("#menuToggleText");
const sampleButton = document.querySelector("#sampleButton");
const saveDiscButton = document.querySelector("#saveDiscButton");
const discNameInput = document.querySelector("#discNameInput");
const discList = document.querySelector("#discList");
const libraryCount = document.querySelector("#libraryCount");
const colorPicker = document.querySelector("#colorPicker");
const colorWheel = document.querySelector("#colorWheel");
const wheelCtx = colorWheel.getContext("2d", { willReadFrequently: true });
const rangeSlider = document.querySelector("#rangeSlider");
const satSlider = document.querySelector("#satSlider");
const lightSlider = document.querySelector("#lightSlider");
const triggerSlider = document.querySelector("#triggerSlider");
const audioToggle = document.querySelector("#audioToggle");
const flashToggle = document.querySelector("#flashToggle");
const viewModeInputs = [...document.querySelectorAll("input[name='viewMode']")];
const rangeValue = document.querySelector("#rangeValue");
const satValue = document.querySelector("#satValue");
const lightValue = document.querySelector("#lightValue");
const triggerValue = document.querySelector("#triggerValue");
const rangeHint = document.querySelector("#rangeHint");
const sampleSwatch = document.querySelector("#sampleSwatch");
const sampleText = document.querySelector("#sampleText");
const statusText = document.querySelector("#statusText");
const confidenceText = document.querySelector("#confidenceText");
const signalDot = document.querySelector("#signalDot");
const targetBox = document.querySelector("#targetBox");
const screenFlash = document.querySelector("#screenFlash");
const presets = [...document.querySelectorAll(".preset")];
const libraryStorageKey = "discFinder.library.v1";

const state = {
  running: false,
  audio: null,
  targetHue: 330,
  targetSaturation: 0.88,
  targetValue: 1,
  hueTolerance: 18,
  minSaturation: 0.42,
  minBrightness: 0.28,
  triggerCoverage: 0.015,
  activeTargets: [],
  viewMode: "grey",
  zoom: 1,
  minZoom: 1,
  maxZoom: 4,
  lastAlertAt: 0,
  lastFrameAt: 0,
  lastRawFrame: null,
  library: []
};

loadDiscLibrary();
setZoom(state.zoom);
syncControls();
setTargetColor(colorPicker.value);
drawColorWheel();
renderDiscLibrary();

startButton.addEventListener("click", startCamera);
zoomOutButton.addEventListener("click", () => adjustZoom(-0.25));
zoomInButton.addEventListener("click", () => adjustZoom(0.25));
scanZoomOutButton.addEventListener("click", () => adjustZoom(-0.25));
scanZoomInButton.addEventListener("click", () => adjustZoom(0.25));
menuToggle.addEventListener("click", toggleControls);
sampleButton.addEventListener("click", sampleCenterColor);
saveDiscButton.addEventListener("click", saveCurrentDisc);
discList.addEventListener("click", handleDiscListClick);
colorPicker.addEventListener("input", () => setTargetColor(colorPicker.value));
rangeSlider.addEventListener("input", syncControls);
satSlider.addEventListener("input", syncControls);
lightSlider.addEventListener("input", syncControls);
triggerSlider.addEventListener("input", syncControls);
viewModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) state.viewMode = input.value;
  });
});
colorWheel.addEventListener("pointerdown", handleWheelPick);
colorWheel.addEventListener("pointermove", (event) => {
  if (event.buttons === 1) handleWheelPick(event);
});

presets.forEach((button) => {
  button.addEventListener("click", () => {
    colorPicker.value = button.dataset.color;
    setTargetColor(button.dataset.color);
    presets.forEach((preset) => preset.classList.toggle("active", preset === button));
  });
});

function toggleControls() {
  const collapsed = appShell.classList.toggle("controls-collapsed");
  menuToggle.setAttribute("aria-expanded", String(!collapsed));
  menuToggleIcon.textContent = collapsed ? "⌃" : "⌄";
  menuToggleText.textContent = collapsed ? "Show controls" : "Hide controls";
}

function saveCurrentDisc() {
  const name = discNameInput.value.trim();

  if (!name) {
    discNameInput.focus();
    setStatus("Name the disc first", false, 0);
    return;
  }

  const existing = state.library.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const nextColor = colorPicker.value;
  const disc = existing ? {
    ...existing,
    colors: uniqueColors([nextColor, ...getDiscColors(existing)]).slice(0, 6),
    color: nextColor,
    hueTolerance: state.hueTolerance,
    minSaturation: state.minSaturation,
    minBrightness: state.minBrightness,
    triggerCoverage: state.triggerCoverage,
    savedAt: Date.now()
  } : {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    name,
    colors: [nextColor],
    color: nextColor,
    hueTolerance: state.hueTolerance,
    minSaturation: state.minSaturation,
    minBrightness: state.minBrightness,
    triggerCoverage: state.triggerCoverage,
    savedAt: Date.now()
  };

  state.library = [
    disc,
    ...state.library.filter((item) => item.id !== disc.id)
  ].slice(0, 20);

  discNameInput.value = "";
  persistDiscLibrary();
  renderDiscLibrary();
  setStatus(`Saved ${disc.name}`, false, 0);
}

function handleDiscListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const disc = state.library.find((item) => item.id === button.dataset.id);
  if (!disc) return;

  if (button.dataset.action === "load") {
    loadDisc(disc);
  }

  if (button.dataset.action === "delete") {
    state.library = state.library.filter((item) => item.id !== disc.id);
    persistDiscLibrary();
    renderDiscLibrary();
    setStatus(`Deleted ${disc.name}`, false, 0);
  }
}

function loadDisc(disc) {
  const colors = getDiscColors(disc);
  colorPicker.value = colors[0];
  rangeSlider.value = Math.round(disc.hueTolerance);
  satSlider.value = Math.round(disc.minSaturation * 100);
  lightSlider.value = Math.round(disc.minBrightness * 100);
  triggerSlider.value = Math.round(disc.triggerCoverage * 1000);

  syncControls();
  setTargetColor(colors[0], { activeColors: colors });
  discNameInput.value = disc.name;
  sampleText.textContent = colors.length > 1 ? `Loaded ${colors.length} colors` : `Loaded ${disc.name}`;
  setStatus(`Loaded ${disc.name}`, false, 0);
}

function adjustZoom(delta) {
  setZoom(state.zoom + delta);
}

function setZoom(value) {
  state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, value));
  const label = `${state.zoom.toFixed(1)}×`;
  zoomValue.textContent = label;
  scanZoomValue.textContent = label;
  [zoomOutButton, scanZoomOutButton].forEach((button) => {
    button.disabled = state.zoom <= state.minZoom;
  });
  [zoomInButton, scanZoomInButton].forEach((button) => {
    button.disabled = state.zoom >= state.maxZoom;
  });
}

async function startCamera() {
  try {
    startButton.disabled = true;
    setStatus("Starting camera", false, 0);

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("CameraRequiresHTTPS");
    }

    await unlockAudio();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 }
      }
    });

    video.srcObject = stream;
    await video.play();
    state.running = true;
    canvas.classList.add("active");
    startButton.querySelector("span:last-child").textContent = "Scanning";
    setStatus("Scanning", false, 0);
    requestAnimationFrame(analyzeFrame);
  } catch (error) {
    startButton.disabled = false;
    if (error.message === "CameraRequiresHTTPS") {
      setStatus("Use HTTPS for camera", false, 0);
    } else {
      setStatus(error.name === "NotAllowedError" ? "Camera blocked" : "Camera unavailable", false, 0);
    }
  }
}

function analyzeFrame(time) {
  if (!state.running) return;

  if (time - state.lastFrameAt < 48) {
    requestAnimationFrame(analyzeFrame);
    return;
  }

  state.lastFrameAt = time;

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    requestAnimationFrame(analyzeFrame);
    return;
  }

  const bounds = scanner.getBoundingClientRect();
  const sampleWidth = Math.max(220, Math.round(Math.min(420, bounds.width)));
  const sampleHeight = Math.max(160, Math.round(sampleWidth * (bounds.height / Math.max(bounds.width, 1))));
  ensureCanvasSize(sampleWidth, sampleHeight);
  drawVideoCover(ctx, video, sampleWidth, sampleHeight);

  const image = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  state.lastRawFrame = {
    width: sampleWidth,
    height: sampleHeight,
    data: new Uint8ClampedArray(image.data)
  };

  const result = detectAndFilterColor(image, sampleWidth, sampleHeight);
  ctx.putImageData(image, 0, 0);
  renderResult(result);

  requestAnimationFrame(analyzeFrame);
}

function detectAndFilterColor(image, width, height) {
  const data = image.data;
  let sampled = 0;
  let matched = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      sampled += 1;
      const offset = (y * width + x) * 4;
      const red = data[offset] / 255;
      const green = data[offset + 1] / 255;
      const blue = data[offset + 2] / 255;
      const matchedPixel = matchesTarget(red, green, blue);

      if (matchedPixel) {
        matched += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      renderPixelByMode(data, offset, matchedPixel);
    }
  }

  const coverage = sampled > 0 ? matched / sampled : 0;
  const detected = coverage >= state.triggerCoverage;
  const confidence = Math.min(1, coverage / Math.max(state.triggerCoverage, 0.0001));

  return {
    detected,
    coverage,
    confidence,
    box: matched > 0 ? {
      x: minX / width,
      y: minY / height,
      width: Math.max(maxX - minX, 1) / width,
      height: Math.max(maxY - minY, 1) / height
    } : null
  };
}

function matchesTarget(red, green, blue) {
  const hsv = rgbToHsv(red, green, blue);

  return state.activeTargets.some((target) => matchesTargetColor(hsv, target));
}

function matchesTargetColor(hsv, target) {
  if (isNeutralTarget(target)) {
    const brightnessTolerance = 0.06 + state.hueTolerance / 300;
    const saturationCeiling = Math.max(0.22, state.minSaturation * 0.65);

    return (
      hsv.saturation <= saturationCeiling &&
      Math.abs(hsv.value - target.value) <= brightnessTolerance
    );
  }

  return (
    hsv.saturation >= state.minSaturation &&
    hsv.value >= state.minBrightness &&
    hueDistance(hsv.hue, target.hue) <= state.hueTolerance
  );
}

function renderPixelByMode(data, offset, matchedPixel) {
  if (state.viewMode === "color") return;

  if (state.viewMode === "mask") {
    data[offset] = matchedPixel ? 255 : 0;
    data[offset + 1] = matchedPixel ? 255 : 0;
    data[offset + 2] = matchedPixel ? 255 : 0;
    return;
  }

  if (matchedPixel && state.viewMode === "boost") {
    data[offset] = Math.min(255, Math.round(data[offset] * 1.28 + 20));
    data[offset + 1] = Math.min(255, Math.round(data[offset + 1] * 1.28 + 20));
    data[offset + 2] = Math.min(255, Math.round(data[offset + 2] * 1.28 + 20));
    return;
  }

  if (!matchedPixel && (state.viewMode === "grey" || state.viewMode === "boost")) {
    const grey = Math.round(data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722);
    data[offset] = grey;
    data[offset + 1] = grey;
    data[offset + 2] = grey;
  }
}

function renderResult(result) {
  setStatus(result.detected ? "Color detected" : "Scanning", result.detected, result.confidence);

  if (result.box && result.detected) {
    targetBox.style.display = "block";
    targetBox.style.left = `${result.box.x * 100}%`;
    targetBox.style.top = `${result.box.y * 100}%`;
    targetBox.style.width = `${Math.max(12, result.box.width * 100)}%`;
    targetBox.style.height = `${Math.max(6, result.box.height * 100)}%`;
  } else {
    targetBox.style.display = "none";
  }

  if (result.detected) {
    alertIfNeeded(result.confidence);
  }
}

function alertIfNeeded(confidence) {
  const now = performance.now();
  const cooldown = confidence > 0.78 ? 620 : confidence > 0.42 ? 820 : 1100;

  if (now - state.lastAlertAt < cooldown) return;

  state.lastAlertAt = now;

  if (audioToggle.checked) {
    playBeep(confidence);
  }

  if (flashToggle.checked) {
    screenFlash.classList.add("active");
    window.setTimeout(() => screenFlash.classList.remove("active"), 160);
  }
}

async function unlockAudio() {
  if (!state.audio) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    state.audio = AudioEngine ? new AudioEngine() : null;
  }

  if (state.audio?.state === "suspended") {
    await state.audio.resume();
  }
}

function playBeep(confidence) {
  if (!state.audio) return;

  const now = state.audio.currentTime;
  const pattern = confidence > 0.78
    ? { count: 3, gap: 0.105, duration: 0.085, gain: 0.25, base: 800 }
    : confidence > 0.42
      ? { count: 2, gap: 0.16, duration: 0.105, gain: 0.21, base: 690 }
      : { count: 1, gap: 0.24, duration: 0.145, gain: 0.17, base: 560 };

  for (let index = 0; index < pattern.count; index += 1) {
    playTone({
      startAt: now + index * pattern.gap,
      duration: pattern.duration,
      frequency: pattern.base + Math.round(confidence * 230) + index * 24,
      peakGain: pattern.gain
    });
  }
}

function playTone({ startAt, duration, frequency, peakGain }) {
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(state.audio.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.025);
}

function setTargetColor(hex, options = {}) {
  const activeColors = options.activeColors || [hex];
  const target = makeColorTarget(hex);
  state.targetHue = target.hue;
  state.targetSaturation = target.saturation;
  state.targetValue = target.value;
  state.activeTargets = uniqueColors(activeColors).map(makeColorTarget);
  document.documentElement.style.setProperty("--target", hex);
  const { red, green, blue } = target.rgb;
  targetBox.style.background = `rgba(${red}, ${green}, ${blue}, 0.22)`;
  targetBox.style.boxShadow = `0 0 0 9999px rgba(255, 255, 255, 0.02), 0 0 26px rgba(${red}, ${green}, ${blue}, 0.55)`;
  screenFlash.style.background = `rgba(${red}, ${green}, ${blue}, 0.28)`;
  sampleSwatch.style.background = hex;
  presets.forEach((preset) => preset.classList.toggle("active", preset.dataset.color.toLowerCase() === hex.toLowerCase()));
  updateRangeHint();
  drawColorWheel();
}

function syncControls() {
  state.hueTolerance = Number(rangeSlider.value);
  state.minSaturation = Number(satSlider.value) / 100;
  state.minBrightness = Number(lightSlider.value) / 100;
  state.triggerCoverage = Number(triggerSlider.value) / 1000;

  rangeValue.textContent = `${state.hueTolerance}°`;
  satValue.textContent = `${Math.round(state.minSaturation * 100)}%`;
  lightValue.textContent = `${Math.round(state.minBrightness * 100)}%`;
  triggerValue.textContent = `${(state.triggerCoverage * 100).toFixed(1)}%`;
  updateRangeHint();
  drawColorWheel();
}

function isNeutralTarget(target = null) {
  return (target ? target.saturation : state.targetSaturation) < 0.24;
}

function setStatus(text, detected, confidence) {
  statusText.textContent = text;
  confidenceText.textContent = `${Math.round(confidence * 100)}%`;
  signalDot.classList.toggle("detected", detected);
}

function loadDiscLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(libraryStorageKey) || "[]");
    state.library = Array.isArray(saved)
      ? saved.map(normalizeDisc).filter(Boolean).slice(0, 20)
      : [];
  } catch {
    state.library = [];
  }
}

function persistDiscLibrary() {
  localStorage.setItem(libraryStorageKey, JSON.stringify(state.library));
}

function renderDiscLibrary() {
  libraryCount.textContent = state.library.length === 1 ? "1 saved disc" : `${state.library.length} saved discs`;

  if (state.library.length === 0) {
    libraryCount.textContent = "No saved discs";
    discList.innerHTML = `<div class="disc-empty">Saved discs will appear here.</div>`;
    return;
  }

  discList.innerHTML = state.library.map((disc) => {
    const colors = getDiscColors(disc);
    const visibleColors = colors.slice(0, 3);
    const extraCount = colors.length - visibleColors.length;
    return `
      <div class="disc-item">
        <span class="disc-swatches">
          ${visibleColors.map((color) => `<span class="disc-swatch" style="background: ${color}"></span>`).join("")}
          ${extraCount > 0 ? `<span class="disc-more">+${extraCount}</span>` : ""}
        </span>
        <span class="disc-info">
          <span class="disc-name">${escapeHtml(disc.name)}</span>
          <span class="disc-meta">${colors.length > 1 ? `${colors.length} colors` : colorSearchLabel(colors[0], disc.hueTolerance)}</span>
        </span>
        <button class="disc-action" type="button" data-action="load" data-id="${disc.id}">Load</button>
        <button class="disc-action delete" type="button" data-action="delete" data-id="${disc.id}">Delete</button>
      </div>
    `;
  }).join("");
}

function normalizeDisc(disc) {
  if (!disc || typeof disc.name !== "string") return null;

  const colors = uniqueColors(getDiscColors(disc));
  if (colors.length === 0) return null;

  return {
    id: typeof disc.id === "string" && /^[a-z0-9.-]+$/i.test(disc.id) ? disc.id : String(Date.now()),
    name: disc.name,
    colors,
    color: colors[0],
    hueTolerance: Number.isFinite(disc.hueTolerance) ? disc.hueTolerance : 18,
    minSaturation: Number.isFinite(disc.minSaturation) ? disc.minSaturation : 0.42,
    minBrightness: Number.isFinite(disc.minBrightness) ? disc.minBrightness : 0.28,
    triggerCoverage: Number.isFinite(disc.triggerCoverage) ? disc.triggerCoverage : 0.015,
    savedAt: Number.isFinite(disc.savedAt) ? disc.savedAt : Date.now()
  };
}

function getDiscColors(disc) {
  const colors = Array.isArray(disc.colors) ? disc.colors : [disc.color];
  return colors.filter((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color));
}

function uniqueColors(colors) {
  return [...new Set(colors.map((color) => color.toLowerCase()))];
}

function hueDistance(a, b) {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function rgbToHsv(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, value: max };
  }

  let hue;
  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max
  };
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16)
  };
}

function makeColorTarget(hex) {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb.red / 255, rgb.green / 255, rgb.blue / 255);

  return {
    hex: hex.toLowerCase(),
    hue: hsv.hue,
    saturation: hsv.saturation,
    value: hsv.value,
    rgb
  };
}

function rgbToHsvFromHex(hex) {
  const { red, green, blue } = hexToRgb(hex);
  return rgbToHsv(red / 255, green / 255, blue / 255);
}

function colorSearchLabel(hex, hueTolerance) {
  const hsv = rgbToHsvFromHex(hex);

  if (hsv.saturation < 0.24) {
    const tolerance = 0.06 + hueTolerance / 300;
    const low = Math.max(0, Math.round((hsv.value - tolerance) * 100));
    const high = Math.min(100, Math.round((hsv.value + tolerance) * 100));
    return `Neutral ${low}-${high}% light`;
  }

  return `${Math.round(hsv.hue)}° ± ${Math.round(hueTolerance)}°`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sampleCenterColor() {
  if (!state.lastRawFrame) {
    setStatus("Start camera first", false, 0);
    return;
  }

  const { width, height, data } = state.lastRawFrame;
  const centerX = Math.floor(width * getReticleXRatio());
  const centerY = Math.floor(height * getReticleYRatio());
  const radius = Math.max(4, Math.round(Math.min(width, height) * 0.035));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const offset = (y * width + x) * 4;
      red += data[offset];
      green += data[offset + 1];
      blue += data[offset + 2];
      count += 1;
    }
  }

  if (!count) return;

  const hex = rgbToHex(Math.round(red / count), Math.round(green / count), Math.round(blue / count));
  colorPicker.value = hex;
  sampleText.textContent = `Sampled ${hex.toUpperCase()}`;
  setTargetColor(hex);
}

function getReticleYRatio() {
  if (window.matchMedia("(orientation: landscape) and (max-height: 720px)").matches) {
    return 0.5;
  }

  return appShell.classList.contains("controls-collapsed") ? 0.45 : 0.24;
}

function getReticleXRatio() {
  const isLandscape = window.matchMedia("(orientation: landscape) and (max-height: 720px)").matches;

  if (!isLandscape || appShell.classList.contains("controls-collapsed")) {
    return 0.5;
  }

  const panelWidth = Math.min(390, window.innerWidth * 0.42);
  return ((window.innerWidth - panelWidth) / 2) / window.innerWidth;
}

function handleWheelPick(event) {
  const rect = colorWheel.getBoundingClientRect();
  const scaleX = colorWheel.width / rect.width;
  const scaleY = colorWheel.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const center = colorWheel.width / 2;
  const dx = x - center;
  const dy = y - center;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const maxRadius = center - 8;

  if (radius > maxRadius) return;

  const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  const saturation = Math.max(0.08, Math.min(1, radius / maxRadius));
  const { red, green, blue } = hsvToRgb(hue, saturation, 1);
  const hex = rgbToHex(red, green, blue);

  colorPicker.value = hex;
  sampleText.textContent = `Wheel ${Math.round(hue)}°`;
  setTargetColor(hex);
}

function drawColorWheel() {
  const size = colorWheel.width;
  const center = size / 2;
  const radius = center - 8;
  const image = wheelCtx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const offset = (y * size + x) * 4;

      if (distance <= radius) {
        const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
        const saturation = distance / radius;
        const { red, green, blue } = hsvToRgb(hue, saturation, 1);
        data[offset] = red;
        data[offset + 1] = green;
        data[offset + 2] = blue;
        data[offset + 3] = 255;
      }
    }
  }

  wheelCtx.putImageData(image, 0, 0);
  wheelCtx.save();
  wheelCtx.translate(center, center);

  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, radius + 2, 0, Math.PI * 2);
  wheelCtx.lineWidth = 3;
  wheelCtx.strokeStyle = "rgba(255,255,255,0.9)";
  wheelCtx.stroke();

  const start = (state.targetHue - state.hueTolerance) * Math.PI / 180;
  const end = (state.targetHue + state.hueTolerance) * Math.PI / 180;
  wheelCtx.beginPath();
  wheelCtx.arc(0, 0, radius + 5, start, end);
  wheelCtx.lineWidth = 8;
  wheelCtx.lineCap = "round";
  wheelCtx.strokeStyle = "rgba(255,255,255,0.82)";
  wheelCtx.stroke();

  const markerAngle = state.targetHue * Math.PI / 180;
  const markerRadius = Math.max(10, state.targetSaturation * radius);
  const markerX = Math.cos(markerAngle) * markerRadius;
  const markerY = Math.sin(markerAngle) * markerRadius;
  wheelCtx.beginPath();
  wheelCtx.arc(markerX, markerY, 8, 0, Math.PI * 2);
  wheelCtx.fillStyle = "rgba(0,0,0,0.28)";
  wheelCtx.fill();
  wheelCtx.lineWidth = 3;
  wheelCtx.strokeStyle = "#fff";
  wheelCtx.stroke();
  wheelCtx.restore();
}

function updateRangeHint() {
  if (state.activeTargets.length > 1) {
    rangeHint.textContent = `Searching ${state.activeTargets.length} saved colors`;
    return;
  }

  if (isNeutralTarget()) {
    const tolerance = 0.06 + state.hueTolerance / 300;
    const low = Math.max(0, Math.round((state.targetValue - tolerance) * 100));
    const high = Math.min(100, Math.round((state.targetValue + tolerance) * 100));
    rangeHint.textContent = `Neutral ${low}-${high}% light`;
    return;
  }

  const start = normalizeHue(state.targetHue - state.hueTolerance);
  const end = normalizeHue(state.targetHue + state.hueTolerance);
  rangeHint.textContent = `Searching ${Math.round(start)}° to ${Math.round(end)}°`;
}

function ensureCanvasSize(width, height) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawVideoCover(context, source, width, height) {
  const sourceWidth = source.videoWidth;
  const sourceHeight = source.videoHeight;
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceAspect > targetAspect) {
    sw = sourceHeight * targetAspect;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetAspect;
    sy = (sourceHeight - sh) / 2;
  }

  const zoomedWidth = sw / state.zoom;
  const zoomedHeight = sh / state.zoom;
  sx += (sw - zoomedWidth) / 2;
  sy += (sh - zoomedHeight) / 2;
  sw = zoomedWidth;
  sh = zoomedHeight;

  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
}

function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
}

function rgbToHex(red, green, blue) {
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function toHex(value) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

function hsvToRgb(hue, saturation, value) {
  const chroma = value * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    red: Math.round((red + match) * 255),
    green: Math.round((green + match) * 255),
    blue: Math.round((blue + match) * 255)
  };
}
