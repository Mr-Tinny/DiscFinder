# DiscFinder Web

DiscFinder Web is a no-build browser version of the disc color finder. It uses the phone camera, HSV color matching, a visual detection box, and an audio beep when the selected color crosses the trigger threshold.

The live view keeps the selected color range in color and turns everything else grayscale, which makes a target disc stand out more clearly in brush.

## Running on iPhone

iPhone Safari requires camera access from a secure origin. Host this folder on an HTTPS static host such as GitHub Pages, Netlify, Cloudflare Pages, or a small HTTPS server, then open the HTTPS URL on the iPhone.

After opening it:

1. Tap `Start Camera`.
2. Allow camera access.
3. Pick a preset, use the full color wheel, or aim the reticle at the disc and tap `Sample Center`.
4. Name the disc in `My Bag` and tap `Save` if you want to reuse that color later.
5. Tune `Range`, `Sat`, `Light`, and `Trigger` in the field.
6. Tap `Hide controls` to slide the menu down and scan with an unobstructed camera view.

The first tap also unlocks browser audio, which is required before iPhone Safari will play the detection beep.

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
- Decrease `Trigger` when the disc is mostly hidden.
- Turn off `Grey view` if you want to compare against the unfiltered camera feed while tuning.
- Use `Show controls` to bring the menu back up when lighting changes or you switch discs.
- Saved discs are stored in the browser on that iPhone. Use `Load` to restore a disc color and its detection settings.
