import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.BOXLENS_URL ?? 'http://127.0.0.1:5177/';
const artifactDir = path.resolve('artifacts');
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function launchBrowser() {
  const args = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'];
  const launchAttempts = [
    () => chromium.launch({ args, headless: true }),
    () => chromium.launch({ args, channel: 'msedge', headless: true }),
    () => chromium.launch({ args, channel: 'chrome', headless: true }),
  ];

  let lastError;
  for (const attempt of launchAttempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function readCanvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      return { ready: false, reason: 'missing canvas' };
    }

    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) {
      return { ready: false, reason: 'missing webgl context' };
    }

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const samplePoints = [
      [0.5, 0.5],
      [0.4, 0.45],
      [0.6, 0.42],
      [0.5, 0.7],
      [0.25, 0.78],
      [0.75, 0.22],
      [0.12, 0.5],
      [0.88, 0.5],
      [0.5, 0.2],
    ];
    const pixel = new Uint8Array(4);
    const colors = [];

    for (const [xRatio, yRatio] of samplePoints) {
      const x = Math.max(0, Math.min(width - 1, Math.floor(width * xRatio)));
      const y = Math.max(0, Math.min(height - 1, Math.floor(height * yRatio)));
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      colors.push(Array.from(pixel));
    }

    const uniqueColors = new Set(colors.map((color) => color.join(','))).size;
    const visibleSamples = colors.filter((color) => color[3] > 0).length;

    return {
      ready: width > 0 && height > 0 && uniqueColors > 1 && visibleSamples > 0,
      width,
      height,
      uniqueColors,
      visibleSamples,
      samples: colors,
    };
  });
}

async function readPageOverflow(page) {
  return page.evaluate(() => ({
    bodyScrollHeight: document.body.scrollHeight,
    documentScrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollYAfterScrollToBottom: (() => {
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 999999);
      const scrollYAfterScrollToBottom = window.scrollY;
      window.scrollTo(0, originalScrollY);
      return scrollYAfterScrollToBottom;
    })(),
  }));
}

async function verifyViewport(browser, viewport) {
  const page = await browser.newPage({ acceptDownloads: true, viewport });
  const browserMessages = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      browserMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    browserMessages.push(`pageerror: ${error.message}`);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'BoxLens' }).waitFor();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(900);

  const shadowCheckbox = page
    .locator('label:has-text("Shadows") input[type="checkbox"], label:has-text("阴影") input[type="checkbox"]')
    .first();
  if (await shadowCheckbox.isChecked()) {
    throw new Error(`${viewport.name} shadows were checked by default`);
  }

  const surfaceSelect = page.locator('select[aria-label="Surface"], select[aria-label="承载面"]').first();
  const defaultSurface = await surfaceSelect.inputValue();
  if (defaultSurface !== 'none') {
    throw new Error(`${viewport.name} surface defaulted to ${defaultSurface}, expected none`);
  }
  await surfaceSelect.selectOption(viewport.name === 'desktop' ? 'woodTable' : 'woodFloor');
  await page.waitForTimeout(350);

  const screenshotPath = path.join(artifactDir, `boxlens-${viewport.name}.png`);
  const overflow = await readPageOverflow(page);
  if (
    viewport.name === 'desktop' &&
    (overflow.documentScrollHeight > overflow.innerHeight + 2 || overflow.scrollYAfterScrollToBottom > 0)
  ) {
    throw new Error(
      `${viewport.name} page created document-level vertical overflow: ${JSON.stringify({
        overflow,
        screenshotPath,
      })}`,
    );
  }

  await page.screenshot({ path: screenshotPath, fullPage: viewport.name !== 'desktop' });

  const stats = await readCanvasStats(page);
  if (!stats.ready) {
    throw new Error(
      `${viewport.name} canvas did not render: ${JSON.stringify({ stats, screenshotPath, browserMessages })}`,
    );
  }

  const exportButton = page.getByRole('button', { name: /export png|导出 png/i });
  if (await exportButton.isDisabled()) {
    throw new Error(`${viewport.name} export button stayed disabled after canvas initialization`);
  }

  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();
  if (!suggestedFilename.endsWith('.png')) {
    throw new Error(`${viewport.name} export did not create a PNG download: ${suggestedFilename}`);
  }

  await page.close();

  return { viewport: viewport.name, screenshotPath, export: suggestedFilename, stats };
}

await fs.mkdir(artifactDir, { recursive: true });
const browser = await launchBrowser();

try {
  const results = [];
  for (const viewport of viewports) {
    results.push(await verifyViewport(browser, viewport));
  }
  console.log(JSON.stringify({ url, results }, null, 2));
} finally {
  await browser.close();
}
