(() => {
  "use strict";

  const tasksVisionUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";
  const wasmRoot = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
  const modelUrl = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite";
  let detector = null;
  let initializePromise = null;
  let lastError = null;

  async function initialize() {
    if (detector) return true;
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      try {
        const { FilesetResolver, ObjectDetector } = await import(tasksVisionUrl);
        const vision = await FilesetResolver.forVisionTasks(wasmRoot);
        detector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "CPU"
          },
          categoryAllowlist: ["frisbee"],
          runningMode: "IMAGE",
          scoreThreshold: 0.2,
          maxResults: 3
        });
        lastError = null;
        return true;
      } catch (error) {
        lastError = error;
        detector = null;
        return false;
      } finally {
        initializePromise = null;
      }
    })();

    return initializePromise;
  }

  async function analyze(source) {
    if (!detector) {
      return { available: false, confidence: 0, label: null };
    }

    try {
      const result = detector.detect(source);
      const detections = Array.isArray(result?.detections) ? result.detections : [];
      let best = null;

      for (const detection of detections) {
        const category = detection.categories?.[0];
        if (!category || category.categoryName !== "frisbee") continue;

        if (!best || category.score > best.confidence) {
          best = {
            available: true,
            confidence: category.score,
            label: category.categoryName,
            box: detection.boundingBox || null
          };
        }
      }

      return best || { available: true, confidence: 0, label: null, box: null };
    } catch (error) {
      lastError = error;
      return { available: false, confidence: 0, label: null, box: null };
    }
  }

  function getStatus() {
    return {
      ready: Boolean(detector),
      loading: Boolean(initializePromise),
      error: lastError ? String(lastError.message || lastError) : null
    };
  }

  function dispose() {
    detector?.close?.();
    detector = null;
    initializePromise = null;
  }

  window.DiscFinderAI = {
    initialize,
    analyze,
    getStatus,
    dispose
  };
})();
