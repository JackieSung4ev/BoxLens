import { describe, expect, it } from 'vitest';
import { isArtworkImageFile, matchArtworkSideByFilename } from './artworkAutoMatch';

describe('matchArtworkSideByFilename', () => {
  it('matches English side names in artwork filenames', () => {
    expect(matchArtworkSideByFilename('mukfirm-front-panel.png')).toBe('front');
    expect(matchArtworkSideByFilename('box_back.jpg')).toBe('back');
    expect(matchArtworkSideByFilename('left-side.webp')).toBe('left');
    expect(matchArtworkSideByFilename('right side design.jpeg')).toBe('right');
    expect(matchArtworkSideByFilename('top-lid.png')).toBe('top');
    expect(matchArtworkSideByFilename('bottom-base.png')).toBe('bottom');
  });

  it('matches Chinese side names in artwork filenames', () => {
    expect(matchArtworkSideByFilename('正面.png')).toBe('front');
    expect(matchArtworkSideByFilename('背面.png')).toBe('back');
    expect(matchArtworkSideByFilename('左侧.png')).toBe('left');
    expect(matchArtworkSideByFilename('右侧.png')).toBe('right');
    expect(matchArtworkSideByFilename('顶部.png')).toBe('top');
    expect(matchArtworkSideByFilename('底部.png')).toBe('bottom');
  });

  it('matches side names from parent folders when dropped artwork is organized by face', () => {
    expect(matchArtworkSideByFilename('box-art/正面/design.png')).toBe('front');
    expect(matchArtworkSideByFilename('box-art/back/panel.png')).toBe('back');
  });

  it('returns null when the filename does not identify a face', () => {
    expect(matchArtworkSideByFilename('brand-logo.png')).toBeNull();
  });

  it('only accepts png and jpeg files for artwork uploads', () => {
    expect(isArtworkImageFile({ name: 'front.png', type: 'image/png' })).toBe(true);
    expect(isArtworkImageFile({ name: 'front.jpg', type: 'image/jpeg' })).toBe(true);
    expect(isArtworkImageFile({ name: 'front.jpeg' })).toBe(true);
    expect(isArtworkImageFile({ name: 'front.ai', type: 'application/postscript' })).toBe(false);
    expect(isArtworkImageFile({ name: 'front.svg', type: 'image/svg+xml' })).toBe(false);
    expect(isArtworkImageFile({ name: 'front.webp', type: 'image/webp' })).toBe(false);
  });
});
