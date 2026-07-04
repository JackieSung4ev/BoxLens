# BoxLens

BoxLens is a frontend-only, real-time 3D packaging mockup tool for rectangular product boxes. It runs locally in the browser with React, Three.js, Vite, Tailwind CSS, and React Three Fiber.

The app is designed for packaging designers who need quick visual mockups from flat artwork, editable box dimensions, material-like preview surfaces, lighting controls, and exportable PNG renders.

## Features

- Live 3D box preview with editable width, height, and depth in millimeters.
- Adjustable camera lens length, defaulting to 110 mm.
- Blender-style edge bevel width with 0.05 mm precision, adjustable segments, and a practical 5 mm cap.
- Drag-and-drop artwork upload for each box face.
- Folder and filename auto-matching for face names such as `front`, `back`, `left`, `right`, `top`, and `bottom`.
- Per-face display modes: artwork or solid color.
- Solid color editing with RGB and CMYK channel inputs.
- RGB proof preview mode to keep uploaded artwork closer to browser image colors in the 3D view.
- Per-face hot foil preview using automatic gold detection, uploaded mask images, or both.
- Side artwork rotation controls for pre-rotated source files.
- Background color presets plus a custom background color picker.
- Lighting controls for preset, intensity, direction, environment lighting, and environment intensity.
- Optional preview surfaces, including wood floor and marble.
- Shadows are off by default and can be enabled when needed.
- Restore default rendering settings without clearing artwork or box dimensions.
- Fullscreen preview button in the 3D canvas.
- PNG export of the current WebGL view.
- English and Chinese UI with automatic browser-language detection and manual switching.

## Supported Artwork Formats

BoxLens currently accepts PNG and JPG/JPEG files for artwork uploads.

Illustrator `.ai` files are not imported directly. For Illustrator or CMYK packaging artwork, export each panel as an RGB PNG or JPG first, then upload those exported images into BoxLens.

SVG upload is intentionally not advertised or accepted in the main artwork flow, because the current preview pipeline is tuned for raster packaging artwork.

## Requirements

- Node.js 20 or newer is recommended.
- npm, included with Node.js.
- A modern Chromium-based browser is recommended for WebGL preview and PNG export.

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/JackieSung4ev/BoxLens.git
cd BoxLens
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open the Vite URL shown in the terminal. The default command binds Vite to `127.0.0.1`.

If `npm run dev` reports that `vite` is not recognized, run `npm install` first so the local project dependencies are installed.

## Basic Workflow

1. Set the box width, height, and depth in millimeters.
2. Upload PNG/JPG artwork for the front, back, left, right, top, or bottom faces.
3. Use face filenames or folders such as `front.png`, `back-panel.jpg`, or `artwork/front/panel.png` to auto-match sides.
4. Choose artwork or solid color for each face.
5. Tune RGB proof preview, camera length, edge bevel width and segments, background, lighting, surface, and shadow settings.
6. Enable hot foil preview if the design needs metallic process simulation.
7. Rotate the 3D preview, use fullscreen when needed, then export the current view as PNG.

## Rendering Controls

- **RGB proof preview:** Keeps artwork colors closer to the uploaded browser image. This is useful when source artwork was designed in CMYK but exported as RGB for preview.
- **Camera lens length:** Changes perspective compression. Longer values look flatter and more product-photo-like.
- **Edge bevel:** Blender-style edge bevel preview with fine 0.05 mm width adjustments, capped at 5 mm. Segment count defaults to 12 for a rounded profile, while 1 gives a flat chamfer.
- **Background:** Includes multiple quick presets and a custom color input.
- **Surface:** Choose no surface, wood floor, or marble.
- **Lighting:** Select a lighting preset, intensity, and direction. Environment lighting is optional.
- **Restore default settings:** Resets rendering controls only; dimensions and uploaded artwork stay intact.

## Hot Foil Preview

Hot foil can be configured per face:

- **Off:** No foil effect.
- **Auto gold detection:** Detects gold/yellow-ish regions from the artwork preview.
- **Mask image:** Uses an uploaded mask image for foil placement.
- **Auto + mask:** Combines automatic detection with a mask.

The effect is a visual mockup aid, not a production proof.

## Scripts

Run the test suite:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

Run browser verification:

```bash
npm run dev -- --port 5177
npm run verify:browser
```

`npm run verify:browser` expects a running local app at `http://127.0.0.1:5177/` by default. You can point it at another URL with `BOXLENS_URL`.

The browser verification checks desktop and mobile rendering, verifies that the WebGL canvas is nonblank, and confirms PNG export works.

## Production Deployment

BoxLens is a static Vite frontend. Build the app with `npm run build` and deploy the generated `dist/` directory.

### Static Hosting

Any static hosting platform can serve the production build:

```bash
npm ci
npm run build
```

Upload or publish the contents of `dist/`.

### Ubuntu and Nginx

Install the required system packages:

```bash
sudo apt update
sudo apt install -y nginx git nodejs npm
```

Clone, install, and build the app:

```bash
cd /opt
sudo git clone https://github.com/JackieSung4ev/BoxLens.git boxlens
sudo chown -R $USER:$USER /opt/boxlens
cd /opt/boxlens
npm ci
npm run build
```

Publish the build output:

```bash
sudo mkdir -p /var/www/boxlens
sudo rsync -a --delete dist/ /var/www/boxlens/
```

Create `/etc/nginx/sites-available/boxlens`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/boxlens;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/boxlens /etc/nginx/sites-enabled/boxlens
sudo nginx -t
sudo systemctl reload nginx
```

For HTTPS with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

To deploy updates later:

```bash
cd /opt/boxlens
git pull
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/boxlens/
```

## Project Structure

```text
src/
  components/      React UI and Three.js scene components
  lib/             Geometry, rendering, color, texture, and i18n utilities
  App.tsx          App state and layout shell
scripts/
  verify-canvas.mjs Playwright-based browser verification
public/textures/   Preview surface texture assets
```

## Privacy

BoxLens is frontend-only. Uploaded artwork stays in the local browser session and is not sent to a server by this app.

## Limitations

- BoxLens is a browser-side visual mockup tool, not an ICC-managed print proof.
- CMYK inputs are for convenient color entry and RGB preview conversion; they do not replace Illustrator, prepress, or press checks.
- Illustrator `.ai` files should be exported to PNG/JPG before upload.
- Hot foil detection is approximate and should be treated as a preview convenience.
