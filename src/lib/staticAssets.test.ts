import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';

describe('static assets', () => {
  it('uses the project logo as the browser favicon', () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/png" href="/favicon.png" />');
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/favicon.png" />');
  });
});
