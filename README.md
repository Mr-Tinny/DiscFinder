# DiscFinder Web

DiscFinder Web is a no-build browser version of the disc color finder. It uses the phone camera, HSV color matching, a visual detection box, and an audio beep when the selected color crosses the trigger threshold.

The live view keeps the selected color range in color and turns everything else grayscale, which makes a target disc stand out more clearly in brush.

This project was built with help from Codex AI.

## Running on iPhone

iPhone Safari requires camera access from a secure origin. Host this folder on an HTTPS static host such as GitHub Pages, Netlify, Cloudflare Pages, or a small HTTPS server, then open the HTTPS URL on the iPhone.

The app supports both portrait and landscape orientation. In landscape, the controls move to a side drawer so the camera view stays wide.

After opening it:

1. Tap `Start Camera`.
2. Allow camera access.
3. Use `-` and `+` to zoom the camera view when you need a closer look.
4. Pick a preset, use the full color wheel, or aim the reticle at the disc and tap `Sample Center`.
5. Name the disc in `My Bag` and tap `Save Color` if you want to reuse that color later. Save the same disc name again to add another color to that disc, or tap `Edit` to add, replace, or remove saved colors.
6. Tune `Range`, `Sat`, `Light`, and `Trigger` in the field.
7. Tap `Hide controls` to slide the menu down and scan with an unobstructed camera view.

The first tap also unlocks browser audio, which is required before iPhone Safari will play the detection beep.

The audio alert changes with confidence: weak matches give one slower beep, medium matches give two beeps, and strong matches give a faster three-beep pattern.

## Local layout test

From this folder, you can run:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080` on the same computer. This is useful for layout testing. For the iPhone camera, use HTTPS.

## Tuning

- Increase `Range` when sunlight or shade shifts the apparent disc color.
- Increase `Sat` or `Light` to reject leaves, bark, shadows, and soil.
- Increase `Trigger` if small flecks cause false alerts.
- Decrease `Trigger` when the disc is mostly hidden or moderately far away. The default is now tuned lower so small coherent disc-colored blobs can still alert.
- For white or grey discs, use the white/grey presets or `Sample Center`; the app switches to neutral brightness matching instead of hue matching.
- Use camera zoom sparingly; higher zoom helps inspect brush but makes hand shake more obvious. Zoom remains available above `Show controls` when the menu is hidden.
- Use `View` to switch between grey isolation, boosted-color view, mask-only view, edge/outline view, and the unfiltered color feed.
- Keep `Blob filter` on to ignore isolated one- or two-pixel flecks while still preserving small matching patches from partially hidden or farther-away discs.
- Keep `Suppress green` on to automatically reject foliage-like greens unless you are searching for a green disc.
- When controls are hidden, the scan HUD shows the active color, confidence, frame coverage, detected blob count, and ignored speck count.
- Use `Show controls` to bring the menu back up when lighting changes or you switch discs.
- Saved discs are stored in the browser on that iPhone. Use `Load` to restore a disc's saved colors and detection settings.
