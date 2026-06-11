const video = document.querySelector("#camera");
const canvas = document.querySelector("#analysisCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const appShell = document.querySelector(".app-shell");
const scanner = document.querySelector(".scanner");
const startButton = document.querySelector("#startButton");
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
const greyToggle = document.querySelector("#greyToggle");
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
  lastAlertAt: 0,
  lastFrameAt: 0,
  lastRawFrame: null,
  library: []
};

loadDiscLibrary();
syncControls();
setTargetColor(colorPicker.value);
drawColorWheel();
renderDiscLibrary();

startButton.addEventListener("click", startCamera);
menuToggle.addEventListener("click", toggleControls);
sampleButton.addEventListener("click", sampleCenterColor);
saveDiscButton.addEventListener("click", saveCurrentDisc);
discList.addEventListener("click", handleDiscListClick);
colorPicker.addEventListener("input", () => setTargetColor(colorPicker.value));
rangeSlider.addEventListener("input", syncControls);
satSlider.addEventListener("input", syncControls);
lightSlider.addEventListener("input", syncControls);
triggerSlider.addEventListener("input", syncControls);
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

  const disc = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    name,
    color: colorPicker.value,
    hueTolerance: state.hueTolerance,
    minSaturation: state.minSaturation,
    minBrightness: state.minBrightness,
    triggerCoverage: state.triggerCoverage,
    savedAt: Date.now()
  };

  state.library = [
    disc,
    ...state.library.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
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
  colorPicker.value = disc.color;
  rangeSlider.value = Math.round(disc.hueTolerance);
  satSlider.value = Math.round(disc.minSaturation * 100);
  lightSlider.value = Math.round(disc.minBrightness * 100);
  triggerSlider.value = Math.round(disc.triggerCoverage * 1000);

  syncControls();
  setTargetColor(disc.color);
  discNameInput.value = disc.name;
  sampleText.textContent = `Loaded ${disc.name}`;
  setStatus(`Loaded ${disc.name}`, false, 0);
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
        height: { ideal: 720 }
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

  if (time - state.lastFrameAt < 95) {
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
      } else if (greyToggle.checked) {
        const grey = Math.round(data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722);
        data[offset] = grey;
        data[offset + 1] = grey;
        data[offset + 2] = grey;
      }
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

  return (
    hsv.saturation >= state.minSaturation &&
    hsv.value >= state.minBrightness &&
    hueDistance(hsv.hue, state.targetHue) <= state.hueTolerance
  );
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

  if (now - state.lastAlertAt < 900) return;

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
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  const frequency = 620 + Math.round(confidence * 280);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  oscillator.connect(gain);
  gain.connect(state.audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

function setTargetColor(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const hsv = rgbToHsv(red / 255, green / 255, blue / 255);
  state.targetHue = hsv.hue;
  state.targetSaturation = Math.max(0.12, hsv.saturation);
  state.targetValue = Math.max(0.2, hsv.value);
  document.documentElement.style.setProperty("--target", hex);
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

function setStatus(text, detected, confidence) {
  statusText.textContent = text;
  confidenceText.textContent = `${Math.round(confidence * 100)}%`;
  signalDot.classList.toggle("detected", detected);
}

function loadDiscLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(libraryStorageKey) || "[]");
    state.library = Array.isArray(saved) ? saved.filter(isValidDisc).slice(0, 20) : [];
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
    const hue = Math.round(rgbToHsvFromHex(disc.color).hue);
    const range = Math.round(disc.hueTolerance);

    return `
      <div class="disc-item">
        <span class="disc-swatch" style="background: ${disc.color}"></span>
        <span class="disc-info">
          <span class="disc-name">${escapeHtml(disc.name)}</span>
          <span class="disc-meta">${hue}° ± ${range}°</span>
        </span>
        <button class="disc-action" type="button" data-action="load" data-id="${disc.id}">Load</button>
        <button class="disc-action delete" type="button" data-action="delete" data-id="${disc.id}">Delete</button>
      </div>
    `;
  }).join("");
}

function isValidDisc(disc) {
  return (
    disc &&
    typeof disc.id === "string" &&
    /^[a-z0-9.-]+$/i.test(disc.id) &&
    typeof disc.name === "string" &&
    /^#[0-9a-f]{6}$/i.test(disc.color) &&
    Number.isFinite(disc.hueTolerance) &&
    Number.isFinite(disc.minSaturation) &&
    Number.isFinite(disc.minBrightness) &&
    Number.isFinite(disc.triggerCoverage)
  );
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

function rgbToHsvFromHex(hex) {
  const { red, green, blue } = hexToRgb(hex);
  return rgbToHsv(red / 255, green / 255, blue / 255);
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
  const centerX = Math.floor(width / 2);
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
  return appShell.classList.contains("controls-collapsed") ? 0.45 : 0.24;
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
