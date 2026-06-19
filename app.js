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
const profileCaptureButton = document.querySelector("#profileCaptureButton");
const profileSummary = document.querySelector("#profileSummary");
const colorPicker = document.querySelector("#colorPicker");
const colorWheel = document.querySelector("#colorWheel");
const wheelCtx = colorWheel.getContext("2d", { willReadFrequently: true });
const rangeSlider = document.querySelector("#rangeSlider");
const satSlider = document.querySelector("#satSlider");
const lightSlider = document.querySelector("#lightSlider");
const triggerSlider = document.querySelector("#triggerSlider");
const aiToggle = document.querySelector("#aiToggle");
const aiStatus = document.querySelector("#aiStatus");
const audioToggle = document.querySelector("#audioToggle");
const flashToggle = document.querySelector("#flashToggle");
const blobFilterToggle = document.querySelector("#blobFilterToggle");
const foliageToggle = document.querySelector("#foliageToggle");
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
const hudColorSwatch = document.querySelector("#hudColorSwatch");
const hudTargetText = document.querySelector("#hudTargetText");
const hudConfidenceText = document.querySelector("#hudConfidenceText");
const hudMeterFill = document.querySelector("#hudMeterFill");
const hudDetailText = document.querySelector("#hudDetailText");
const discEditPanel = document.querySelector("#discEditPanel");
const editDiscTitle = document.querySelector("#editDiscTitle");
const editColorList = document.querySelector("#editColorList");
const addColorButton = document.querySelector("#addColorButton");
const replaceColorButton = document.querySelector("#replaceColorButton");
const removeColorButton = document.querySelector("#removeColorButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const profileCapture = document.querySelector("#profileCapture");
const snapProfileButton = document.querySelector("#snapProfileButton");
const cancelProfileButton = document.querySelector("#cancelProfileButton");
const autoProfileToggle = document.querySelector("#autoProfileToggle");
const profileStatusText = document.querySelector("#profileStatusText");
const profileStatusDetail = document.querySelector("#profileStatusDetail");
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
  triggerCoverage: 0.006,
  activeTargets: [],
  viewMode: "grey",
  zoom: 1,
  minZoom: 1,
  maxZoom: 4,
  lastAlertAt: 0,
  lastFrameAt: 0,
  lastRawFrame: null,
  detectionHistory: [],
  aiLoading: false,
  aiPending: false,
  aiReady: false,
  aiConfidence: 0,
  aiLastResultAt: 0,
  aiLastCheckAt: 0,
  library: [],
  editingDiscId: null,
  editingColorIndex: 0,
  profileCaptureActive: false,
  profileCaptureLoopId: 0,
  profileStableFrames: 0,
  lastProfileSignature: "",
  lastProfileCheckAt: 0,
  profileAutoCaptured: false
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
profileCaptureButton.addEventListener("click", openProfileCapture);
editColorList.addEventListener("click", handleEditColorClick);
addColorButton.addEventListener("click", addCurrentColorToEditingDisc);
replaceColorButton.addEventListener("click", replaceSelectedDiscColor);
removeColorButton.addEventListener("click", removeSelectedDiscColor);
cancelEditButton.addEventListener("click", stopEditingDisc);
snapProfileButton.addEventListener("click", () => captureDiscProfile("manual"));
cancelProfileButton.addEventListener("click", closeProfileCapture);
colorPicker.addEventListener("input", () => setTargetColor(colorPicker.value));
rangeSlider.addEventListener("input", syncControls);
satSlider.addEventListener("input", syncControls);
lightSlider.addEventListener("input", syncControls);
triggerSlider.addEventListener("input", syncControls);
aiToggle.addEventListener("change", handleAiToggle);
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

  if (state.editingDiscId === disc.id) {
    state.editingColorIndex = 0;
  }

  discNameInput.value = "";
  persistDiscLibrary();
  renderDiscLibrary();
  renderEditPanel();
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

  if (button.dataset.action === "edit") {
    startEditingDisc(disc);
  }

  if (button.dataset.action === "delete") {
    state.library = state.library.filter((item) => item.id !== disc.id);
    if (state.editingDiscId === disc.id) {
      stopEditingDisc({ silent: true });
    }
    persistDiscLibrary();
    renderDiscLibrary();
    setStatus(`Deleted ${disc.name}`, false, 0);
  }
}

function loadDisc(disc) {
  const colors = getDiscSearchColors(disc);
  colorPicker.value = colors[0];
  rangeSlider.value = Math.round(disc.hueTolerance);
  satSlider.value = Math.round(disc.minSaturation * 100);
  lightSlider.value = Math.round(disc.minBrightness * 100);
  triggerSlider.value = Math.round(disc.triggerCoverage * 1000);

  syncControls();
  setTargetColor(colors[0], { activeColors: colors });
  discNameInput.value = disc.name;
  sampleText.textContent = getDiscProfileColors(disc).length > 0
    ? `Loaded profile (${colors.length} colors)`
    : colors.length > 1 ? `Loaded ${colors.length} colors` : `Loaded ${disc.name}`;
  updateProfileSummary(disc);
  setStatus(`Loaded ${disc.name}`, false, 0);
}

function startEditingDisc(disc) {
  state.editingDiscId = disc.id;
  state.editingColorIndex = 0;
  loadDisc(disc);
  renderEditPanel();
  setStatus(`Editing ${disc.name}`, false, 0);
}

function stopEditingDisc(options = {}) {
  state.editingDiscId = null;
  state.editingColorIndex = 0;
  discEditPanel.hidden = true;
  saveDiscButton.textContent = "Save Color";
  updateProfileSummary();

  if (!options.silent) {
    setStatus("Finished editing", false, 0);
  }
}

function getEditingDisc() {
  return state.library.find((disc) => disc.id === state.editingDiscId) || null;
}

function renderEditPanel() {
  const disc = getEditingDisc();

  if (!disc) {
    discEditPanel.hidden = true;
    saveDiscButton.textContent = "Save Color";
    updateProfileSummary();
    return;
  }

  const colors = getDiscColors(disc);
  const profileColors = getDiscProfileColors(disc);
  state.editingColorIndex = Math.min(state.editingColorIndex, Math.max(colors.length - 1, 0));
  discEditPanel.hidden = false;
  saveDiscButton.textContent = "Save New Disc";
  editDiscTitle.textContent = profileColors.length > 0
    ? `Editing ${disc.name} + profile`
    : `Editing ${disc.name}`;
  removeColorButton.disabled = colors.length <= 1;
  editColorList.innerHTML = colors.map((color, index) => `
    <button
      class="edit-color-button${index === state.editingColorIndex ? " active" : ""}"
      type="button"
      data-index="${index}"
      aria-label="Edit saved color ${index + 1}"
      style="--edit-color: ${color}"
    ></button>
  `).join("");
  updateProfileSummary(disc);
}

function handleEditColorClick(event) {
  const button = event.target.closest("button[data-index]");
  if (!button) return;

  const disc = getEditingDisc();
  if (!disc) return;

  const colors = getDiscColors(disc);
  state.editingColorIndex = Number(button.dataset.index);
  const selectedColor = colors[state.editingColorIndex];

  if (selectedColor) {
    colorPicker.value = selectedColor;
    setTargetColor(selectedColor, { activeColors: colors });
    sampleText.textContent = `Editing color ${state.editingColorIndex + 1}`;
  }

  renderEditPanel();
}

function addCurrentColorToEditingDisc() {
  updateEditingDisc((disc, colors) => {
    const nextColors = uniqueColors([colorPicker.value, ...colors]).slice(0, 6);
    state.editingColorIndex = 0;
    return { ...disc, colors: nextColors, color: nextColors[0] };
  }, "Added color");
}

function replaceSelectedDiscColor() {
  updateEditingDisc((disc, colors) => {
    colors[state.editingColorIndex] = colorPicker.value;
    const nextColors = uniqueColors(colors).slice(0, 6);
    state.editingColorIndex = Math.min(state.editingColorIndex, nextColors.length - 1);
    return { ...disc, colors: nextColors, color: nextColors[0] };
  }, "Replaced color");
}

function removeSelectedDiscColor() {
  const disc = getEditingDisc();
  const colors = disc ? getDiscColors(disc) : [];

  if (colors.length <= 1) {
    setStatus("Replace the only color instead", false, 0);
    return;
  }

  updateEditingDisc((currentDisc, currentColors) => {
    const nextColors = currentColors.filter((_, index) => index !== state.editingColorIndex);
    state.editingColorIndex = Math.min(state.editingColorIndex, nextColors.length - 1);
    return { ...currentDisc, colors: nextColors, color: nextColors[0] };
  }, "Removed color");
}

function updateEditingDisc(updater, message) {
  const disc = getEditingDisc();
  if (!disc) return;

  const updated = {
    ...updater({ ...disc, name: discNameInput.value.trim() || disc.name }, getDiscColors(disc)),
    name: discNameInput.value.trim() || disc.name,
    hueTolerance: state.hueTolerance,
    minSaturation: state.minSaturation,
    minBrightness: state.minBrightness,
    triggerCoverage: state.triggerCoverage,
    savedAt: Date.now()
  };

  state.library = [
    updated,
    ...state.library.filter((item) => item.id !== updated.id)
  ];

  persistDiscLibrary();
  renderDiscLibrary();
  renderEditPanel();
  loadDisc(updated);
  setStatus(message, false, 0);
}

function openProfileCapture() {
  if (!state.running || !video.videoWidth || !video.videoHeight) {
    setStatus("Start camera first", false, 0);
    startButton.focus();
    return;
  }

  const name = getProfileTargetName();
  if (!name) {
    discNameInput.focus();
    setStatus("Name the disc first", false, 0);
    return;
  }

  state.profileCaptureActive = true;
  state.profileStableFrames = 0;
  state.lastProfileSignature = "";
  state.lastProfileCheckAt = 0;
  state.profileAutoCaptured = false;
  profileCapture.hidden = false;
  appShell.classList.add("profile-capturing");
  updateProfileCaptureStatus("Fill circle with disc", "Auto capture waits for a steady profile");
  setStatus("Fill circle with disc", false, 0);
  requestAnimationFrame(updateProfileCaptureReadiness);
}

function closeProfileCapture() {
  state.profileCaptureActive = false;
  state.profileCaptureLoopId += 1;
  profileCapture.hidden = true;
  appShell.classList.remove("profile-capturing");
  setStatus("Profile capture closed", false, 0);
}

function captureDiscProfile(source = "manual", profileOverride = null) {
  if (state.profileAutoCaptured && source === "auto") return;

  if (source === "auto") {
    state.profileAutoCaptured = true;
  }

  const profile = profileOverride || extractDiscProfileFromVideo();

  if (!profile || profile.colors.length === 0) {
    state.profileAutoCaptured = false;
    setStatus("No profile colors found", false, 0);
    updateProfileCaptureStatus("No profile colors found", "Try brighter light or use manual Capture again");
    return;
  }

  const disc = saveDiscProfile(profile);
  closeProfileCapture();
  loadDisc(disc);
  renderEditPanel();
  setStatus(`${source === "auto" ? "Auto-captured" : "Captured"} ${profile.colors.length} profile colors`, false, 0);
}

function updateProfileCaptureReadiness(time) {
  if (!state.profileCaptureActive) return;

  if (time - state.lastProfileCheckAt < 180) {
    requestAnimationFrame(updateProfileCaptureReadiness);
    return;
  }

  state.lastProfileCheckAt = time;
  const profile = extractDiscProfileFromVideo();
  const readiness = scoreProfileReadiness(profile);

  if (!profile || profile.colors.length < 2 || readiness.fillScore < 0.24) {
    state.profileStableFrames = 0;
    state.lastProfileSignature = "";
    updateProfileCaptureStatus("Fill circle with disc", "Center the disc inside the circle");
    requestAnimationFrame(updateProfileCaptureReadiness);
    return;
  }

  const signature = getProfileSignature(profile);
  const similarity = state.lastProfileSignature
    ? getProfileSignatureSimilarity(signature, state.lastProfileSignature)
    : 0;
  const stable = similarity >= 0.72 && readiness.score >= 0.48;
  state.profileStableFrames = stable ? state.profileStableFrames + 1 : 1;
  state.lastProfileSignature = signature;

  if (state.profileStableFrames >= 4 && autoProfileToggle.checked) {
    updateProfileCaptureStatus("Capturing profile", `${profile.colors.length} colors locked`);
    captureDiscProfile("auto", profile);
    return;
  }

  if (state.profileStableFrames >= 2) {
    updateProfileCaptureStatus("Hold steady", `${profile.colors.length} colors found`);
  } else if (readiness.hasOuterColor) {
    updateProfileCaptureStatus("Almost ready", "Hold the disc steady");
  } else {
    updateProfileCaptureStatus("Fill the rim", "The outer ring needs more disc color");
  }

  requestAnimationFrame(updateProfileCaptureReadiness);
}

function updateProfileCaptureStatus(text, detail) {
  profileStatusText.textContent = text;
  profileStatusDetail.textContent = detail;
}

function getProfileTargetName() {
  const editingDisc = getEditingDisc();
  return editingDisc ? editingDisc.name : discNameInput.value.trim();
}

function updateProfileSummary(disc = getEditingDisc()) {
  const profileColors = getDiscProfileColors(disc);
  profileSummary.textContent = profileColors.length > 0
    ? `Photo profile: ${profileColors.length} colors`
    : "Capture a circular disc profile";
}

function saveDiscProfile(profile) {
  const editingDisc = getEditingDisc();
  const name = editingDisc ? editingDisc.name : discNameInput.value.trim();
  const existing = editingDisc || state.library.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const nextColors = uniqueColors([
    ...profile.colors,
    ...getDiscColors(existing || {})
  ]).slice(0, 8);
  const disc = existing ? {
    ...existing,
    colors: nextColors,
    color: nextColors[0],
    profile,
    hueTolerance: Math.max(state.hueTolerance, 22),
    minSaturation: Math.min(state.minSaturation, 0.34),
    minBrightness: Math.min(state.minBrightness, 0.22),
    triggerCoverage: state.triggerCoverage,
    savedAt: Date.now()
  } : {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    name,
    colors: nextColors,
    color: nextColors[0],
    profile,
    hueTolerance: Math.max(state.hueTolerance, 22),
    minSaturation: Math.min(state.minSaturation, 0.34),
    minBrightness: Math.min(state.minBrightness, 0.22),
    triggerCoverage: state.triggerCoverage,
    savedAt: Date.now()
  };

  state.library = [
    disc,
    ...state.library.filter((item) => item.id !== disc.id)
  ].slice(0, 20);
  state.editingDiscId = disc.id;
  state.editingColorIndex = 0;
  discNameInput.value = disc.name;
  persistDiscLibrary();
  renderDiscLibrary();
  return disc;
}

function extractDiscProfileFromVideo() {
  const bounds = scanner.getBoundingClientRect();
  const width = Math.max(240, Math.round(Math.min(520, bounds.width)));
  const height = Math.max(240, Math.round(width * (bounds.height / Math.max(bounds.width, 1))));
  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = width;
  captureCanvas.height = height;
  const captureContext = captureCanvas.getContext("2d", { willReadFrequently: true });
  drawVideoCover(captureContext, video, width, height);
  const image = captureContext.getImageData(0, 0, width, height);
  const bins = new Map();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.36;
  const step = Math.max(1, Math.round(Math.min(width, height) / 240));
  let sampleCount = 0;
  let innerCount = 0;
  let outerCount = 0;
  let coloredInnerCount = 0;
  let coloredOuterCount = 0;

  for (let y = Math.max(0, Math.floor(centerY - radius)); y <= Math.min(height - 1, Math.ceil(centerY + radius)); y += step) {
    for (let x = Math.max(0, Math.floor(centerX - radius)); x <= Math.min(width - 1, Math.ceil(centerX + radius)); x += step) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceRatio = Math.sqrt(dx * dx + dy * dy) / radius;
      if (distanceRatio > 1) continue;

      const offset = (y * width + x) * 4;
      const red = image.data[offset];
      const green = image.data[offset + 1];
      const blue = image.data[offset + 2];
      const hsv = rgbToHsv(red / 255, green / 255, blue / 255);
      if (hsv.value < 0.08) continue;

      if (distanceRatio > 0.68) {
        outerCount += 1;
        if (hsv.saturation > 0.16 || hsv.value > 0.72) coloredOuterCount += 1;
      } else {
        innerCount += 1;
        if (hsv.saturation > 0.16 || hsv.value > 0.72) coloredInnerCount += 1;
      }

      const key = getProfileColorKey(hsv);
      const weight = (distanceRatio > 0.68 ? 1.35 : 1) + (hsv.saturation > 0.35 ? 0.18 : 0);
      const bin = bins.get(key) || {
        red: 0,
        green: 0,
        blue: 0,
        count: 0,
        weight: 0,
        saturation: 0,
        value: 0
      };

      bin.red += red;
      bin.green += green;
      bin.blue += blue;
      bin.count += 1;
      bin.weight += weight;
      bin.saturation += hsv.saturation;
      bin.value += hsv.value;
      bins.set(key, bin);
      sampleCount += 1;
    }
  }

  const minCount = Math.max(6, Math.round(sampleCount * 0.006));
  const candidates = [...bins.values()]
    .filter((bin) => bin.count >= minCount)
    .map((bin) => {
      const red = Math.round(bin.red / bin.count);
      const green = Math.round(bin.green / bin.count);
      const blue = Math.round(bin.blue / bin.count);
      const saturation = bin.saturation / bin.count;
      const value = bin.value / bin.count;
      return {
        hex: rgbToHex(red, green, blue),
        score: bin.weight * (1 + saturation * 0.22),
        count: bin.count,
        saturation,
        value
      };
    })
    .sort((a, b) => b.score - a.score);

  const colors = [];
  let neutralColors = 0;
  for (const candidate of candidates) {
    const isNeutral = candidate.saturation < 0.2;
    const isMinorNeutral = isNeutral && candidate.count < sampleCount * 0.08;

    if (isMinorNeutral || (isNeutral && neutralColors >= 1)) {
      continue;
    }

    if (colors.every((color) => isDistinctProfileColor(color, candidate.hex))) {
      colors.push(candidate.hex);
      if (isNeutral) neutralColors += 1;
    }

    if (colors.length >= 5) break;
  }

  return {
    colors,
    capturedAt: Date.now(),
    sampleCount,
    fillScore: sampleCount > 0
      ? (coloredInnerCount + coloredOuterCount) / sampleCount
      : 0,
    innerFill: innerCount > 0 ? coloredInnerCount / innerCount : 0,
    outerFill: outerCount > 0 ? coloredOuterCount / outerCount : 0
  };
}

function scoreProfileReadiness(profile) {
  if (!profile) {
    return { score: 0, fillScore: 0, hasOuterColor: false };
  }

  const colorScore = clamp(profile.colors.length / 4);
  const fillScore = clamp(profile.fillScore * 1.45);
  const outerScore = clamp(profile.outerFill * 1.55);
  const innerScore = clamp(profile.innerFill * 1.25);
  return {
    score: colorScore * 0.28 + fillScore * 0.28 + outerScore * 0.26 + innerScore * 0.18,
    fillScore: profile.fillScore,
    hasOuterColor: profile.outerFill >= 0.22
  };
}

function getProfileSignature(profile) {
  return profile.colors
    .slice(0, 5)
    .map((hex) => {
      const hsv = rgbToHsvFromHex(hex);
      if (hsv.saturation < 0.2) {
        return `n${Math.round(hsv.value * 8)}`;
      }

      return `h${Math.round(normalizeHue(hsv.hue) / 18)}s${Math.round(hsv.saturation * 4)}`;
    })
    .join("|");
}

function getProfileSignatureSimilarity(current, previous) {
  const currentParts = current.split("|").filter(Boolean);
  const previousParts = previous.split("|").filter(Boolean);
  if (currentParts.length === 0 || previousParts.length === 0) return 0;

  const previousSet = new Set(previousParts);
  const shared = currentParts.filter((part) => previousSet.has(part)).length;
  return shared / Math.max(currentParts.length, previousParts.length);
}

function getProfileColorKey(hsv) {
  if (hsv.saturation < 0.18) {
    return `n-${Math.round(hsv.value * 9)}`;
  }

  const hue = Math.round(normalizeHue(hsv.hue) / 12) * 12;
  const saturation = Math.round(hsv.saturation * 5);
  const value = Math.round(hsv.value * 5);
  return `c-${hue}-${saturation}-${value}`;
}

function isDistinctProfileColor(firstHex, secondHex) {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  const firstHsv = rgbToHsv(first.red / 255, first.green / 255, first.blue / 255);
  const secondHsv = rgbToHsv(second.red / 255, second.green / 255, second.blue / 255);

  if (firstHsv.saturation < 0.22 && secondHsv.saturation < 0.22) {
    return Math.abs(firstHsv.value - secondHsv.value) > 0.16;
  }

  const hueGap = hueDistance(firstHsv.hue, secondHsv.hue);
  const satGap = Math.abs(firstHsv.saturation - secondHsv.saturation);
  const valueGap = Math.abs(firstHsv.value - secondHsv.value);
  return hueGap > 16 || satGap > 0.22 || valueGap > 0.18;
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

function handleAiToggle() {
  if (!aiToggle.checked) {
    window.DiscFinderAI?.dispose?.();
    state.aiLoading = false;
    state.aiPending = false;
    state.aiReady = false;
    state.aiConfidence = 0;
    state.aiLastResultAt = 0;
    aiStatus.textContent = "AI assist off";
    return;
  }

  aiStatus.textContent = state.running ? "AI loading on device" : "AI loads after camera starts";
  if (state.running) initializeAiAssist();
}

async function initializeAiAssist() {
  if (!aiToggle.checked || state.aiLoading || state.aiReady) return;

  if (!window.DiscFinderAI) {
    aiStatus.textContent = "AI unavailable; standard scan active";
    return;
  }

  state.aiLoading = true;
  aiStatus.textContent = "AI loading on device";
  const ready = await window.DiscFinderAI.initialize();
  state.aiLoading = false;
  state.aiReady = ready;
  aiStatus.textContent = ready ? "AI ready; standard scan remains primary" : "AI unavailable; standard scan active";
}

function maybeRunAiAssist(time) {
  if (
    !aiToggle.checked ||
    !state.aiReady ||
    state.aiPending ||
    time - state.aiLastCheckAt < 900 ||
    video.readyState < 2
  ) {
    return;
  }

  state.aiLastCheckAt = time;
  state.aiPending = true;

  window.DiscFinderAI.analyze(video)
    .then((result) => {
      if (!aiToggle.checked) return;

      if (!result.available) {
        state.aiReady = false;
        state.aiConfidence = 0;
        aiStatus.textContent = "AI paused; standard scan active";
        return;
      }

      state.aiConfidence = clamp(result.confidence || 0);
      state.aiLastResultAt = performance.now();
      aiStatus.textContent = state.aiConfidence >= 0.2
        ? `AI possible disc ${Math.round(state.aiConfidence * 100)}%`
        : "AI ready; standard scan remains primary";
    })
    .catch(() => {
      state.aiReady = false;
      state.aiConfidence = 0;
      aiStatus.textContent = "AI paused; standard scan active";
    })
    .finally(() => {
      state.aiPending = false;
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
    initializeAiAssist();
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
  maybeRunAiAssist(time);

  requestAnimationFrame(analyzeFrame);
}

function detectAndFilterColor(image, width, height) {
  const data = image.data;
  const sampled = width * height;
  const matchMask = new Uint8Array(sampled);
  const strictMask = new Uint8Array(sampled);
  let rawMatched = 0;

  for (let index = 0; index < sampled; index += 1) {
    const offset = index * 4;
    const red = data[offset] / 255;
    const green = data[offset + 1] / 255;
    const blue = data[offset + 2] / 255;
    const matchStrength = getTargetMatchStrength(red, green, blue);

    if (matchStrength > 0) {
      matchMask[index] = 1;
      rawMatched += 1;

      if (matchStrength >= 1) {
        strictMask[index] = 1;
      }
    }
  }

  const blobResult = blobFilterToggle.checked
    ? filterMatchBlobs(matchMask, strictMask, width, height)
    : summarizeMatchMask(matchMask, strictMask, width, height);

  renderFrameByMode(data, matchMask, width, height);

  const matched = blobResult.matched;
  const strictMatched = blobResult.strictMatched;
  const fallbackMatched = Math.max(0, matched - strictMatched);
  const evidenceMatched = strictMatched + fallbackMatched * 0.24;
  const coverage = sampled > 0 ? evidenceMatched / sampled : 0;
  const primaryCandidate = blobResult.primaryCandidate;
  const adaptiveTrigger = getAdaptiveTriggerCoverage(primaryCandidate, blobResult.blobCount);
  const coverageConfidence = Math.min(1, coverage / Math.max(adaptiveTrigger, 0.0001));
  const distantBlobPixels = getDistantBlobPixels(width, height);
  const temporalResult = updateDetectionHistory(primaryCandidate, width, height);
  const distantBlobDetected = Boolean(
    primaryCandidate &&
    primaryCandidate.pixels >= Math.round(distantBlobPixels * 0.7) &&
    primaryCandidate.strictPixels >= 2 &&
    primaryCandidate.strictRatio >= 0.2 &&
    primaryCandidate.score >= 0.62
  );
  const candidateEvidence = primaryCandidate
    ? primaryCandidate.score * clamp(primaryCandidate.strictRatio * 2.4)
    : 0;
  const distantBlobConfidence = primaryCandidate
    ? Math.min(1, (candidateEvidence * 0.72) + (primaryCandidate.pixels / Math.max(distantBlobPixels * 3.5, 1)))
    : 0;
  const temporalDetected = Boolean(
    primaryCandidate &&
    primaryCandidate.score >= 0.56 &&
    primaryCandidate.strictPixels >= 2 &&
    primaryCandidate.strictRatio >= 0.2 &&
    temporalResult.frames >= 3
  );
  const aiFresh = aiToggle.checked && state.aiReady && performance.now() - state.aiLastResultAt < 1600;
  const aiConfirmed = Boolean(primaryCandidate && aiFresh && state.aiConfidence >= 0.28);
  const aiBoost = aiConfirmed ? Math.min(0.14, state.aiConfidence * 0.16) : 0;
  const detected = coverage >= adaptiveTrigger || distantBlobDetected || temporalDetected || (
    aiConfirmed &&
    primaryCandidate.strictPixels >= 2 &&
    primaryCandidate.strictRatio >= 0.18 &&
    primaryCandidate.score >= 0.5
  );
  const confidence = Math.min(1, Math.max(
    coverageConfidence,
    distantBlobConfidence,
    temporalResult.confidence,
    candidateEvidence * 0.92
  ) + aiBoost);
  const box = primaryCandidate || blobResult.combinedBox;

  return {
    detected,
    coverage,
    confidence,
    adaptiveTrigger,
    matched,
    strictMatched,
    rawMatched,
    filteredMatched: Math.max(0, rawMatched - matched),
    blobCount: blobResult.blobCount,
    largestBlobPixels: blobResult.largestBlobPixels,
    distantBlobDetected,
    temporalDetected,
    aiConfirmed,
    aiConfidence: aiFresh ? state.aiConfidence : 0,
    persistenceFrames: temporalResult.frames,
    shapeScore: primaryCandidate ? primaryCandidate.shapeScore : 0,
    arcScore: primaryCandidate ? primaryCandidate.arcScore : 0,
    candidateScore: primaryCandidate ? primaryCandidate.score : 0,
    strictPixels: primaryCandidate ? primaryCandidate.strictPixels : 0,
    box: box ? normalizeBox(box, width, height) : null
  };
}

function filterMatchBlobs(mask, strictMask, width, height) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const component = [];
  const minimumBlobPixels = getMinimumBlobPixels(width, height);
  const candidates = [];
  let matched = 0;
  let strictMatched = 0;
  let blobCount = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let largestBlobPixels = 0;

  for (let start = 0; start < total; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let stackLength = 0;
    let componentLength = 0;
    let localMinX = width;
    let localMinY = height;
    let localMaxX = 0;
    let localMaxY = 0;
    stack[stackLength] = start;
    stackLength += 1;
    visited[start] = 1;
    component.length = 0;

    while (stackLength > 0) {
      stackLength -= 1;
      const index = stack[stackLength];
      const x = index % width;
      const y = Math.floor(index / width);
      component[componentLength] = index;
      componentLength += 1;
      localMinX = Math.min(localMinX, x);
      localMinY = Math.min(localMinY, y);
      localMaxX = Math.max(localMaxX, x);
      localMaxY = Math.max(localMaxY, y);

      const left = index - 1;
      const right = index + 1;
      const up = index - width;
      const down = index + width;

      if (x > 0 && mask[left] && !visited[left]) {
        visited[left] = 1;
        stack[stackLength] = left;
        stackLength += 1;
      }

      if (x < width - 1 && mask[right] && !visited[right]) {
        visited[right] = 1;
        stack[stackLength] = right;
        stackLength += 1;
      }

      if (y > 0 && mask[up] && !visited[up]) {
        visited[up] = 1;
        stack[stackLength] = up;
        stackLength += 1;
      }

      if (y < height - 1 && mask[down] && !visited[down]) {
        visited[down] = 1;
        stack[stackLength] = down;
        stackLength += 1;
      }
    }

    const candidate = scoreBlobCandidate({
      component,
      componentLength,
      minX: localMinX,
      minY: localMinY,
      maxX: localMaxX,
      maxY: localMaxY,
      mask,
      strictMask,
      width,
      height
    });

    if (componentLength < minimumBlobPixels || !isViableBlobCandidate(candidate)) {
      for (let index = 0; index < componentLength; index += 1) {
        mask[component[index]] = 0;
      }
      continue;
    }

    candidates.push(candidate);
    blobCount += 1;
    matched += componentLength;
    strictMatched += candidate.strictPixels;
    minX = Math.min(minX, localMinX);
    minY = Math.min(minY, localMinY);
    maxX = Math.max(maxX, localMaxX);
    maxY = Math.max(maxY, localMaxY);

    if (componentLength > largestBlobPixels) {
      largestBlobPixels = componentLength;
    }
  }

  const primaryCandidate = candidates.sort((a, b) => b.score - a.score)[0] || null;

  return {
    matched,
    strictMatched,
    blobCount,
    largestBlobPixels,
    primaryCandidate,
    combinedBox: matched > 0 ? { minX, minY, maxX, maxY } : null
  };
}

function summarizeMatchMask(mask, strictMask, width, height) {
  let matched = 0;
  let strictPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    matched += 1;
    strictPixels += strictMask[index] ? 1 : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const box = matched > 0 ? { minX, minY, maxX, maxY } : null;
  const primaryCandidate = box ? {
    ...box,
    pixels: matched,
    strictPixels,
    strictRatio: matched > 0 ? strictPixels / matched : 0,
    score: matched > 0 && strictPixels > 0 ? 0.58 : 0,
    shapeScore: 0,
    arcScore: 0
  } : null;

  return {
    matched,
    strictMatched: strictPixels,
    blobCount: matched > 0 ? 1 : 0,
    largestBlobPixels: matched,
    primaryCandidate,
    combinedBox: box
  };
}

function getMinimumBlobPixels(width, height) {
  const framePixels = width * height;
  return Math.max(2, Math.min(6, Math.round(framePixels * 0.000014)));
}

function getDistantBlobPixels(width, height) {
  const framePixels = width * height;
  return Math.max(7, Math.min(24, Math.round(framePixels * 0.000075)));
}

function normalizeBox(box, width, height) {
  return {
    x: box.minX / width,
    y: box.minY / height,
    width: Math.max(box.maxX - box.minX, 1) / width,
    height: Math.max(box.maxY - box.minY, 1) / height
  };
}

function scoreBlobCandidate({
  component,
  componentLength,
  minX,
  minY,
  maxX,
  maxY,
  mask,
  strictMask,
  width,
  height
}) {
  const boxWidth = Math.max(maxX - minX + 1, 1);
  const boxHeight = Math.max(maxY - minY + 1, 1);
  const boxArea = boxWidth * boxHeight;
  const aspect = Math.min(boxWidth, boxHeight) / Math.max(boxWidth, boxHeight);
  const fillRatio = componentLength / boxArea;
  const angleBuckets = new Uint8Array(18);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  let strictPixels = 0;
  let edgePixels = 0;

  for (let item = 0; item < componentLength; item += 1) {
    const index = component[item];
    const x = index % width;
    const y = Math.floor(index / width);

    if (strictMask[index]) {
      strictPixels += 1;
    }

    const edge = (
      x === 0 ||
      y === 0 ||
      x === width - 1 ||
      y === height - 1 ||
      !mask[index - 1] ||
      !mask[index + 1] ||
      !mask[index - width] ||
      !mask[index + width]
    );

    if (edge) {
      edgePixels += 1;
      const angle = normalizeHue(Math.atan2(y - centerY, x - centerX) * 180 / Math.PI);
      const bucket = Math.min(angleBuckets.length - 1, Math.floor(angle / (360 / angleBuckets.length)));
      angleBuckets[bucket] = 1;
    }
  }

  const strictRatio = componentLength > 0 ? strictPixels / componentLength : 0;
  const bucketsHit = angleBuckets.reduce((total, value) => total + value, 0);
  const arcCoverage = bucketsHit / angleBuckets.length;
  const edgeDensity = componentLength > 0 ? edgePixels / componentLength : 0;
  const aspectScore = clamp((aspect - 0.24) / 0.76);
  const fillScore = clamp((fillRatio - 0.05) / 0.42);
  const rimScore = clamp((edgeDensity - 0.16) / 0.5);
  const shapeScore = clamp(aspectScore * 0.55 + fillScore * 0.25 + rimScore * 0.2);
  const arcScore = clamp((arcCoverage - 0.24) / 0.44) * aspectScore * clamp(fillRatio / 0.2);
  const sizeScore = clamp(componentLength / Math.max(getDistantBlobPixels(width, height), 1));
  const strictScore = clamp(strictRatio * 2.8);
  let score = clamp(
    strictScore * 0.48 +
    shapeScore * 0.22 +
    arcScore * 0.18 +
    sizeScore * 0.12
  );

  if (strictPixels === 0) {
    score *= 0.2;
  }

  if (aspect < 0.16) {
    score *= 0.62;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    pixels: componentLength,
    strictPixels,
    strictRatio,
    shapeScore,
    arcScore,
    score
  };
}

function isViableBlobCandidate(candidate) {
  if (candidate.strictPixels < 2) return false;

  if (candidate.pixels <= 8) {
    return candidate.strictRatio >= 0.3 && candidate.score >= 0.4;
  }

  return candidate.strictRatio >= 0.14 && candidate.score >= 0.44;
}

function getAdaptiveTriggerCoverage(candidate, blobCount) {
  let factor = 1;

  if (candidate && candidate.strictRatio >= 0.2) {
    factor *= 1 - clamp(candidate.score) * 0.24;

    if (candidate.arcScore > 0.48) {
      factor *= 0.94;
    }

    if (candidate.strictRatio > 0.42) {
      factor *= 0.95;
    }
  }

  if (blobCount === 1) {
    factor *= 0.94;
  } else if (blobCount > 7) {
    factor *= 1.24;
  }

  if (state.zoom > 1.2) {
    factor *= 0.97;
  }

  return Math.max(state.triggerCoverage * 0.58, state.triggerCoverage * factor);
}

function updateDetectionHistory(candidate, width, height) {
  const now = performance.now();
  const recent = state.detectionHistory.filter((item) => now - item.time < 850);

  if (!candidate) {
    state.detectionHistory = recent;
    return { frames: 0, confidence: 0 };
  }

  const entry = {
    x: ((candidate.minX + candidate.maxX) / 2) / width,
    y: ((candidate.minY + candidate.maxY) / 2) / height,
    width: Math.max(candidate.maxX - candidate.minX, 1) / width,
    height: Math.max(candidate.maxY - candidate.minY, 1) / height,
    score: candidate.score,
    time: now
  };

  const matchingFrames = recent.filter((item) => {
    const distance = Math.hypot(entry.x - item.x, entry.y - item.y);
    const sizeAllowance = Math.max(0.08, (entry.width + entry.height + item.width + item.height) * 0.55);
    return distance <= sizeAllowance;
  }).length + 1;

  state.detectionHistory = [entry, ...recent].slice(0, 8);

  return {
    frames: matchingFrames,
    confidence: matchingFrames >= 3
      ? clamp(candidate.score * clamp(candidate.strictRatio * 2.2) * (0.42 + matchingFrames * 0.14))
      : 0
  };
}

function getTargetMatchStrength(red, green, blue) {
  const hsv = rgbToHsv(red, green, blue);
  let bestMatch = 0;

  for (const target of state.activeTargets) {
    if (matchesTargetColor(hsv, target)) {
      return 1;
    }

    if (matchesTargetFamily(hsv, target)) {
      bestMatch = Math.max(bestMatch, 0.35);
    }
  }

  return bestMatch;
}

function matchesTarget(red, green, blue) {
  const hsv = rgbToHsv(red, green, blue);

  return state.activeTargets.some((target) => matchesTargetColor(hsv, target));
}

function matchesTargetColor(hsv, target) {
  if (foliageToggle.checked && isLikelyFoliage(hsv, target)) {
    return false;
  }

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

function matchesTargetFamily(hsv, target) {
  if (foliageToggle.checked && isLikelyFoliage(hsv, target)) {
    return false;
  }

  if (isNeutralTarget(target)) {
    const brightnessTolerance = 0.085 + state.hueTolerance / 320;
    const saturationCeiling = Math.max(0.27, state.minSaturation * 0.72);

    return (
      hsv.saturation <= saturationCeiling &&
      Math.abs(hsv.value - target.value) <= brightnessTolerance
    );
  }

  const fallbackHueRange = Math.min(62, state.hueTolerance * 1.28 + 8);

  return (
    hsv.saturation >= Math.max(0.16, state.minSaturation * 0.68) &&
    hsv.value >= Math.max(0.12, state.minBrightness * 0.78) &&
    hueDistance(hsv.hue, target.hue) <= fallbackHueRange
  );
}

function isLikelyFoliage(hsv, target) {
  const targetIsGreen = target.saturation > 0.24 && hueDistance(target.hue, 118) < 52;
  const pixelIsFoliage = hsv.hue >= 62 && hsv.hue <= 168 && hsv.saturation >= 0.2 && hsv.value >= 0.12;
  return pixelIsFoliage && !targetIsGreen;
}

function renderFrameByMode(data, mask, width, height) {
  if (state.viewMode === "color") return;

  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4;
    renderPixelByMode(data, offset, Boolean(mask[index]));
  }

  if (state.viewMode === "outline") {
    renderOutline(data, mask, width, height);
  }
}

function renderPixelByMode(data, offset, matchedPixel) {
  if (state.viewMode === "mask") {
    data[offset] = matchedPixel ? 255 : 0;
    data[offset + 1] = matchedPixel ? 255 : 0;
    data[offset + 2] = matchedPixel ? 255 : 0;
    return;
  }

  if (state.viewMode === "outline") {
    const grey = Math.round(data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722);
    data[offset] = Math.round(grey * 0.54);
    data[offset + 1] = Math.round(grey * 0.54);
    data[offset + 2] = Math.round(grey * 0.54);
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

function renderOutline(data, mask, width, height) {
  const { red, green, blue } = state.activeTargets[0]?.rgb || hexToRgb(colorPicker.value);

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;

    const x = index % width;
    const y = Math.floor(index / width);
    const edge = (
      x === 0 ||
      y === 0 ||
      x === width - 1 ||
      y === height - 1 ||
      !mask[index - 1] ||
      !mask[index + 1] ||
      !mask[index - width] ||
      !mask[index + width]
    );

    if (!edge) continue;

    const offset = index * 4;
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
  }
}

function renderResult(result) {
  setStatus(result.detected ? "Color detected" : "Scanning", result.detected, result.confidence);
  updateScanHud(result);

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
  hudColorSwatch.style.background = hex;
  presets.forEach((preset) => preset.classList.toggle("active", preset.dataset.color.toLowerCase() === hex.toLowerCase()));
  updateRangeHint();
  updateScanHud();
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

function updateScanHud(result = null) {
  const confidence = result ? result.confidence : 0;
  const activeCount = state.activeTargets.length;
  hudTargetText.textContent = activeCount > 1 ? `${activeCount} saved colors` : colorPicker.value.toUpperCase();
  hudConfidenceText.textContent = `${Math.round(confidence * 100)}%`;
  hudMeterFill.style.width = `${Math.round(confidence * 100)}%`;

  if (!result) {
    hudDetailText.textContent = "Scanning for selected color";
    return;
  }

  const coverage = (result.coverage * 100).toFixed(result.coverage >= 0.01 ? 1 : 2);
  const filtered = result.filteredMatched > 0 ? `, ${result.filteredMatched} specks ignored` : "";
  const blobs = result.blobCount === 1 ? "1 blob" : `${result.blobCount} blobs`;
  const farBlob = result.distantBlobDetected ? ", far blob" : "";
  const steady = result.temporalDetected ? `, steady ${result.persistenceFrames}f` : "";
  const arc = result.arcScore > 0.45 ? ", arc" : "";
  const ai = result.aiConfirmed ? `, AI ${Math.round(result.aiConfidence * 100)}%` : "";
  hudDetailText.textContent = `${coverage}% frame, ${blobs}${farBlob}${steady}${arc}${ai}${filtered}`;
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
    const colors = getDiscSearchColors(disc);
    const profileColors = getDiscProfileColors(disc);
    const visibleColors = colors.slice(0, 3);
    const extraCount = colors.length - visibleColors.length;
    const meta = profileColors.length > 0
      ? `Profile + ${colors.length} colors`
      : colors.length > 1 ? `${colors.length} colors` : colorSearchLabel(colors[0], disc.hueTolerance);
    return `
      <div class="disc-item">
        <span class="disc-swatches">
          ${visibleColors.map((color) => `<span class="disc-swatch" style="background: ${color}"></span>`).join("")}
          ${extraCount > 0 ? `<span class="disc-more">+${extraCount}</span>` : ""}
        </span>
        <span class="disc-info">
          <span class="disc-name">${escapeHtml(disc.name)}</span>
          <span class="disc-meta">${meta}</span>
        </span>
        <button class="disc-action" type="button" data-action="load" data-id="${disc.id}">Load</button>
        <button class="disc-action" type="button" data-action="edit" data-id="${disc.id}">Edit</button>
        <button class="disc-action delete" type="button" data-action="delete" data-id="${disc.id}">Delete</button>
      </div>
    `;
  }).join("");
}

function normalizeDisc(disc) {
  if (!disc || typeof disc.name !== "string") return null;

  const profile = normalizeDiscProfile(disc.profile);
  const colors = uniqueColors(getDiscColors(disc).length > 0 ? getDiscColors(disc) : getDiscProfileColors({ profile }));
  if (colors.length === 0) return null;

  return {
    id: typeof disc.id === "string" && /^[a-z0-9.-]+$/i.test(disc.id) ? disc.id : String(Date.now()),
    name: disc.name,
    colors,
    color: colors[0],
    profile,
    hueTolerance: Number.isFinite(disc.hueTolerance) ? disc.hueTolerance : 18,
    minSaturation: Number.isFinite(disc.minSaturation) ? disc.minSaturation : 0.42,
    minBrightness: Number.isFinite(disc.minBrightness) ? disc.minBrightness : 0.28,
    triggerCoverage: Number.isFinite(disc.triggerCoverage) ? disc.triggerCoverage : 0.006,
    savedAt: Number.isFinite(disc.savedAt) ? disc.savedAt : Date.now()
  };
}

function getDiscColors(disc) {
  const colors = Array.isArray(disc.colors) ? disc.colors : [disc.color];
  return colors.filter((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color));
}

function getDiscProfileColors(disc) {
  const colors = Array.isArray(disc?.profile?.colors) ? disc.profile.colors : [];
  return colors.filter((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color));
}

function getDiscSearchColors(disc) {
  const profileColors = uniqueColors(getDiscProfileColors(disc));
  const profileSet = new Set(profileColors);
  const manualColors = uniqueColors(getDiscColors(disc)).filter((color) => !profileSet.has(color));
  const chromaticProfileColors = profileColors.filter((color) => rgbToHsvFromHex(color).saturation >= 0.2);
  const neutralProfileColors = profileColors.filter((color) => rgbToHsvFromHex(color).saturation < 0.2);
  const usefulProfileColors = chromaticProfileColors.length > 0
    ? [...chromaticProfileColors, ...neutralProfileColors.slice(0, 1)]
    : neutralProfileColors.slice(0, 3);

  return uniqueColors([...usefulProfileColors, ...manualColors]).slice(0, 6);
}

function normalizeDiscProfile(profile) {
  const colors = getDiscProfileColors({ profile });
  if (colors.length === 0) return null;

  return {
    colors: uniqueColors(colors).slice(0, 6),
    capturedAt: Number.isFinite(profile?.capturedAt) ? profile.capturedAt : Date.now()
  };
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

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
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
