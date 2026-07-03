# BoxLens Rendering Finishes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement RGB proof rendering, realistic wood, fullscreen preview, adjustable corner radius, and hot foil preview with both mask upload and automatic detection.

**Architecture:** Keep React state in `App.tsx`, UI controls in existing sidebar/artwork components, and 3D behavior in focused helpers consumed by `Scene.tsx` and `BoxMockup.tsx`. Add pure helpers for radius conversion and foil auto-detection so the riskiest behavior is unit-tested before Three.js wiring.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Testing Library, Three.js, @react-three/fiber, @react-three/drei, Tailwind CSS, Lucide React.

---

### Task 1: Radius And Foil Helper Tests

**Files:**
- Create: `src/lib/renderSettings.ts`
- Create: `src/lib/foilDetection.ts`
- Create: `src/lib/renderSettings.test.ts`
- Create: `src/lib/foilDetection.test.ts`
- Modify: `src/types.ts`

- [x] **Step 1: Write failing tests for radius clamping and scene-unit conversion**

Add tests that expect `clampCornerRadiusMm(30, { width: 40, height: 80, depth: 20 })` to clamp to `10`, and `cornerRadiusMmToSceneUnits(3, { width: 120, height: 180, depth: 60 })` to return `0.045`.

- [x] **Step 2: Run radius tests and verify RED**

Run: `npm test -- src/lib/renderSettings.test.ts`

Expected: fail because `src/lib/renderSettings.ts` does not exist.

- [x] **Step 3: Implement radius helpers and types**

Add `cornerRadiusMm`, `rgbProof`, `FoilMode`, `FoilSettings`, and `FinishSettingsMap` types. Implement `clampCornerRadiusMm`, `getDimensionScale`, and `cornerRadiusMmToSceneUnits`.

- [x] **Step 4: Run radius tests and verify GREEN**

Run: `npm test -- src/lib/renderSettings.test.ts`

Expected: pass.

- [x] **Step 5: Write failing tests for automatic foil detection**

Add tests for saturated yellow/gold returning alpha `255`, neutral beige/gray returning `0`, and transparent pixels returning `0`.

- [x] **Step 6: Run foil tests and verify RED**

Run: `npm test -- src/lib/foilDetection.test.ts`

Expected: fail because `src/lib/foilDetection.ts` does not exist.

- [x] **Step 7: Implement foil detection helpers**

Implement pixel-level `detectFoilAlphaFromRgba` and canvas-level `createAutoFoilMaskCanvas`.

- [x] **Step 8: Run foil tests and verify GREEN**

Run: `npm test -- src/lib/foilDetection.test.ts`

Expected: pass.

### Task 2: React State And Sidebar Controls

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/ArtworkUploader.tsx`
- Modify: `src/lib/i18n.ts`

- [x] **Step 1: Write failing App tests for new settings**

Extend the mocked scene to expose `data-corner-radius`, `data-rgb-proof`, and foil mode attributes. Add tests for default RGB proof, default corner radius, corner radius updates, foil mode updates, and mask upload/remove state.

- [x] **Step 2: Run App tests and verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: fail because new controls and props do not exist.

- [x] **Step 3: Implement state, prop wiring, labels, and controls**

Add render settings defaults, finish settings defaults, object URL lifecycle for foil masks, radius controls, RGB proof toggle, foil mode control, mask upload/remove, and intensity control.

- [x] **Step 4: Run App tests and verify GREEN**

Run: `npm test -- src/App.test.tsx`

Expected: pass.

### Task 3: Three.js Rendering

**Files:**
- Modify: `src/components/Scene.tsx`
- Modify: `src/components/BoxMockup.tsx`
- Create: `src/lib/roundedFace.ts`
- Create: `src/lib/roundedFace.test.ts`
- Copy assets to: `public/textures/hardwood2_diffuse.jpg`, `public/textures/hardwood2_bump.jpg`, `public/textures/hardwood2_roughness.jpg`

- [x] **Step 1: Write failing tests for rounded face shape**

Test that zero radius creates a rectangle shape and positive radius is clamped to half the shortest edge.

- [x] **Step 2: Run rounded face tests and verify RED**

Run: `npm test -- src/lib/roundedFace.test.ts`

Expected: fail because `src/lib/roundedFace.ts` does not exist.

- [x] **Step 3: Implement rounded face helpers**

Create rounded rectangle shape helpers for use with `shapeGeometry`.

- [x] **Step 4: Run rounded face tests and verify GREEN**

Run: `npm test -- src/lib/roundedFace.test.ts`

Expected: pass.

- [x] **Step 5: Wire rounded geometry and foil overlay into BoxMockup**

Use proof material when `settings.rgbProof` is true. Use rounded face geometry for artwork, solid, placeholders, and foil overlays. Generate auto foil masks in the browser, combine with uploaded masks according to mode, and dispose textures.

- [x] **Step 6: Replace procedural wood with texture assets**

Copy hardwood assets into `public/textures` and update `WoodSurface` to load diffuse, bump, and roughness maps.

- [x] **Step 7: Add fullscreen preview button**

Add a top-right icon button in `Scene.tsx` using the Fullscreen API and accessible labels.

### Task 4: Verification And Cleanup

**Files:**
- Modify: `README.md`
- Existing scripts: `npm test`, `npm run build`, `npm run verify:browser`

- [x] **Step 1: Update README feature list**

Mention RGB proof preview, adjustable corner radius, hot foil preview, fullscreen preview, and realistic wood surfaces.

- [x] **Step 2: Run unit tests**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 3: Run production build**

Run: `npm run build`

Expected: build exits `0`.

- [x] **Step 4: Run browser verification**

Run: `npm run verify:browser`

Expected: desktop and mobile canvases are nonblank and export still downloads PNG.

- [x] **Step 5: Review diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only intended files changed.
