import { describe, expect, it } from 'vitest';
import { detectLocale, translations } from './i18n';

describe('detectLocale', () => {
  it('uses Chinese when the browser language is Chinese', () => {
    expect(detectLocale(['zh-CN', 'en-US'])).toBe('zh');
  });

  it('falls back to English for non-Chinese browser languages', () => {
    expect(detectLocale(['de-DE', 'en-US'])).toBe('en');
  });

  it('uses a two-character Chinese artwork mode label', () => {
    expect(translations.zh.artworkModeShort).toBe('图稿');
  });
});
