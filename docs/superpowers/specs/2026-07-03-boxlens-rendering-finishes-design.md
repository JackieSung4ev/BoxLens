# BoxLens Rendering And Finishes Design

Date: 2026-07-03

## Goal

Improve BoxLens so packaging previews are closer to uploaded artwork while adding production-oriented visual controls:

- RGB proof-style artwork display with reduced 3D color shift.
- More realistic wood floor and additional material presets such as marble.
- A fullscreen button in the top-right of the 3D preview.
- Adjustable box corner radius in millimeters.
- Adjustable camera lens length for wider or more compressed product-shot perspective.
- Hot foil preview using both uploaded masks and automatic gold/yellow detection.

The feature remains a browser-side 3D preview. It is not an ICC-managed print proof or a replacement for Illustrator/press output checks.

## Current State

The app is a React, Vite, Three.js, and React Three Fiber frontend. The 3D scene is concentrated in:

- `src/components/Scene.tsx`: renderer setup, lighting, surfaces, shadows, camera controls.
- `src/components/BoxMockup.tsx`: rounded box body, face planes, uploaded artwork textures, solid color faces.
- `src/components/Sidebar.tsx`: rendering controls.
- `src/types.ts`: render settings and uploaded asset types.

Current limitations:

- The renderer uses scene lighting and tone mapping, so artwork can appear different from the browser-decoded RGB image.
- Wood surfaces use procedural canvas textures and look synthetic.
- The box radius is hardcoded in normalized scene units.
- Artwork is rendered as independent rectangular face planes, so changing only the rounded box body would leave square artwork corners.
- Finishing processes such as hot foil are not represented.

## Design

### RGB Proof Display

Add an artwork display mode that prioritizes visual closeness to uploaded RGB artwork.

Behavior:

- Uploaded artwork textures continue to use `SRGBColorSpace`.
- Artwork and solid face surfaces render with a proof-style material that avoids tone mapping and minimizes lighting-driven color shifts.
- The box body, edges, wood surfaces, shadows, and environment lighting can still use physically lit materials.
- The mode should be enabled by default because the main user problem is color shift from CMYK-origin package artwork after browser import.

Non-goal:

- The app will not parse CMYK ICC profiles from AI/PDF/JPEG. Browser-decoded pixels are treated as the RGB source of truth.

### Realistic Wood Surfaces

Replace procedural wood with texture-based wood materials copied from the MIT-licensed three.js examples:

- `hardwood2_diffuse.jpg`
- `hardwood2_bump.jpg`
- `hardwood2_roughness.jpg`

Behavior:

- Store the textures in the app public asset path so Vite can serve them.
- Use diffuse map with `SRGBColorSpace`.
- Use bump and roughness maps for table/floor surface detail.
- Keep `none` and `woodFloor`, remove the wood table preset, and add `marble` for a cleaner product-shot surface.
- Tune repeat scale separately for floor and table so the grain looks plausible at the current package scale.

### Fullscreen Preview Button

Add a DOM button in the 3D preview container top-right.

Behavior:

- Use a Lucide fullscreen icon and an accessible label.
- Toggle the preview container with the browser Fullscreen API.
- Update icon/label when fullscreen exits via browser controls.
- Keep the button outside the WebGL scene for accessibility, focus, and reliable browser behavior.

### Adjustable Corner Radius

Add `cornerRadiusMm` to `RenderSettings`.

Behavior:

- Default to a subtle radius equivalent to the current visual treatment.
- Add a sidebar range/input control in millimeters.
- Clamp radius to a safe maximum based on the smallest box dimension so geometry cannot self-intersect.
- Convert millimeters to normalized scene units using the same dimension normalization scale used by the box geometry.
- Apply the radius to the `RoundedBox`.
- Clip or shape face artwork planes so visible artwork corners match the rounded body instead of staying square.

Implementation direction:

- Prefer a helper that creates rounded-rectangle face geometry for artwork/solid/placeholder faces.
- Keep UVs compatible with existing cover texture transforms.
- Use the same rounded geometry for artwork, solid color, placeholders, and foil overlays.

### Adjustable Camera Lens Length

Add `cameraLengthMm` to `RenderSettings`.

Behavior:

- Default to 110mm for a compressed product-shot perspective.
- Add a sidebar range control from 24mm to 135mm.
- Lower values make the scene wider and more perspective-heavy.
- Higher values compress perspective for a cleaner catalog-style look.
- Apply changes through `PerspectiveCamera.setFocalLength()` without resetting the user's current orbit angle.

### Hot Foil Preview

Add a per-face finishing layer for hot foil.

Data model:

- Add a `FinishSettingsMap` keyed by artwork side.
- Each face has:
  - `foilMode`: `off`, `auto`, `mask`, or `autoMask`.
  - Optional uploaded `foilMask` asset.
  - Foil color preset, initially gold.
  - Foil intensity or opacity.

Mask semantics:

- Uploaded mask images use white or opaque pixels as foil areas.
- Black or transparent pixels are non-foil.
- Mask dimensions should align with the artwork aspect and use the same cover transform and side rotation as the artwork.

Automatic detection:

- Generate a client-side mask from the uploaded artwork image.
- Detect gold/yellow-like pixels using hue, saturation, and lightness thresholds.
- Ignore low-saturation beige/gray areas to reduce false positives.
- Recompute when artwork, side rotation, or detection threshold changes.
- Auto detection is a preview convenience and may be imperfect.

Mode behavior:

- `off`: no foil layer.
- `auto`: use only the generated mask.
- `mask`: use only the uploaded mask.
- `autoMask`: combine uploaded and generated masks, with either mask enabling foil.

3D rendering:

- Overlay a very slightly offset face mesh above the artwork.
- Use the same rounded face geometry as the artwork plane.
- Use a metallic gold material with high metalness, low roughness, environment sensitivity, and the computed mask as alpha.
- Keep the layer thin and offset enough to avoid z-fighting without looking detached.

## UI

Controls should stay in the existing sidebar and use the current compact operational style.

Additions:

- Box dimensions section:
  - Corner radius control in millimeters, using a range/input pair or compact numeric input with slider.

- Rendering section:
  - Camera lens length control in millimeters, shown as a compact slider with the current mm value.
  - Restore default settings button that resets rendering settings only, without clearing artwork or dimensions.

- Each artwork face slot:
  - Foil mode select or compact segmented control.
  - Upload/remove foil mask controls when a mask-based mode is selected.
  - Foil color/intensity controls can start as gold-only plus intensity to avoid clutter.

- Preview:
  - Fullscreen icon button in the 3D preview top-right.

Accessibility:

- Icon-only fullscreen button must have an `aria-label`.
- Mask upload/remove buttons need side-specific labels.
- Controls must remain keyboard reachable.
- Touch targets should stay at least 44px high where practical.

## Testing

Unit/component tests:

- Default settings include RGB proof display, default corner radius, and foil settings for all faces.
- Corner radius control updates render settings and clamps invalid values.
- Camera lens length control updates render settings and passes the value to the 3D scene.
- Restore default settings resets rendering controls while preserving uploaded artwork and box dimensions.
- Foil mode controls update the correct face.
- Foil mask upload creates an object URL and remove revokes it.
- Auto foil detection helper identifies saturated gold/yellow pixels and rejects neutral beige/gray pixels.
- Rounded face geometry helper returns valid positions/UVs and handles zero radius.

Build and browser verification:

- `npm test`
- `npm run build`
- Browser verification should cover:
  - Preview canvas is nonblank on desktop/mobile.
  - Fullscreen button exists and is accessible.
  - Wood surface renders with texture assets available.
  - Foil overlay appears when using auto detection or a mask.

## Risks And Constraints

- Browser-decoded RGB is the only reliable image source available client-side for uploaded files.
- Automatic foil detection can misclassify artwork; uploaded masks remain the accurate workflow.
- Rounded artwork clipping is more involved than changing the box radius alone and should be tested carefully across all six faces and side rotations.
- Metallic foil quality depends on lighting and environment maps; a studio environment may need to be enabled or simulated for the foil to read clearly.
- Large uploaded artwork and masks may affect memory use; object URLs and generated textures must be disposed/revoked.

## Acceptance Criteria

- User can adjust box corner radius in millimeters and the 3D box plus face artwork corners change together.
- User can adjust camera lens length between wide-angle and compressed product-shot perspectives.
- User can restore rendering defaults without losing uploaded artwork or edited dimensions.
- User can enable hot foil preview from auto detection, uploaded mask, or both.
- Foil areas render as metallic gold above the artwork and respond visibly to scene angle/light.
- Uploaded artwork colors in the default preview are closer to the original browser image than the current lit material path.
- Wood floor and marble surfaces look more realistic than the current procedural wood.
- The 3D preview has a working, accessible top-right fullscreen button.
- Existing upload, rotation, dimension, export, language, lighting, and surface workflows continue to work.
