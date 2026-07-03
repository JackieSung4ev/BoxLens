# BoxLens

BoxLens is a frontend-only, real-time 3D packaging mockup tool for rectangular product boxes. It runs locally in the browser with React, Three.js, Vite, and Tailwind CSS.

## Features

- Live 3D box preview with editable width, height, and depth in millimeters.
- Drag-and-drop artwork upload for each face, with folder/file auto-matching for side names such as front, back, left, right, top, and bottom.
- Per-face appearance modes: artwork or solid color.
- Solid color editing in RGB or CMYK inputs. The browser preview and exported PNG are RGB; CMYK values are converted to the closest RGB preview color.
- Side artwork rotation control, defaulting to no rotation for pre-rotated designs.
- Lighting controls for preset, intensity, direction, optional environment lighting, and environment intensity.
- Shadows are off by default, with an optional shadow toggle.
- Optional wood floor or wood table surface under the package.
- English and Chinese UI with automatic browser-language detection plus manual switching.
- PNG export of the current WebGL view.

## Getting Started

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## Scripts

```bash
npm test
npm run build
npm run verify:browser
```

`npm run verify:browser` starts from the configured local URL, checks desktop and mobile rendering, verifies the WebGL canvas is nonblank, and confirms PNG export works.

## Notes

- BoxLens is frontend-only. Uploaded artwork stays in the browser session and is not sent to a server.
- For folder uploads, name files or parent folders after the target face so BoxLens can match them automatically.
- CMYK input is intended for convenient package-design color entry, not for print-proof color management.
