import { describe, expect, it } from 'vitest';
import {
  clampColorChannel,
  clampPercentChannel,
  cmykToHex,
  hexToCmyk,
  hexToRgb,
  rgbToHex,
} from './colorMode';

describe('colorMode', () => {
  it('converts RGB hex values into editable RGB channels', () => {
    expect(hexToRgb('#c8e51a')).toEqual({ r: 200, g: 229, b: 26 });
    expect(rgbToHex({ r: 200, g: 229, b: 26 })).toBe('#c8e51a');
  });

  it('converts CMYK channels to the RGB hex color used by WebGL materials', () => {
    expect(cmykToHex({ c: 0, m: 100, y: 100, k: 0 })).toBe('#ff0000');
    expect(cmykToHex({ c: 100, m: 0, y: 100, k: 0 })).toBe('#00ff00');
    expect(cmykToHex({ c: 100, m: 100, y: 0, k: 0 })).toBe('#0000ff');
  });

  it('converts RGB hex values back to CMYK channels', () => {
    expect(hexToCmyk('#ffffff')).toEqual({ c: 0, m: 0, y: 0, k: 0 });
    expect(hexToCmyk('#000000')).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(hexToCmyk('#ff0000')).toEqual({ c: 0, m: 100, y: 100, k: 0 });
  });

  it('clamps user-entered color channels into valid ranges', () => {
    expect(clampColorChannel(-20)).toBe(0);
    expect(clampColorChannel(999)).toBe(255);
    expect(clampPercentChannel(-20)).toBe(0);
    expect(clampPercentChannel(999)).toBe(100);
  });
});
